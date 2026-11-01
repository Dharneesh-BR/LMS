import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { createFirestoreRepository } from "./repositories/firestore.repository.js";
import { memoryFirestore } from "../test-support/memory-firestore.js";

process.env.FIREBASE_PROJECT_ID = "demo-lms";
process.env.FIREBASE_CLIENT_EMAIL = "";
process.env.FIREBASE_PRIVATE_KEY = "";
process.env.SANITY_PROJECT_ID = "test1234";

const { db } = await import("./config/database.js");
const { sanityClient } = await import("./config/sanity.js");
const { handler } = await import("../functions/api.mjs");

test("authenticated function creates UID profiles, saves progress, unlocks next lessons, and isolates learners", async (t) => {
  const original = { ...db };
  const firestore = memoryFirestore();
  Object.assign(db, createFirestoreRepository(() => firestore));
  t.after(() => Object.assign(db, original));
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  t.mock.method(globalThis, "fetch", async (url) => {
    assert.equal(String(url), "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com");
    return new Response(JSON.stringify({ "test-key": publicKey.export({ type: "spki", format: "pem" }) }), { headers: { "cache-control": "max-age=3600" } });
  });
  const course = {
    _id: "course", title: "Test Course", targetDepartments: ["Sales"], targetDesignations: ["Manager"],
    certificateTemplate: { _id: "template", version: 1, heading: "Certificate", introText: "Presented to", completionText: "Completed {{courseTitle}}", footerText: "Magnafic", verificationText: "Verify", primaryColor: "#000047", accentColor: "#12cfe0" },
    modules: [{ _id: "module", lessons: [
      { _id: "lesson-one", title: "One", videoUrl: "https://player.vimeo.com/video/123456789" },
      { _id: "lesson-two", title: "Two", videoUrl: "https://player.vimeo.com/video/987654321" }
    ] }]
  };
  t.mock.method(sanityClient, "fetch", async () => structuredClone(course));

  function token(uid) {
    const now = Math.floor(Date.now() / 1000);
    const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const input = `${encode({ alg: "RS256", kid: "test-key" })}.${encode({ sub: uid, aud: "demo-lms", iss: "https://securetoken.google.com/demo-lms", iat: now, exp: now + 3600, email: `${uid}@example.com`, name: "Test Learner" })}`;
    return `${input}.${sign("RSA-SHA256", Buffer.from(input), privateKey).toString("base64url")}`;
  }
  async function request(path, method = "GET", body, uid = "one") {
    const response = await handler({
      path, httpMethod: method, headers: { authorization: `Bearer ${token(uid)}`, "content-type": "application/json" },
      body: body ? JSON.stringify(body) : null, requestContext: { identity: { sourceIp: "127.0.0.1" } }
    }, {});
    return response.isBase64Encoded
      ? { status: response.statusCode, binary: Buffer.from(response.body, "base64"), headers: response.headers }
      : { status: response.statusCode, ...JSON.parse(response.body) };
  }

  const profile = await request("/api/auth/verify", "POST");
  assert.equal(profile.status, 200);
  assert.equal(profile.user.id, "one");
  assert.equal(profile.user.role, "STUDENT");
  assert.equal(await db.user.count(), 1);
  const directFunctionProfile = await request("/.netlify/functions/api/auth/verify", "POST");
  assert.equal(directFunctionProfile.status, 200);
  assert.equal(directFunctionProfile.user.id, profile.user.id);
  assert.equal(await db.user.count(), 1);
  const updated = await request("/api/auth/profile", "PUT", { companyName: "Test Company", phoneNumber: "1234567890", department: "Sales", designation: "Manager", role: "ADMIN" });
  assert.equal(updated.status, 200);
  assert.equal(updated.user.role, "STUDENT");
  const verifiedProfile = await request("/api/auth/verify", "POST");
  assert.equal(verifiedProfile.user.department, "Sales");
  assert.equal(verifiedProfile.user.designation, "Manager");
  assert.equal(verifiedProfile.user.companyName, "Test Company");
  assert.equal(verifiedProfile.user.phoneNumber, "1234567890");
  const storedProfile = await db.user.findUnique({ where: { firebaseUid: "one" } });
  assert.equal(storedProfile.department, "Sales");
  assert.equal(storedProfile.designation, "Manager");

  const blocked = await request("/api/progress/update", "POST", { courseId: "course", lessonId: "lesson-two", watchedSeconds: 5, durationSeconds: 100 });
  assert.equal(blocked.status, 403);
  const skipped = await request("/api/progress/update", "POST", { courseId: "course", lessonId: "lesson-one", watchedSeconds: 80, durationSeconds: 100 });
  assert.equal(skipped.status, 400);
  const partial = await request("/api/progress/update", "POST", { courseId: "course", lessonId: "lesson-one", watchedSeconds: 10, durationSeconds: 100, userId: "two" });
  assert.equal(partial.status, 200);
  assert.equal(partial.progress.userId, "one");
  const completed = await request("/api/progress/update", "POST", { courseId: "course", lessonId: "lesson-one", watchedSeconds: 100, durationSeconds: 100, completed: true, completionSource: "video-ended" });
  assert.equal(completed.status, 200);
  assert.equal(completed.progress.completed, true);
  assert.equal(completed.unlockedLessonId, "lesson-two");
  assert.equal(completed.course.modules[0].lessons[1].locked, false);
  await request("/api/progress/update", "POST", { courseId: "course", lessonId: "lesson-one", watchedSeconds: 20, durationSeconds: 100 });
  const reloaded = await request("/api/course/course");
  assert.equal(reloaded.course.modules[0].lessons[1].locked, false);

  await request("/api/auth/profile", "PUT", { department: "Sales", designation: "Manager" }, "two");
  const other = await request("/api/progress/course", "GET", undefined, "two");
  assert.equal(other.status, 200);
  assert.deepEqual(other.progress, []);
  const admin = await request("/api/admin/analytics");
  assert.equal(admin.status, 403);

  const finished = await request("/api/progress/update", "POST", { courseId: "course", lessonId: "lesson-two", watchedSeconds: 100, durationSeconds: 100, completed: true, completionSource: "video-ended" });
  assert.equal(finished.courseCompleted, true);
  assert.equal(await db.courseCompletion.count(), 1);
  const issued = await request("/api/certificates/course/issue", "POST", { recipientName: "Test Learner" });
  assert.equal(issued.status, 201);
  const number = issued.certificate.certificateNumber;
  const reissued = await request("/api/certificates/course/issue", "POST", { recipientName: "Changed Name" });
  assert.equal(reissued.certificate.certificateNumber, number);
  assert.equal(reissued.certificate.recipientName, "Test Learner");
  const verification = await request(`/api/certificates/verify/${number}`);
  assert.equal(verification.valid, true);
  const deniedDownload = await request(`/api/certificates/${number}/pdf`);
  assert.equal(deniedDownload.status, 403);
  await request(`/api/certificates/${number}/linkedin-share`, "POST");
  const pdf = await request(`/api/certificates/${number}/pdf`);
  assert.equal(pdf.status, 200);
  assert.equal(pdf.binary.subarray(0, 4).toString(), "%PDF");
  const image = await request(`/api/certificates/${number}/image.png`);
  assert.equal(image.status, 200);
  assert.equal(image.binary.subarray(1, 4).toString(), "PNG");
  await db.user.update({ where: { id: "one" }, data: { role: "ADMIN" } });
  const analytics = await request("/api/admin/analytics");
  assert.equal(analytics.status, 200);
  assert.equal(analytics.totals.completedCourses, 1);
  const report = await request("/api/admin/reports/all");
  assert.equal(report.status, 200);
  assert.equal(report.binary.subarray(0, 2).toString(), "PK");
});
