import assert from "node:assert/strict";
import test from "node:test";
import { applySequentialLessonAccess } from "./lesson-access.service.js";

const course = {
  modules: [
    {
      _id: "module-1",
      lessons: [
        { _id: "lesson-1", title: "One", videoUrl: "video-1", materials: [{ url: "file-1" }], content: ["notes-1"] },
        { _id: "lesson-2", title: "Two", videoUrl: "video-2", materials: [{ url: "file-2" }], content: ["notes-2"] }
      ]
    },
    {
      _id: "module-2",
      lessons: [
        { _id: "lesson-3", title: "Three", videoUrl: "video-3", materials: [{ url: "file-3" }], content: ["notes-3"] }
      ]
    }
  ]
};

test("only the first lesson is initially unlocked", () => {
  const result = applySequentialLessonAccess(course, new Set());
  const lessons = result.modules.flatMap((module) => module.lessons);

  assert.equal(lessons[0].locked, false);
  assert.equal(lessons[1].locked, true);
  assert.equal(lessons[2].locked, true);
  assert.equal("videoUrl" in lessons[1], false);
  assert.equal("materials" in lessons[1], false);
  assert.equal("content" in lessons[1], false);
});

test("lessons unlock one at a time across module boundaries", () => {
  const afterFirst = applySequentialLessonAccess(course, new Set(["lesson-1"]));
  const afterSecond = applySequentialLessonAccess(course, new Set(["lesson-1", "lesson-2"]));

  assert.deepEqual(
    afterFirst.modules.flatMap((module) => module.lessons).map((lesson) => lesson.locked),
    [false, false, true]
  );
  assert.deepEqual(
    afterSecond.modules.flatMap((module) => module.lessons).map((lesson) => lesson.locked),
    [false, false, false]
  );
});

test("out-of-sequence progress never unlocks a later lesson", () => {
  const result = applySequentialLessonAccess(course, new Set(["lesson-2"]));
  const lessons = result.modules.flatMap((module) => module.lessons);

  assert.deepEqual(lessons.map((lesson) => lesson.locked), [false, true, true]);
});
