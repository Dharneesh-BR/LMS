import { prisma } from "../config/prisma.js";
import { ApiError, asyncHandler } from "../middleware/error.middleware.js";
import { isDesignPreview } from "../config/env.js";

async function assertEnrollment(userId, sanityCourseId) {
  const course = await prisma.course.findUnique({ where: { sanityId: sanityCourseId } });

  if (!course) {
    throw new ApiError(404, "Course not found");
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: course.id } }
  });

  if (enrollment?.paymentStatus !== "PAID") {
    throw new ApiError(403, "Enrollment required");
  }

  return course;
}

export const getProgress = asyncHandler(async (req, res) => {
  if (isDesignPreview) {
    return res.json({ progress: [], completed: 2, lastWatchedLessonId: null });
  }

  const course = await assertEnrollment(req.auth.user.id, req.params.courseId);
  const progress = await prisma.progress.findMany({
    where: { userId: req.auth.user.id, courseId: course.id },
    orderBy: { updatedAt: "desc" }
  });

  const completed = progress.filter((item) => item.completed).length;
  res.json({
    progress,
    completed,
    lastWatchedLessonId: progress[0]?.lessonId || null
  });
});

function parseSeconds(value, fieldName) {
  if (value === undefined) return undefined;

  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new ApiError(400, `${fieldName} must be a non-negative number`);
  }

  return Math.round(seconds);
}

export const updateProgress = asyncHandler(async (req, res) => {
  const { courseId, lessonId } = req.body;
  if (!courseId || !lessonId) {
    throw new ApiError(400, "courseId and lessonId are required");
  }

  const watchedSeconds = parseSeconds(req.body.watchedSeconds, "watchedSeconds");
  const durationSeconds = parseSeconds(req.body.durationSeconds, "durationSeconds");
  const completed = typeof req.body.completed === "boolean" ? req.body.completed : undefined;

  if (isDesignPreview) {
    return res.json({
      progress: {
        id: "design-preview",
        lessonId,
        watchedSeconds: watchedSeconds ?? 0,
        durationSeconds: durationSeconds ?? 0,
        completed: completed ?? false
      }
    });
  }

  const course = await assertEnrollment(req.auth.user.id, courseId);
  const timing = durationSeconds && watchedSeconds !== undefined
    ? { watchedSeconds: Math.min(watchedSeconds, durationSeconds), durationSeconds }
    : {
        ...(watchedSeconds !== undefined ? { watchedSeconds } : {}),
        ...(durationSeconds !== undefined ? { durationSeconds } : {})
      };
  const update = {
    ...timing,
    ...(completed !== undefined ? { completed } : {})
  };

  const progress = await prisma.progress.upsert({
    where: {
      userId_courseId_lessonId: {
        userId: req.auth.user.id,
        courseId: course.id,
        lessonId
      }
    },
    update,
    create: {
      userId: req.auth.user.id,
      courseId: course.id,
      lessonId,
      ...timing,
      completed: completed ?? false
    }
  });

  res.json({ progress });
});
