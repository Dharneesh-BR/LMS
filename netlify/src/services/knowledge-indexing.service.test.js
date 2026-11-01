import test from "node:test";
import assert from "node:assert/strict";
import PDFDocument from "pdfkit";
import { memoryFirestore } from "../../test-support/memory-firestore.js";

process.env.FIREBASE_PROJECT_ID = "demo-lms";
process.env.SANITY_PROJECT_ID = "test1234";
const { createKnowledgeIndexRepository } = await import("../repositories/knowledge-index.repository.js");
const { createKnowledgePipeline } = await import("./knowledge-indexing.service.js");
const { assetUrl, downloadDocument, extractDocument, chunkDocument, searchChunks } = await import("./knowledge-document.service.js");

function source() {
  return { _id: "course", chatbot: { enabled: true, documents: [{ title: "Sales Handbook", asset: {
    _id: "file-abc123-txt", extension: "txt", mimeType: "text/plain", size: 32
  } }] } };
}
function setup() {
  const firestore = memoryFirestore();
  const store = createKnowledgeIndexRepository(() => firestore);
  let course = source();
  let reads = 0;
  const mirror = [];
  const process = createKnowledgePipeline({ store, fetchCourse: async () => structuredClone(course),
    readDocument: async () => { reads++; return ["Territory planning aligns distributor coverage with sales demand."]; },
    mirror: async (_id, state) => mirror.push(state.status) });
  return { store, process, mirror, get reads() { return reads; }, set course(value) { course = value; }, get course() { return course; } };
}

test("indexing is idempotent, searchable, and does not copy full files into source citations", async () => {
  const fixture = setup();
  assert.equal((await fixture.process("course")).status, "ready");
  const index = await fixture.store.read("course");
  const matches = searchChunks(index.chunks, "Explain distributor coverage");
  assert.equal(matches.length, 1);
  assert.equal(matches[0].title, "Sales Handbook");
  assert.equal(matches[0].page, 1);
  assert.equal(matches[0].sourceUrl, `${assetUrl("file-abc123-txt")}#page=1`);
  assert.equal((await fixture.process("course")).status, "unchanged");
  assert.equal(fixture.reads, 1);
  assert.deepEqual(fixture.mirror, ["processing", "ready"]);
  assert.deepEqual(searchChunks(index.chunks, "unrelated astronomy"), []);
});

test("removing, disabling, or deleting content makes previous chunks unavailable", async () => {
  const fixture = setup();
  await fixture.process("course");
  fixture.course.chatbot.documents = [];
  assert.equal((await fixture.process("course")).status, "needs_documents");
  assert.deepEqual((await fixture.store.read("course")).chunks, []);
  fixture.course.chatbot.enabled = false;
  assert.equal((await fixture.process("course")).status, "disabled");
  fixture.course = null;
  assert.equal((await fixture.process("course")).status, "disabled");
});

test("stale jobs cannot replace the ready index for a newer course revision", async () => {
  const fixture = setup();
  let release;
  let started;
  const didStart = new Promise((resolve) => { started = resolve; });
  const old = createKnowledgePipeline({ store: fixture.store, fetchCourse: async () => structuredClone(fixture.course),
    mirror: async () => {}, readDocument: () => { started(); return new Promise((resolve) => { release = resolve; }); } });
  const pending = old("course");
  await didStart;
  fixture.course.chatbot.documents[0].asset._id = "file-updated-txt";
  await fixture.process("course");
  const revision = (await fixture.store.read("course")).revision;
  release(["Outdated material that must not become searchable."]);
  assert.equal((await pending).status, "superseded");
  assert.equal((await fixture.store.read("course")).revision, revision);
  assert.equal((await fixture.store.read("course")).status, "ready");
});

test("failed extraction clears active content and exposes a safe actionable error", async () => {
  const fixture = setup();
  const fail = createKnowledgePipeline({ store: fixture.store, fetchCourse: async () => fixture.course,
    mirror: async () => {}, readDocument: async () => { throw new Error("No searchable text found. Scanned PDFs need OCR first."); } });
  await assert.rejects(fail("course"), /No searchable/);
  const state = await fixture.store.read("course");
  assert.equal(state.status, "failed");
  assert.deepEqual(state.chunks, []);
  assert.ok(state.error.includes("OCR"));
});

test("job leases and atomic search quotas prevent duplicate work and quota races", async () => {
  const fixture = setup();
  const first = await fixture.store.claim("course", "revision");
  await assert.rejects(fixture.store.claim("course", "revision"), /already processing/);
  await fixture.store.claim("course", "new-revision");
  assert.equal(await fixture.store.finish("course", first, "revision", { status: "ready", chunks: [] }), false);
  const reservations = await Promise.allSettled([fixture.store.reserveSearch("user", 1), fixture.store.reserveSearch("user", 1)]);
  assert.equal(reservations.filter((entry) => entry.status === "fulfilled").length, 1);
  assert.equal(reservations.find((entry) => entry.status === "rejected").reason.statusCode, 429);
});

test("downloads construct trusted asset URLs and reject oversized and changed files", async () => {
  assert.throws(() => assetUrl("https://attacker.invalid/file.pdf"));
  const bytes = Buffer.from("Course information and frequently asked questions.");
  const document = { id: "file-abc123-txt", title: "FAQ", size: bytes.length };
  const downloaded = await downloadDocument(document, async (url, options) => {
    assert.equal(url, assetUrl(document.id));
    assert.equal(options.redirect, "error");
    return new Response(bytes);
  });
  assert.deepEqual(downloaded, bytes);
  await assert.rejects(downloadDocument(document, async () => new Response(bytes, { headers: { "content-length": String(11 * 1024 * 1024) } })), /10 MB/);
  await assert.rejects(downloadDocument({ ...document, size: 1 }, async () => new Response(bytes)), /size changed/);
});

test("UTF-8 extraction and chunking preserve page references and reject binary input", async () => {
  const document = { id: "file-abc123-txt", title: "Guide", mimeType: "text/plain" };
  assert.deepEqual(await extractDocument(document, Buffer.from("Helpful course material.")), ["Helpful course material."]);
  await assert.rejects(extractDocument(document, Buffer.from([0xff, 0xfe, 0x00])), /UTF-8/);
  await assert.rejects(extractDocument(document, Buffer.from("Binary\0content")), /Binary/);
  const chunks = chunkDocument(document, ["A".repeat(2000), "Second page course material"]);
  assert.equal(chunks.length, 3);
  assert.equal(chunks[1].start, 1400);
  assert.equal(chunks[2].page, 2);
});

async function pdf(text) {
  const doc = new PDFDocument();
  const parts = [];
  doc.on("data", (part) => parts.push(part));
  const done = new Promise((resolve) => doc.on("end", () => resolve(Buffer.concat(parts))));
  if (text) doc.text(text);
  else doc.rect(10, 10, 50, 50).stroke();
  doc.end();
  return done;
}

test("the installed PDF parser extracts real PDFs and rejects image-only PDFs without OCR", async () => {
  const document = { mimeType: "application/pdf" };
  const pages = await extractDocument(document, await pdf("Distributor coverage and inventory planning course handbook."));
  assert.ok(pages[0].includes("inventory planning"));
  await assert.rejects(extractDocument(document, await pdf(null)), /No searchable text/);
  await assert.rejects(extractDocument(document, Buffer.from("not a pdf")), /valid PDF/);
});
