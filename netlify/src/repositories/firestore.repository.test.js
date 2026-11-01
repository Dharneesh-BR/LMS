import test from "node:test";
import assert from "node:assert/strict";
import { createFirestoreRepository, normalizeDocument, compoundId } from "./firestore.repository.js";
import { memoryFirestore } from "../../test-support/memory-firestore.js";

function setup() {
  const firestore = memoryFirestore();
  return { firestore, db: createFirestoreRepository(() => firestore) };
}

test("a Firebase UID identifies one profile, preserving role and creation time on repeated login", async () => {
  const { db, firestore } = setup();
  const create = { firebaseUid: "firebase-uid", email: "learner@example.com", name: "Learner" };
  const user = await db.user.upsert({ where: { firebaseUid: create.firebaseUid }, create, update: create });
  assert.equal(user.id, create.firebaseUid);
  assert.equal(user.role, "STUDENT");
  assert.equal(user.department, null);
  await db.user.update({ where: { id: user.id }, data: { role: "ADMIN", department: "Sales" } });
  const writesBeforeLogin = firestore.writes;
  const signedIn = await db.user.upsert({ where: { firebaseUid: user.id }, create, update: create });
  assert.equal(signedIn.role, "ADMIN");
  assert.equal(signedIn.department, "Sales");
  assert.deepEqual(signedIn.createdAt, user.createdAt);
  assert.equal(firestore.writes, writesBeforeLogin);
  assert.equal(await db.user.count(), 1);
});

test("concurrent late playback saves cannot erase completion or reduce watched time", async () => {
  const { db } = setup();
  const key = { userId: "user", courseId: "course", lessonId: "lesson" };
  await Promise.all([
    db.progress.upsert({ where: { userId_courseId_lessonId: key }, create: { ...key, watchedSeconds: 100, durationSeconds: 100, completed: true, contentCompleted: true }, update: { watchedSeconds: 100, completed: true, contentCompleted: true } }),
    db.progress.upsert({ where: { userId_courseId_lessonId: key }, create: { ...key, watchedSeconds: 20 }, update: { watchedSeconds: 20, completed: false, contentCompleted: false } })
  ]);
  const progress = await db.progress.findUnique({ where: { userId_courseId_lessonId: key } });
  assert.equal(progress.completed, true);
  assert.equal(progress.contentCompleted, true);
  assert.equal(progress.watchedSeconds, 100);
  assert.equal(progress.durationSeconds, 100);
  assert.equal(await db.progress.count(), 1);
});

test("progress remains isolated between users and courses and supports empty visibility filters", async () => {
  const { db } = setup();
  for (const key of [
    { userId: "one", courseId: "course-a", lessonId: "lesson" },
    { userId: "two", courseId: "course-a", lessonId: "lesson" },
    { userId: "one", courseId: "course-b", lessonId: "lesson" }
  ]) await db.progress.upsert({ where: { userId_courseId_lessonId: key }, create: key, update: {} });
  const rows = await db.progress.findMany({ where: { userId: "one", courseId: { in: ["course-a"] } }, select: { lessonId: true } });
  assert.deepEqual(rows, [{ lessonId: "lesson" }]);
  assert.deepEqual(await db.progress.findMany({ where: { userId: "one", courseId: { in: [] } } }), []);
});

test("enrollment and course completion are idempotent", async () => {
  const { db } = setup();
  const key = { userId: "user", courseId: "course" };
  for (const model of [db.enrollment, db.courseCompletion]) {
    const first = await model.upsert({ where: { userId_courseId: key }, create: key, update: {} });
    const second = await model.upsert({ where: { userId_courseId: key }, create: key, update: {} });
    assert.deepEqual(first, second);
    assert.equal(await model.count(), 1);
  }
});

test("certificate issuance returns a single immutable certificate under concurrent requests", async () => {
  const { db } = setup();
  const data = { userId: "user", courseId: "course", certificateNumber: "MAG-2026-ONE", recipientName: "Original", completionId: "completion" };
  const [first, second] = await Promise.all([
    db.certificate.create({ data }),
    db.certificate.create({ data: { ...data, certificateNumber: "MAG-2026-TWO", recipientName: "Changed" } })
  ]);
  assert.deepEqual(second, first);
  assert.equal(first.recipientName, "Original");
  await assert.rejects(db.certificate.create({ data: { ...data, userId: "other" } }), /number already exists/);
  assert.equal(await db.certificate.count(), 1);
});

test("assessment attempts enforce limits and numbering atomically", async () => {
  const { db } = setup();
  const data = { userId: "user", courseId: "course", assessmentId: "assessment", type: "FINAL", score: 100, passed: true, answers: { question: ["option"] } };
  const outcomes = await Promise.allSettled([
    db.recordAssessmentAttempt(data, 1),
    db.recordAssessmentAttempt(data, 1)
  ]);
  assert.equal(outcomes.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(outcomes.find((result) => result.status === "rejected").reason.statusCode, 409);
  const rows = await db.assessmentAttempt.findMany({ where: { userId: "user", assessmentId: "assessment" } });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].attemptNumber, 1);
});

test("report queries resolve user/course relations, optional certificates, projections, and sorting", async () => {
  const { db } = setup();
  await db.user.upsert({ where: { firebaseUid: "uid" }, create: { firebaseUid: "uid", email: "test@example.com", name: "Test" }, update: {} });
  await db.course.upsert({ where: { sanityId: "sanity" }, create: { sanityId: "sanity", title: "Test Course", price: 0 }, update: {} });
  for (const [lessonId, watchedSeconds] of [["one", 10], ["two", 20]]) {
    const key = { userId: "uid", courseId: "sanity", lessonId };
    await db.progress.upsert({ where: { userId_courseId_lessonId: key }, create: { ...key, watchedSeconds }, update: {} });
  }
  const rows = await db.progress.findMany({ orderBy: { watchedSeconds: "desc" }, take: 1, include: { user: { select: { email: true } }, course: { select: { title: true } } } });
  assert.equal(rows[0].lessonId, "two");
  assert.deepEqual(rows[0].user, { email: "test@example.com" });
  assert.deepEqual(rows[0].course, { title: "Test Course" });
  const users = await db.user.findMany({ include: { progress: { select: { lessonId: true } } } });
  assert.equal(users[0].progress.length, 2);
  const completion = await db.courseCompletion.upsert({ where: { userId_courseId: { userId: "uid", courseId: "sanity" } }, create: { userId: "uid", courseId: "sanity" }, update: {}, include: { certificate: { select: { certificateNumber: true } } } });
  assert.equal(completion.certificate, null);
});

test("Firestore timestamps become Dates for API date serialization and playback checks", () => {
  const date = new Date("2026-11-01T00:00:00Z");
  assert.deepEqual(normalizeDocument({ updatedAt: { toDate: () => date }, list: [{ at: { toDate: () => date } }] }), { updatedAt: date, list: [{ at: date }] });
  assert.notEqual(compoundId(["a_b", "c"]), compoundId(["a", "b_c"]));
});
