import assert from "node:assert/strict";
import test from "node:test";
import {
  canCompleteVideoFromSavedPlayback,
  getLessonCompletionMode,
  resolveLessonCompletion,
  validateLessonCompletionEvent
} from "./lesson-completion.service.js";

test("completing a PDF or PPT lesson without an assessment unlocks the next lesson", () => {
  assert.deepEqual(
    resolveLessonCompletion({
      contentCompletionRequested: true,
      hasAssessment: false,
      assessmentPassed: false,
      existingProgress: null
    }),
    { contentCompleted: true, completed: true }
  );
});

test("lesson content completion waits for a configured assessment", () => {
  assert.deepEqual(
    resolveLessonCompletion({
      contentCompletionRequested: true,
      hasAssessment: true,
      assessmentPassed: false,
      existingProgress: null
    }),
    { contentCompleted: true, completed: false }
  );
});

test("passing an assessment after content completion completes the lesson", () => {
  assert.deepEqual(
    resolveLessonCompletion({
      contentCompletionRequested: false,
      hasAssessment: true,
      assessmentPassed: true,
      existingProgress: { contentCompleted: true, completed: false }
    }),
    { contentCompleted: true, completed: true }
  );
});

test("a completed lesson cannot be regressed by a later progress save", () => {
  assert.deepEqual(
    resolveLessonCompletion({
      contentCompletionRequested: false,
      hasAssessment: false,
      assessmentPassed: false,
      existingProgress: { contentCompleted: true, completed: true }
    }),
    { contentCompleted: true, completed: true }
  );
});

test("requires a Vimeo ended event with playback at the video duration", () => {
  const lesson = { videoUrl: "https://player.vimeo.com/video/123" };

  assert.deepEqual(getLessonCompletionMode(lesson), "video");
  assert.equal(
    validateLessonCompletionEvent({
      lesson,
      completionSource: "video-ended",
      watchedSeconds: 98,
      durationSeconds: 100
    }).valid,
    true
  );
  assert.equal(
    validateLessonCompletionEvent({
      lesson,
      completionSource: "video-ended",
      watchedSeconds: 70,
      durationSeconds: 100
    }).valid,
    false
  );
});

test("allows a video-ended save to bridge the final saved playback gap", () => {
  assert.equal(
    canCompleteVideoFromSavedPlayback({
      contentCompletionRequested: true,
      completionEvent: { valid: true, mode: "video" },
      existingProgress: { watchedSeconds: 84 },
      watchedSeconds: 100,
      durationSeconds: 100
    }),
    true
  );
});

test("does not complete video without saved playback near the end", () => {
  assert.equal(
    canCompleteVideoFromSavedPlayback({
      contentCompletionRequested: true,
      completionEvent: { valid: true, mode: "video" },
      existingProgress: { watchedSeconds: 30 },
      watchedSeconds: 100,
      durationSeconds: 100
    }),
    false
  );
  assert.equal(
    canCompleteVideoFromSavedPlayback({
      contentCompletionRequested: true,
      completionEvent: { valid: true, mode: "video" },
      existingProgress: null,
      watchedSeconds: 100,
      durationSeconds: 100
    }),
    false
  );
});

test("accepts the last page only for primary lesson documents", () => {
  const lesson = {
    materials: [
      { resourceType: "reference", extension: "pdf" },
      { resourceType: "lesson", extension: "pptx" }
    ]
  };

  assert.deepEqual(getLessonCompletionMode(lesson), "document");
  assert.equal(
    validateLessonCompletionEvent({
      lesson,
      completionSource: "document-last-page"
    }).valid,
    true
  );
  assert.equal(
    validateLessonCompletionEvent({
      lesson,
      completionSource: "content-end"
    }).valid,
    false
  );
});

test("reference materials never become the primary completion source", () => {
  const lesson = {
    content: [{ _type: "block" }],
    materials: [
      { resourceType: "reference", extension: "pdf" },
      { resourceType: "reference", extension: "pptx" }
    ]
  };

  assert.deepEqual(getLessonCompletionMode(lesson), "content");
  assert.equal(
    validateLessonCompletionEvent({
      lesson,
      completionSource: "document-last-page"
    }).valid,
    false
  );
  assert.equal(
    validateLessonCompletionEvent({
      lesson,
      completionSource: "content-end"
    }).valid,
    true
  );
});

test("reference-only lessons cannot be completed by opening a reference", () => {
  const lesson = {
    materials: [{ resourceType: "reference", extension: "pdf" }]
  };

  assert.deepEqual(getLessonCompletionMode(lesson), "none");
  assert.equal(
    validateLessonCompletionEvent({
      lesson,
      completionSource: "document-last-page"
    }).valid,
    false
  );
  assert.equal(
    validateLessonCompletionEvent({
      lesson,
      completionSource: "content-end"
    }).valid,
    false
  );
});
