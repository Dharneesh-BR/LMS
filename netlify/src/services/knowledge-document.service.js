import { Worker } from "node:worker_threads";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve as resolvePath } from "node:path";
import { createHash } from "node:crypto";
import { env } from "../config/env.js";

const MAX_BYTES = 10 * 1024 * 1024;
export const MAX_INDEX_BYTES = 450000;

export function assetUrl(assetId) {
  const match = /^file-([a-zA-Z0-9]+)-(pdf|txt|md)$/.exec(assetId);
  if (!match) throw new Error("Invalid Sanity document asset");
  return `https://cdn.sanity.io/files/${encodeURIComponent(env.SANITY_PROJECT_ID)}/${encodeURIComponent(env.SANITY_DATASET)}/${match[1]}.${match[2]}`;
}

export async function downloadDocument(document, fetcher = fetch) {
  const response = await fetcher(assetUrl(document.id), { redirect: "error", signal: AbortSignal.timeout(15000) });
  if (!response.ok || !response.body) throw new Error(`Unable to download document: ${document.title}`);
  if (Number(response.headers.get("content-length")) > MAX_BYTES) {
    await response.body.cancel();
    throw new Error("Document exceeds the 10 MB limit");
  }
  const reader = response.body.getReader();
  const parts = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) throw new Error("Document exceeds the 10 MB limit");
      parts.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  if (!size || size !== document.size) throw new Error("Document size changed; republish the course and retry");
  return Buffer.concat(parts, size);
}

// Isolate untrusted PDF parsing from the function, with memory/page/time limits.
export async function extractPdfPages(buffer) {
  // A literal dynamic import makes the ESM dependency visible to Netlify's
  // packager without requiring it from CommonJS or parsing PDFs in this thread.
  await import("unpdf");
  // Netlify bundles handlers as CommonJS, while local sources are ESM. Resolve
  // from the deployed handler first, with workspace roots for local dev/tests.
  const bases = [typeof __filename === "string" ? __filename : "", resolvePath(process.cwd(), "netlify/package.json"),
    resolvePath(process.cwd(), "../netlify/package.json"), resolvePath(process.cwd(), "package.json")].filter(Boolean);
  let moduleUrl;
  for (const base of bases) {
    try { moduleUrl = pathToFileURL(createRequire(base).resolve("unpdf")).href; break; } catch { /* Try the next runtime root. */ }
  }
  if (!moduleUrl) throw new Error("PDF parser dependency is missing from the function bundle");
  return new Promise((resolve, reject) => {
    const worker = new Worker(`
      const { parentPort, workerData } = require('node:worker_threads');
      (async () => {
        const { getDocumentProxy, extractText } = await import(workerData.moduleUrl);
        let pdf;
        try {
          pdf = await getDocumentProxy(new Uint8Array(workerData.bytes));
          if (pdf.numPages > 100) throw Error('PDF exceeds 100 pages; split it into smaller documents.');
          const result = await extractText(pdf, { mergePages: false });
          parentPort.postMessage({ pages: result.text });
        } finally { if (pdf) await pdf.destroy(); }
      })().catch(error => parentPort.postMessage({ error: error.message?.startsWith('PDF exceeds') ? error.message : 'PDF could not be read. Use an unencrypted searchable PDF.' }));
    `, { eval: true, workerData: { bytes: buffer, moduleUrl }, resourceLimits: { maxOldGenerationSizeMb: 128 } });
    const timeout = setTimeout(() => finish(new Error("PDF processing timed out; use a smaller document")), 20000);
    let settled = false;
    function finish(error, pages) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      void worker.terminate();
      if (error) reject(error); else resolve(pages);
    }
    worker.once("message", (result) => finish(result.error ? new Error(result.error) : null, result.pages));
    worker.once("error", () => finish(new Error("PDF processing failed; use a smaller searchable PDF")));
    worker.once("exit", () => { if (!settled) finish(new Error("PDF parser stopped unexpectedly")); });
  });
}

export async function extractDocument(document, buffer) {
  let pages;
  if (document.mimeType === "application/pdf") {
    if (!buffer.subarray(0, 1024).includes(Buffer.from("%PDF-"))) throw new Error("File is not a valid PDF");
    pages = await extractPdfPages(buffer);
  } else {
    try { pages = [new TextDecoder("utf-8", { fatal: true }).decode(buffer)]; }
    catch { throw new Error("Text documents must use UTF-8 encoding"); }
    if (pages[0].includes("\0")) throw new Error("Binary files cannot be indexed as text");
  }
  if (pages.join("").trim().length < 8) throw new Error("No searchable text found. Upload a text PDF; scanned PDFs need OCR first.");
  if (Buffer.byteLength(pages.join(""), "utf8") > MAX_INDEX_BYTES) throw new Error("Document text is too large for this pilot index; split or shorten it");
  return pages;
}

export function chunkDocument(document, pages) {
  return pages.flatMap((page, pageIndex) => {
    const text = page.replace(/\r\n?/g, "\n").trim();
    const chunks = [];
    for (let start = 0; start < text.length;) {
      const end = Math.min(start + 1600, text.length);
      const id = createHash("sha256").update(JSON.stringify([document.id, pageIndex, start])).digest("hex").slice(0, 24);
      chunks.push({ id, documentId: document.id, title: document.title, page: pageIndex + 1, start, text: text.slice(start, end) });
      if (end === text.length) break;
      start = end - 200;
    }
    return chunks;
  });
}

const stopWords = new Set(["the", "and", "for", "that", "this", "with", "what", "how", "are", "can", "you", "from", "about", "does", "explain"]);
export function searchChunks(chunks, question) {
  const tokenize = (text) => text.normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) || [];
  const terms = [...new Set(tokenize(question).filter((term) => !stopWords.has(term)))].slice(0, 16);
  if (!terms.length) return [];
  const scored = chunks.map((chunk) => {
    const words = new Set(tokenize(`${chunk.title} ${chunk.text}`));
    return { chunk, score: terms.reduce((sum, term) => sum + (words.has(term) ? 1 : 0), 0) };
  });
  return scored.filter(({ score }) => score > 0).sort((a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id))
    .slice(0, 5).map(({ chunk }) => ({ ...chunk, sourceUrl: `${assetUrl(chunk.documentId)}#page=${chunk.page}` }));
}
