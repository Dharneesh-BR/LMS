import { buildKnowledgeManifest, fetchPublishedKnowledgeCourse } from "./course-knowledge.service.js";
import { downloadDocument, extractDocument, chunkDocument, MAX_INDEX_BYTES } from "./knowledge-document.service.js";
import { knowledgeIndex } from "../repositories/knowledge-index.repository.js";
import { sanityClient } from "../config/sanity.js";
import { env } from "../config/env.js";

async function mirrorStatus(courseId, result) {
  if (!env.SANITY_WRITE_TOKEN) return;
  try {
    await sanityClient.withConfig({ token: env.SANITY_WRITE_TOKEN, useCdn: false, timeout: 10000 }).patch(courseId)
      .set({ "chatbot.processing": { status: result.status, revision: result.revision || null, updatedAt: new Date().toISOString(), error: result.error || null } }).commit();
  } catch { console.warn("Unable to mirror knowledge processing status to Sanity", { courseId }); }
}

export function createKnowledgePipeline({ fetchCourse = fetchPublishedKnowledgeCourse, store = knowledgeIndex,
  readDocument = async (document) => extractDocument(document, await downloadDocument(document)),
  mirror = mirrorStatus, now = Date.now } = {}) {
  return async function processCourse(courseId) {
    const course = await fetchCourse(courseId);
    if (!course) { await store.invalidate(courseId, "disabled"); return { status: "disabled" }; }
    let manifest;
    try { manifest = buildKnowledgeManifest(course); }
    catch (error) {
      if (await store.invalidate(course._id, "failed", error.message)) await mirror(course._id, { status: "failed", error: error.message });
      return { status: "failed" };
    }
    if (manifest.status !== "awaiting_index") {
      if (await store.invalidate(course._id, manifest.status)) await mirror(course._id, { status: manifest.status });
      return { status: manifest.status };
    }
    const jobId = await store.claim(course._id, manifest.revision);
    if (!jobId) return { status: "unchanged" };
    await mirror(course._id, { status: "processing", revision: manifest.revision });
    const startedAt = now();
    try {
      const chunks = [];
      for (const document of manifest.documents) {
        if (now() - startedAt > 120000) throw new Error("Course processing exceeded two minutes. Split the documents and retry.");
        chunks.push(...chunkDocument(document, await readDocument(document)));
        if (chunks.length > 250 || Buffer.byteLength(JSON.stringify(chunks), "utf8") > MAX_INDEX_BYTES) {
          throw new Error("Course exceeds the pilot index limit. Reduce documents or split this course.");
        }
      }
      // Never activate an index after the source was removed, disabled, or changed.
      const current = await fetchCourse(course._id);
      if (!current || buildKnowledgeManifest(current).revision !== manifest.revision) {
        return { status: "superseded" };
      }
      const result = { status: "ready", chunks, error: null };
      if (!await store.finish(course._id, jobId, manifest.revision, result)) return { status: "superseded" };
      await mirror(course._id, { status: "ready", revision: manifest.revision });
      return { status: "ready", chunkCount: chunks.length };
    } catch (error) {
      const safeMessage = /^(No searchable|PDF |File is not|Text documents|Binary files|Document |Course |Unable to download)/.test(error.message)
        ? error.message.slice(0, 240) : "Document processing failed. Use smaller searchable PDF or UTF-8 text files and republish.";
      if (await store.finish(course._id, jobId, manifest.revision, { status: "failed", chunks: [], error: safeMessage })) {
        await mirror(course._id, { status: "failed", revision: manifest.revision, error: safeMessage });
      }
      throw error;
    }
  };
}

export const processCourseKnowledge = createKnowledgePipeline();
