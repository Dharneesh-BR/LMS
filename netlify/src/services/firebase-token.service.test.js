import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";

process.env.FIREBASE_PROJECT_ID = "demo-token-test";
process.env.SANITY_PROJECT_ID = "test1234";
const { verifyFirebaseIdToken } = await import("./firebase-token.service.js");
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const now = Math.floor(Date.now() / 1000);
function token(overrides = {}) {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: "test" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    aud: "demo-token-test", iss: "https://securetoken.google.com/demo-token-test",
    sub: "verified-user", iat: now - 10, exp: now + 3600, ...overrides
  })).toString("base64url");
  const input = `${header}.${payload}`;
  return `${input}.${sign("RSA-SHA256", Buffer.from(input), privateKey).toString("base64url")}`;
}

test("public token verification requires numeric timestamps and uses the signed subject as UID", async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true, headers: new Headers({ "cache-control": "max-age=3600" }),
    json: async () => ({ test: publicKey.export({ type: "spki", format: "pem" }) })
  });
  t.after(() => { globalThis.fetch = originalFetch; });
  assert.equal((await verifyFirebaseIdToken(token({ user_id: "other-user" }))).uid, "verified-user");
  for (const invalid of [{ exp: undefined }, { exp: String(now + 3600) }, { iat: undefined }, { iat: "0" }, { iat: now + 400 }, { exp: now - 1 }, { sub: "x".repeat(129) }]) {
    await assert.rejects(verifyFirebaseIdToken(token(invalid)));
  }
});
