import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { getCourseBySanityId, listCourses } from "../services/course.service.js";
import { applySequentialLessonAccess } from "../services/lesson-access.service.js";

export function getLessonPercentage(progress) {
  if (progress?.completed) return 100;
  if (!progress?.durationSeconds) return 0;
  return Math.min(99, Math.round((progress.watchedSeconds / progress.durationSeconds) * 100));
}

export function selectResumeLessonId(lessons, progress) {
  const accessibleIncompleteIds = new Set(
    lessons
      .filter((lesson) => !lesson.locked && !lesson.completed)
      .map((lesson) => lesson.id)
  );
  const inProgress = progress.find((item) =>
    accessibleIncompleteIds.has(item.lessonId) && item.watchedSeconds > 0
  );

  return inProgress?.lessonId
    || lessons.find((lesson) => !lesson.locked && !lesson.completed)?.id
    || null;
}

function buildCourseProgress(course, content, progress, updatedAt, finalPassed) {
  const completedLessonIds = new Set(
    progress.filter((item) => item.completed).map((item) => item.lessonId)
  );
  const accessibleCourse = applySequentialLessonAccess(content, completedLessonIds);
  const lessons = accessibleCourse?.modules?.flatMap((module) =>
    (module.lessons || []).map((lesson) => ({
      id: lesson._id,
      title: lesson.title,
      moduleTitle: module.title,
      duration: lesson.duration,
      locked: lesson.locked
    }))
  ) || [];
  const progressByLesson = new Map(progress.map((item) => [item.lessonId, item]));
  const lessonProgress = lessons.map((lesson) => {
    const item = progressByLesson.get(lesson.id);
    return {
      ...lesson,
      watchedSeconds: item?.watchedSeconds || 0,
      durationSeconds: item?.durationSeconds || 0,
      completed: item?.completed || false,
      percentage: getLessonPercentage(item)
    };
  });
  let completionPercentage = lessonProgress.length
    ? Math.round(lessonProgress.reduce((total, lesson) => total + lesson.percentage, 0) / lessonProgress.length)
    : 0;
  const lessonsCompleted = lessonProgress.length > 0 && lessonProgress.every((lesson) => lesson.completed);
  const hasFinalAssessment = Boolean(content.finalAssessment?._id);
  if (completionPercentage === 100 && hasFinalAssessment && !finalPassed) {
    completionPercentage = 99;
  }
  const lastWatchedLessonId = selectResumeLessonId(lessonProgress, progress);
  const resumeProgress = progressByLesson.get(lastWatchedLessonId);

  return {
    id: course.id,
    sanityId: course.sanityId,
    title: course.title,
    completedLessons: lessonProgress.filter((lesson) => lesson.completed).length,
    totalLessons: lessonProgress.length,
    completionPercentage,
    courseCompleted: lessonsCompleted && (!hasFinalAssessment || finalPassed),
    finalAssessment: hasFinalAssessment ? {
      ...content.finalAssessment,
      unlocked: lessonsCompleted,
      passed: finalPassed
    } : null,
    lessons: lessonProgress,
    lastWatchedLessonId,
    resumeSeconds: resumeProgress?.watchedSeconds || 0,
    updatedAt
  };
}

export const getDashboard = asyncHandler(async (req, res) => {
  await listCourses();
  const availableCourses = await prisma.course.findMany({ orderBy: { title: "asc" } });

  const progress = await prisma.progress.findMany({
    where: {
      userId: req.auth.user.id,
      courseId: { in: availableCourses.map((item) => item.id) }
    },
    orderBy: { updatedAt: "desc" }
  });
  const passedFinalAttempts = await prisma.assessmentAttempt.findMany({
    where: {
      userId: req.auth.user.id,
      courseId: { in: availableCourses.map((item) => item.id) },
      type: "FINAL",
      passed: true
    },
    select: { courseId: true, assessmentId: true }
  });

  const courses = await Promise.all(availableCourses.map(async (course) => {
    const courseProgress = progress.filter((item) => item.courseId === course.id);
    const content = await getCourseBySanityId(course.sanityId);
    const finalPassed = content.finalAssessment?._id
      ? passedFinalAttempts.some((attempt) =>
          attempt.courseId === course.id && attempt.assessmentId === content.finalAssessment._id
        )
      : false;
    return buildCourseProgress(
      course,
      content,
      courseProgress,
      courseProgress[0]?.updatedAt || course.updatedAt,
      finalPassed
    );
  }));

  res.json({ courses });
});
