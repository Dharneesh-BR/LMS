import { env } from "../src/config/env.js";
import { validateKnowledgeWebhook } from "../src/services/knowledge-webhook.service.js";
import { processCourseKnowledge } from "../src/services/knowledge-indexing.service.js";

export async function handler(event) {
  let courseId;
  try {
    courseId = await validateKnowledgeWebhook(event, { secret: env.SANITY_KNOWLEDGE_WEBHOOK_SECRET,
      projectId: env.SANITY_PROJECT_ID, dataset: env.SANITY_DATASET });
  } catch (error) {
    console.warn("Knowledge webhook rejected", { status: error.statusCode || 400 });
    return { statusCode: error.statusCode || 400, body: "Webhook rejected" };
  }
  if (!courseId) return { statusCode: 200, body: "No source changes" };
  try { await processCourseKnowledge(courseId); }
  catch (error) {
    console.error("Knowledge indexing failed", { courseId });
    throw error; // Allow Netlify's background retry policy to retry transient failures.
  }
  return { statusCode: 200, body: "Processed" };
}
