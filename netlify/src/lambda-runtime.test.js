import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("the function cold-starts with require(esm) disabled as in Lambda", () => {
  const result = spawnSync(process.execPath, [
    "--no-experimental-require-module", "--input-type=module", "-e",
    `const { handler } = await import('./functions/api.mjs');
     const event = { path: '/health', httpMethod: 'GET', headers: {}, body: null,
       requestContext: { identity: { sourceIp: '127.0.0.1' } } };
     const response = await handler(event, {});
     if (response.statusCode !== 200 || JSON.parse(response.body).ok !== true) {
       throw new Error('Function health check failed');
     }
     console.log('lambda-cold-start-ok');`
  ], {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env: {
      ...process.env,
      FIREBASE_PROJECT_ID: "demo-lms",
      FIREBASE_CLIENT_EMAIL: "",
      FIREBASE_PRIVATE_KEY: "",
      SANITY_PROJECT_ID: "test1234"
    },
    encoding: "utf8",
    timeout: 20000,
    windowsHide: true
  });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  assert.ok(result.stdout.includes("lambda-cold-start-ok"));
});
