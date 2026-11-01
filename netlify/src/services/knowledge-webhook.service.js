import { isValidSignature, decodeSignatureHeader } from "@sanity/webhook";
import { ApiError } from "../middleware/error.middleware.js";

export async function validateKnowledgeWebhook(event, { secret, projectId, dataset, now = Date.now() }) {
  if (!secret || secret.length < 32) throw new ApiError(503, "Knowledge webhook secret is not configured");
  if (event.httpMethod !== "POST") throw new ApiError(405, "POST required");
  const headers = Object.fromEntries(Object.entries(event.headers || {}).map(([key, value]) => [key.toLowerCase(), value]));
  const body = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString("utf8") : event.body || "";
  if (Buffer.byteLength(body) > 4096) throw new ApiError(413, "Webhook payload too large");
  const signature = headers["sanity-webhook-signature"];
  let valid = false;
  try {
    const { timestamp } = decodeSignatureHeader(signature);
    valid = Math.abs(now - timestamp) <= 900000 && await isValidSignature(body, signature, secret);
  } catch { /* Reject malformed signatures without parsing untrusted payloads. */ }
  if (!valid) throw new ApiError(401, "Invalid or expired webhook signature");
  let payload;
  try { payload = JSON.parse(body); } catch { throw new ApiError(400, "Invalid webhook JSON"); }
  if (payload.projectId !== projectId || payload.dataset !== dataset || typeof payload.courseId !== "string"
      || !/^[a-zA-Z0-9_.-]{1,128}$/.test(payload.courseId) || /^(drafts|versions)\./.test(payload.courseId)) {
    throw new ApiError(400, "Webhook must identify a published course in the configured project and dataset");
  }
  if (typeof payload.sourceChanged !== "boolean") throw new ApiError(400, "Webhook must include sourceChanged");
  return payload.sourceChanged ? payload.courseId : null;
}
