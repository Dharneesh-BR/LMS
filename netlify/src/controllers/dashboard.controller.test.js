import assert from "node:assert/strict";
import test from "node:test";
import { getLessonPercentage, selectResumeLessonId } from "./dashboard.controller.js";

test("lesson percentage reflects saved playback and reserves 100 for completion", () => {
  assert.equal(getLessonPercentage({ watchedSeconds: 30, durationSeconds: 120 }), 25);
  assert.equal(getLessonPercentage({ watchedSeconds: 120, durationSeconds: 120 }), 99);
  assert.equal(getLessonPercentage({ completed: true }), 100);
});

test("resume selects the latest accessible incomplete lesson with saved playback", () => {
  const lessons = [
    { id: "one", completed: true, locked: false },
    { id: "two", completed: false, locked: false },
    { id: "three", completed: false, locked: true }
  ];
  const progress = [
    { lessonId: "one", watchedSeconds: 100, completed: true },
    { lessonId: "two", watchedSeconds: 42, completed: false }
  ];

  assert.equal(selectResumeLessonId(lessons, progress), "two");
});

test("resume falls back to the first available incomplete lesson", () => {
  const lessons = [
    { id: "one", completed: true, locked: false },
    { id: "two", completed: false, locked: false }
  ];

  assert.equal(selectResumeLessonId(lessons, []), "two");
});
