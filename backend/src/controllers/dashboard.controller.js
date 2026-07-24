import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { isDesignPreview } from "../config/env.js";
import { getCourseBySanityId } from "../services/course.service.js";

function getLessonPercentage(progress) {
  if (progress?.completed) return 100;
  if (!progress?.durationSeconds) return 0;
  return Math.min(99, Math.round((progress.watchedSeconds / progress.durationSeconds) * 100));
}

function buildCourseProgress(course, content, progress, updatedAt) {
  const lessons = content?.modules?.flatMap((module) =>
    (module.lessons || []).map((lesson) => ({
      id: lesson._id,
      title: lesson.title,
      moduleTitle: module.title,
      duration: lesson.duration
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
  const completionPercentage = lessonProgress.length
    ? Math.round(lessonProgress.reduce((total, lesson) => total + lesson.percentage, 0) / lessonProgress.length)
    : 0;

  return {
    id: course.id,
    sanityId: course.sanityId,
    title: course.title,
    price: course.price,
    completedLessons: lessonProgress.filter((lesson) => lesson.completed).length,
    totalLessons: lessonProgress.length,
    completionPercentage,
    lessons: lessonProgress,
    lastWatchedLessonId: progress[0]?.lessonId || null,
    updatedAt
  };
}

export const getDashboard = asyncHandler(async (req, res) => {
  if (isDesignPreview) {
    const previewCourses = await prisma.course.findMany({ orderBy: { title: "asc" } });
    const courses = await Promise.all(previewCourses.map(async (course) => {
      const content = await getCourseBySanityId(course.sanityId);
      const lessonIds = content?.modules?.flatMap((module) => module.lessons || []).map((lesson) => lesson._id) || [];
      const now = new Date();
      const previewProgress = lessonIds.slice(0, 2).map((lessonId, index) => ({
        lessonId,
        watchedSeconds: index === 0 ? 300 : 120,
        durationSeconds: 300,
        completed: index === 0,
        updatedAt: new Date(now.getTime() - index * 1000)
      }));

      return buildCourseProgress(course, content, previewProgress, course.updatedAt);
    }));

    return res.json({
      courses
    });
  }

  const enrollments = await prisma.enrollment.findMany({
    where: {
      userId: req.auth.user.id,
      paymentStatus: "PAID"
    },
    include: {
      course: true
    },
    orderBy: { updatedAt: "desc" }
  });

  const progress = await prisma.progress.findMany({
    where: {
      userId: req.auth.user.id,
      courseId: { in: enrollments.map((item) => item.courseId) }
    },
    orderBy: { updatedAt: "desc" }
  });

  const courses = await Promise.all(enrollments.map(async (enrollment) => {
    const courseProgress = progress.filter((item) => item.courseId === enrollment.courseId);
    const content = await getCourseBySanityId(enrollment.course.sanityId);
    return buildCourseProgress(enrollment.course, content, courseProgress, enrollment.updatedAt);
  }));

  res.json({ courses });
});
