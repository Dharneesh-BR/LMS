import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { deleteApp } from "firebase-admin/app";

// Exercise the installed SDK without making any authenticated network requests.
const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
process.env.FIREBASE_PROJECT_ID = "demo-lms";
process.env.SANITY_PROJECT_ID = "test1234";
process.env.FIREBASE_CLIENT_EMAIL = "test-admin@demo-lms.iam.gserviceaccount.com";
process.env.FIREBASE_PRIVATE_KEY = privateKey.export({ type: "pkcs8", format: "pem" }).replace(/\n/g, "\\n");
const { getFirebaseApp, getFirebaseAuth, hasUsableFirebaseServiceAccount } = await import("./firebase.js");
const { getFirestore } = await import("./firestore.js");

test("the installed Admin SDK initializes Auth and Firestore using modular APIs", async (t) => {
  assert.equal(hasUsableFirebaseServiceAccount(), true);
  const app = getFirebaseApp();
  t.after(() => deleteApp(app));
  assert.equal(app.options.projectId, "demo-lms");
  assert.equal(getFirebaseApp(), app);
  const auth = getFirebaseAuth();
  assert.equal(typeof auth.verifyIdToken, "function");
  assert.equal(typeof auth.getUserByEmail, "function");
  const database = getFirestore();
  assert.equal(database.collection("users").doc("test-user").path, "users/test-user");
  assert.equal(getFirestore(), database);
});
