import test from "node:test";
import assert from "node:assert/strict";
import { errorHandler } from "../middleware/error.middleware.js";

test("Firebase failures return actionable codes without exposing the original server error", (t) => {
  t.mock.method(console, "error", () => {});
  for (const [error, expectedCode] of [
    [{ code: "FIREBASE_ADMIN_CREDENTIALS_MISSING" }, "FIREBASE_ADMIN_CREDENTIALS_MISSING"],
    [{ code: "app/invalid-credential", message: "private implementation detail" }, "FIREBASE_ADMIN_CONFIGURATION_ERROR"],
    [{ message: "Could not load the default credentials: private implementation detail" }, "FIREBASE_ADMIN_CONFIGURATION_ERROR"],
    [{ code: 7, message: "private implementation detail" }, "FIRESTORE_PERMISSION_DENIED"],
    [{ code: 16, message: "private implementation detail" }, "FIRESTORE_UNAUTHENTICATED"],
    [{ code: 5, message: "private implementation detail" }, "FIRESTORE_RESOURCE_NOT_FOUND"],
    [{ code: 8, message: "private implementation detail" }, "FIRESTORE_QUOTA_EXCEEDED"],
    [{ code: 14, message: "private implementation detail" }, "FIRESTORE_UNAVAILABLE"]
  ]) {
    let status, body;
    const response = { status(value) { status = value; return this; }, json(value) { body = value; } };
    errorHandler(error, {}, response, () => {});
    assert.equal(status, 503);
    assert.equal(body.code, expectedCode);
    assert.ok(!JSON.stringify(body).includes("private implementation detail"));
  }
});

test("unknown server failures remain private and validation errors keep their status", (t) => {
  t.mock.method(console, "error", () => {});
  let status, body;
  const response = { status(value) { status = value; return this; }, json(value) { body = value; } };
  errorHandler(new Error("secret detail"), {}, response, () => {});
  assert.equal(status, 500);
  assert.deepEqual(body, { error: "Internal server error" });
  errorHandler({ statusCode: 403, message: "Admin access required" }, {}, response, () => {});
  assert.equal(status, 403);
  assert.deepEqual(body, { error: "Admin access required" });
});
