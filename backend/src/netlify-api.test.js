import test from "node:test";
import assert from "node:assert/strict";

process.env.FIREBASE_PROJECT_ID = "demo-lms";
process.env.SANITY_PROJECT_ID = "test1234";
const { handler, normalizeFunctionPath } = await import("../netlify/functions/api.mjs");

function event(path, httpMethod = "GET") {
  return { path, httpMethod, headers: {}, body: null, queryStringParameters: null, requestContext: { identity: { sourceIp: "127.0.0.1" } } };
}

test("Netlify health routing works for original and function-prefixed paths", async () => {
  for (const path of ["/health", "/.netlify/functions/api/health"]) {
    const response = await handler(event(path), {});
    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(response.body), { ok: true });
  }
});

test("protected routes require authentication through the Netlify adapter", async () => {
  for (const path of ["/api/auth/verify", "/.netlify/functions/api/auth/verify"]) {
    const response = await handler(event(path, "POST"), {});
    assert.equal(response.statusCode, 401);
    assert.equal(JSON.parse(response.body).error, "Missing authorization token");
  }
});

test("function routing preserves API endpoints", () => {
  assert.equal(normalizeFunctionPath("/.netlify/functions/api/progress/update"), "/api/progress/update");
  assert.equal(normalizeFunctionPath("/api/progress/update"), "/api/progress/update");
});
