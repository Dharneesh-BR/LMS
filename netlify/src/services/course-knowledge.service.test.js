import test from "node:test";
import assert from "node:assert/strict";

process.env.FIREBASE_PROJECT_ID = "demo-lms";
process.env.SANITY_PROJECT_ID = "test1234";
const { buildKnowledgeManifest } = await import("./course-knowledge.service.js");

const document = () => ({ title: "Course Handbook", asset: { _id: "file-abc123-pdf", extension: "pdf", mimeType: "application/pdf", size: 1024 } });
const course = (documents = [document()]) => ({ _id: "course", chatbot: { enabled: true, documents } });

test("chatbot defaults to disabled and empty courses never claim to be ready", () => {
  assert.equal(buildKnowledgeManifest({ _id: "course" }).status, "disabled");
  assert.equal(buildKnowledgeManifest(course([])).status, "needs_documents");
});

test("valid course files produce a stable course-scoped manifest without download URLs", () => {
  const source = course();
  source.chatbot.documents[0].asset.url = "https://example.com/private";
  const manifest = buildKnowledgeManifest(source);
  assert.equal(manifest.status, "awaiting_index");
  assert.equal(manifest.documentCount, 1);
  assert.equal(manifest.documents[0].title, "Course Handbook");
  assert.equal("url" in manifest.documents[0], false);
  assert.equal(buildKnowledgeManifest(source).revision, manifest.revision);
  assert.notEqual(buildKnowledgeManifest({ ...source, _id: "other-course" }).revision, manifest.revision);
});

test("replacing, removing, or renaming documents invalidates the knowledge revision", () => {
  const source = course([document(), { title: "FAQ", asset: { _id: "file-def456-txt", extension: "txt", mimeType: "text/plain", size: 42 } }]);
  const revision = buildKnowledgeManifest(source).revision;
  source.chatbot.documents[0].title = "Revised Handbook";
  assert.notEqual(buildKnowledgeManifest(source).revision, revision);
  source.chatbot.documents[0] = document();
  source.chatbot.documents[0].asset._id = "file-replacement-pdf";
  assert.notEqual(buildKnowledgeManifest(source).revision, revision);
  assert.notEqual(buildKnowledgeManifest(course([document()])).revision, revision);
});

test("unsupported, duplicate, missing, oversized, and excessive documents are rejected", () => {
  const invalid = [
    [null],
    [{ title: "Missing file" }],
    [{ ...document(), asset: { ...document().asset, mimeType: "text/html" } }],
    [{ ...document(), asset: { ...document().asset, size: 10 * 1024 * 1024 + 1 } }],
    [{ ...document(), asset: { ...document().asset, size: 0 } }],
    [document(), document()],
    Array.from({ length: 11 }, document),
    [{ ...document(), title: " " }]
  ];
  for (const documents of invalid) assert.throws(() => buildKnowledgeManifest(course(documents)), (error) => error.statusCode === 422);
});
