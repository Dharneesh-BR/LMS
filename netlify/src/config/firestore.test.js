import test from "node:test";
import assert from "node:assert/strict";

process.env.FIREBASE_PROJECT_ID = "demo-lms";
process.env.SANITY_PROJECT_ID = "test1234";
process.env.FIREBASE_CLIENT_EMAIL = "";
process.env.FIREBASE_PRIVATE_KEY = "";
const { getFirestore } = await import("./firestore.js");

test("a Netlify function without Admin credentials fails explicitly before attempting default credentials", (t) => {
  const saved = { ...process.env };
  t.after(() => { process.env = saved; });
  process.env.AWS_LAMBDA_FUNCTION_NAME = "netlify-api";
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  delete process.env.FIRESTORE_EMULATOR_HOST;
  assert.throws(getFirestore, { code: "FIREBASE_ADMIN_CREDENTIALS_MISSING" });
});
