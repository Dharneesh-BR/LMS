import { createHash } from "node:crypto";
import { sanityClient } from "../config/sanity.js";
import { ApiError } from "../middleware/error.middleware.js";
import { assertCourseAudience } from "./course.service.js";
import { knowledgeIndex } from "../repositories/knowledge-index.repository.js";
import { searchChunks } from "./knowledge-document.service.js";
import { isCourseChatConfigured } from "./openrouter.service.js";

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const allowedTypes = {
  pdf: new Set(["application/pdf"]),
  txt: new Set(["text/plain"]),
  md: new Set(["text/markdown", "text/plain", "application/octet-stream"])
};

// Keep knowledge documents out of public course projections and exclude drafts.
const knowledgeQuery = `*[_type == "course" && !(_id in path("drafts.**")) && !(_id in path("versions.**")) && (_id == $id || slug.current == $id)][0] {
  _id, _rev, title, targetDepartments, targetDesignations,
  chatbot {
    enabled,
    reindexRequestedAt,
    documents[]{title, "asset": file.asset->{_id, extension, mimeType, size}}
  }
}`;

export function buildKnowledgeManifest(course) {
  const enabled = course.chatbot?.enabled === true;
  const base = { courseId: course._id, courseTitle: course.title || "Course", enabled, status: "disabled", revision: null, documentCount: 0, documents: [] };
  if (!enabled) return base;
  const sources = course.chatbot.documents || [];
  if (!Array.isArray(sources) || sources.length > 10) throw new ApiError(422, "A course can have at most 10 chatbot documents");
  if (!sources.length) return { ...base, status: "needs_documents" };
  const seen = new Set();
  const documents = sources.map((source) => {
    const { title, asset } = source || {};
    const cleanTitle = typeof title === "string" ? title.trim() : "";
    if (!cleanTitle || cleanTitle.length > 160) throw new ApiError(422, "Each chatbot document needs a title of 1 to 160 characters");
    if (!asset?._id || !/^file-[a-zA-Z0-9]+-(pdf|txt|md)$/.test(asset._id)
        || !asset._id.endsWith(`-${asset.extension}`) || !allowedTypes[asset.extension]?.has(asset.mimeType)) {
      throw new ApiError(422, `Unsupported or missing file for chatbot document: ${cleanTitle}`);
    }
    if (!Number.isSafeInteger(asset.size) || asset.size <= 0 || asset.size > MAX_DOCUMENT_BYTES) {
      throw new ApiError(422, `Chatbot document must be between 1 byte and 10 MB: ${cleanTitle}`);
    }
    if (seen.has(asset._id)) throw new ApiError(422, "Remove duplicate chatbot documents");
    seen.add(asset._id);
    return { id: asset._id, title: cleanTitle, mimeType: asset.mimeType, size: asset.size };
  });
  const revision = createHash("sha256").update(JSON.stringify({ indexVersion: 1, courseId: course._id, documents, reindexRequestedAt: course.chatbot.reindexRequestedAt || null })).digest("hex");
  // Valid uploads are not yet indexed; do not report readiness prematurely.
  return { ...base, status: "awaiting_index", revision, documentCount: documents.length, documents };
}

export async function fetchPublishedKnowledgeCourse(courseId) {
  if (typeof courseId !== "string" || !/^[a-zA-Z0-9_.-]{1,128}$/.test(courseId) || /^(drafts|versions)\./.test(courseId)) {
    throw new ApiError(400, "Invalid published course ID");
  }
  return sanityClient.fetch(knowledgeQuery, { id: courseId }, { useCdn: false, timeout: 15000 });
}

async function authorizedCourse(courseId, user) {
  const course = await fetchPublishedKnowledgeCourse(courseId);
  if (!course) throw new ApiError(404, "Course not found");
  if (user?.role !== "ADMIN") assertCourseAudience(course, user);
  return course;
}

export async function getCourseKnowledgeStatus(courseId, user) {
  const manifest = { ...buildKnowledgeManifest(await authorizedCourse(courseId, user)), chatConfigured: isCourseChatConfigured() };
  if (manifest.status !== "awaiting_index") return manifest;
  const index = await knowledgeIndex.read(manifest.courseId);
  if (!index || index.revision !== manifest.revision) return manifest;
  const expired = index.status === "processing" && index.leaseUntil < Date.now();
  return { ...manifest, status: expired ? "failed" : index.status, chunkCount: index.chunks?.length || 0,
    updatedAt: index.updatedAt, error: expired ? "Processing timed out. Republish the course to retry." : index.error || null };
}

export async function searchCourseKnowledge(courseId, user, question) {
  if (typeof question !== "string" || question.trim().length < 2 || question.length > 500) throw new ApiError(400, "Search question must contain 2 to 500 characters");
  const manifest = buildKnowledgeManifest(await authorizedCourse(courseId, user));
  if (manifest.status !== "awaiting_index") throw new ApiError(409, "Course document search is not enabled or has no documents");
  await knowledgeIndex.reserveSearch(user.id);
  const index = await knowledgeIndex.read(manifest.courseId);
  if (!index || index.revision !== manifest.revision || index.status !== "ready") throw new ApiError(409, "Course documents are not ready for search. Check processing status.");
  return { courseId: manifest.courseId, revision: manifest.revision, matches: searchChunks(index.chunks, question), searchType: "keyword" };
}
