// Smoke-test the actual CommonJS artifact and its external ESM PDF dependency.
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const PDFDocument = require("pdfkit");

async function main() {
  const entry = path.resolve(process.argv[2] || "");
  if (!process.argv[2] || !fs.statSync(entry).isFile()) throw new Error("Pass the extracted background function .js path");
  const root = path.dirname(entry);
  const nested = path.join(root, "functions", path.basename(entry));
  const filename = fs.existsSync(nested) ? nested : entry;
  const localRequire = createRequire(filename);
  const dependency = localRequire.resolve("unpdf");
  if (!dependency.startsWith(`${root}${path.sep}`)) throw new Error("unpdf is not packaged alongside the function");
  process.env.FIREBASE_PROJECT_ID = "demo-bundle";
  process.env.SANITY_PROJECT_ID = "test1234";
  process.env.FIREBASE_CLIENT_EMAIL = "";
  process.env.FIREBASE_PRIVATE_KEY = "";
  const code = fs.readFileSync(filename, "utf8");
  const compiled = new Function("require", "module", "exports", "__filename", "__dirname", `${code}\nreturn extractPdfPages;`);
  const module = { exports: {} };
  const parse = compiled(localRequire, module, module.exports, filename, path.dirname(filename));
  const doc = new PDFDocument();
  const parts = [];
  doc.on("data", (part) => parts.push(part));
  const buffer = new Promise((resolve) => doc.on("end", () => resolve(Buffer.concat(parts))));
  doc.text("Packaged course document extraction works.");
  doc.end();
  const pages = await parse(await buffer);
  if (!pages[0]?.includes("Packaged course document")) throw new Error("Packaged parser did not extract the PDF text");
  console.log("Packaged CommonJS function + external ESM PDF worker: passed");
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
