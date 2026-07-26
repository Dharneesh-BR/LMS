import { prisma } from "../config/prisma.js";
import { ApiError, asyncHandler } from "../middleware/error.middleware.js";
import { isDesignPreview } from "../config/env.js";
import { getCourseBySanityId } from "../services/course.service.js";
import { applySequentialLessonAccess } from "../services/lesson-access.service.js";
import { getSecureVimeoUrl } from "../services/vimeo.service.js";
import { getCourseCompletionStatus } from "../services/assessment.service.js";
import {
  resolveLessonCompletion,
  validateLessonCompletionEvent
} from "../services/lesson-completion.service.js";
import { recordCourseCompletion } from "../services/course-completion.service.js";

async function getCourseContext(sanityCourseId) {
  const content = await getCourseBySanityId(sanityCourseId);
  if (!content) {
    throw new ApiError(404, "Course not found");
  }

  const record = await prisma.course.findUnique({ where: { sanityId: sanityCourseId } });
  return { content, record };
}

export const getProgress = asyncHandler(async (req, res) => {
  if (isDesignPreview) {
    return res.json({ progress: [], completed: 2, lastWatchedLessonId: null });
  }

  const { content, record: course } = await getCourseContext(req.params.courseId);
  const progress = await prisma.progress.findMany({
    where: { userId: req.auth.user.id, courseId: course.id },
    orderBy: { updatedAt: "desc" }
  });

  const completed = progress.filter((item) => item.completed).length;
  const finalPassed = content.finalAssessment?._id
    ? Boolean(await prisma.assessmentAttempt.findFirst({
        where: {
          userId: req.auth.user.id,
          courseId: course.id,
          assessmentId: content.finalAssessment._id,
          type: "FINAL",
          passed: true
        }
      }))
    : false;
  res.json({
    progress,
    completed,
    lastWatchedLessonId: progress[0]?.lessonId || null,
    ...getCourseCompletionStatus(content, progress, finalPassed)
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
  const contentCompletionRequested = req.body.completed === true;

  if (isDesignPreview) {
    return res.json({
      progress: {
        id: "design-preview",
        lessonId,
        watchedSeconds: watchedSeconds ?? 0,
        durationSeconds: durationSeconds ?? 0,
        contentCompleted: contentCompletionRequested,
        completed: contentCompletionRequested
      }
    });
  }

  const { content: courseContent, record: course } = await getCourseContext(courseId);

  const completedProgress = await prisma.progress.findMany({
    where: {
      userId: req.auth.user.id,
      courseId: course.id,
      completed: true
    },
    select: { lessonId: true }
  });
  const completedLessonIds = new Set(completedProgress.map((item) => item.lessonId));
  const accessibleCourse = applySequentialLessonAccess(
    courseContent,
    completedLessonIds
  );
  const lesson = accessibleCourse.modules
    ?.flatMap((module) => module.lessons || [])
    .find((item) => item._id === lessonId);

  if (!lesson) {
    throw new ApiError(404, "Lesson not found");
  }
  if (lesson.locked) {
    throw new ApiError(403, "Complete the previous lesson to unlock this lesson");
  }
  if (contentCompletionRequested) {
    const completionEvent = validateLessonCompletionEvent({
      lesson,
      completionSource: req.body.completionSource,
      watchedSeconds,
      durationSeconds
    });
    if (!completionEvent.valid) {
      throw new ApiError(400, completionEvent.message);
    }
  }

  const existingProgress = await prisma.progress.findUnique({
    where: {
      userId_courseId_lessonId: {
        userId: req.auth.user.id,
        courseId: course.id,
        lessonId
      }
    }
  });
  const passedLessonAssessment = lesson.assessment?._id
    ? Boolean(await prisma.assessmentAttempt.findFirst({
        where: {
          userId: req.auth.user.id,
          courseId: course.id,
          assessmentId: lesson.assessment._id,
          lessonId,
          type: "LESSON",
          passed: true
        }
      }))
    : true;
  const completion = resolveLessonCompletion({
    contentCompletionRequested,
    hasAssessment: Boolean(lesson.assessment?._id),
    assessmentPassed: passedLessonAssessment,
    existingProgress
  });

  const timing = durationSeconds && watchedSeconds !== undefined
    ? { watchedSeconds: Math.min(watchedSeconds, durationSeconds), durationSeconds }
    : {
        ...(watchedSeconds !== undefined ? { watchedSeconds } : {}),
        ...(durationSeconds !== undefined ? { durationSeconds } : {})
      };
  const update = {
    ...timing,
    ...(contentCompletionRequested ? {
      contentCompleted: completion.contentCompleted,
      completed: completion.completed
    } : {})
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
      contentCompleted: completion.contentCompleted,
      completed: completion.completed
    }
  });

  if (!contentCompletionRequested) {
    return res.json({ progress });
  }

  if (progress.completed) {
    completedLessonIds.add(lessonId);
  } else {
    completedLessonIds.delete(lessonId);
  }

  const updatedCourse = applySequentialLessonAccess(courseContent, completedLessonIds, {
    transformUnlocked: (item) => ({
      ...item,
      videoUrl: item.videoUrl ? getSecureVimeoUrl(item.videoUrl) : null
    })
  });
  const updatedLessons = updatedCourse.modules?.flatMap((module) => module.lessons || []) || [];
  const lessonIndex = updatedLessons.findIndex((item) => item._id === lessonId);
  const unlockedLessonId = progress.completed && lessonIndex >= 0
    ? updatedLessons[lessonIndex + 1]?._id || null
    : null;
  const completionStatus = getCourseCompletionStatus(
    courseContent,
    [...completedLessonIds].map((completedLessonId) => ({
      lessonId: completedLessonId,
      completed: true
    })),
    false
  );
  await recordCourseCompletion({
    userId: req.auth.user.id,
    courseId: course.id,
    courseCompleted: completionStatus.courseCompleted
  });

  res.json({
    progress,
    course: updatedCourse,
    unlockedLessonId,
    ...completionStatus
  });
});
