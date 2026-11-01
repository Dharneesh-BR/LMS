import test from "node:test";
import assert from "node:assert/strict";
import { encodeSignatureHeader } from "@sanity/webhook";
import { validateKnowledgeWebhook } from "./knowledge-webhook.service.js";

const options = { secret: "test-secret-with-at-least-32-characters", projectId: "project", dataset: "production", now: Date.now() };
const payload = { projectId: "project", dataset: "production", courseId: "course", sourceChanged: true };
async function event(value = payload, time = options.now) {
  const body = JSON.stringify(value);
  return { httpMethod: "POST", body, headers: { "sanity-webhook-signature": await encodeSignatureHeader(body, time, options.secret) } };
}

test("signed webhooks accept valid published-course events and ignore status-only updates", async () => {
  assert.equal(await validateKnowledgeWebhook(await event(), options), "course");
  assert.equal(await validateKnowledgeWebhook(await event({ ...payload, sourceChanged: false }), options), null);
});

test("webhook verification rejects tampering, replay, draft IDs, and foreign projects", async () => {
  const tampered = await event();
  tampered.body += " ";
  await assert.rejects(validateKnowledgeWebhook(tampered, options), (error) => error.statusCode === 401);
  await assert.rejects(validateKnowledgeWebhook(await event(payload, options.now - 1000000), options), (error) => error.statusCode === 401);
  for (const invalid of [{ ...payload, courseId: "drafts.course" }, { ...payload, projectId: "other" }, { ...payload, dataset: "other" }]) {
    await assert.rejects(validateKnowledgeWebhook(await event(invalid), options), (error) => error.statusCode === 400);
  }
  await assert.rejects(validateKnowledgeWebhook(await event(), { ...options, secret: "" }), (error) => error.statusCode === 503);
});
