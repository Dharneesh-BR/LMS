export function resolveLessonCompletion({
  contentCompletionRequested,
  hasAssessment,
  assessmentPassed,
  existingProgress
}) {
  const contentCompleted = Boolean(
    existingProgress?.contentCompleted ||
    existingProgress?.completed ||
    contentCompletionRequested
  );
  const completed = Boolean(
    existingProgress?.completed ||
    (contentCompleted && (!hasAssessment || assessmentPassed))
  );

  return { contentCompleted, completed };
}

export function getLessonCompletionMode(lesson) {
  if (lesson?.videoUrl) return "video";

  const primaryMaterial = lesson?.materials?.find(
    (material) => material.resourceType !== "reference"
  );
  if (primaryMaterial) return "document";
  return lesson?.content?.length ? "content" : "none";
}

export function validateLessonCompletionEvent({
  lesson,
  completionSource,
  watchedSeconds,
  durationSeconds
}) {
  const mode = getLessonCompletionMode(lesson);
  const expectedSource = {
    video: "video-ended",
    document: "document-last-page",
    content: "content-end",
    none: null
  }[mode];

  if (!expectedSource || completionSource !== expectedSource) {
    return {
      valid: false,
      message: `Lesson completion must come from ${expectedSource}`
    };
  }

  if (mode === "video") {
    const watched = Number(watchedSeconds);
    const duration = Number(durationSeconds);
    const reachedEnd = Number.isFinite(watched) &&
      Number.isFinite(duration) &&
      duration > 0 &&
      watched >= Math.max(0, duration - 2);

    if (!reachedEnd) {
      return {
        valid: false,
        message: "Watch the complete video before finishing this lesson"
      };
    }
  }

  return { valid: true, mode };
}

export function isValidVideoCompletionEvent({
  contentCompletionRequested,
  completionEvent,
  watchedSeconds,
  durationSeconds
}) {
  if (
    !contentCompletionRequested ||
    completionEvent?.mode !== "video" ||
    !Number.isFinite(watchedSeconds) ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0
  ) {
    return false;
  }

  if (watchedSeconds < Math.max(0, durationSeconds - 2)) {
    return false;
  }

  return true;
}
