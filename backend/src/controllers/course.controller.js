import { prisma } from "../config/prisma.js";
import { ApiError, asyncHandler } from "../middleware/error.middleware.js";
import { getCourseBySanityId, listCourses, stripLockedLessonData, syncCourse } from "../services/course.service.js";
import { applySequentialLessonAccess } from "../services/lesson-access.service.js";
import { getSecureVimeoUrl } from "../services/vimeo.service.js";

export const getCourses = asyncHandler(async (req, res) => {
  const courses = await listCourses({
    department: req.query.department,
    designation: req.query.designation
  }, { sync: false });
  res.json({ courses });
});

export const getCourse = asyncHandler(async (req, res) => {
  const course = await getCourseBySanityId(req.params.id);

  if (!course) {
    throw new ApiError(404, "Course not found");
  }

  if (!req.auth?.user) {
    return res.json({
      course: stripLockedLessonData(course),
      authenticated: false
    });
  }

  const dbCourse = await syncCourse(course);

  const completedProgress = await prisma.progress.findMany({
    where: {
      userId: req.auth.user.id,
      courseId: dbCourse.id,
      completed: true
    },
    select: { lessonId: true }
  });
  const completedLessonIds = new Set(completedProgress.map((item) => item.lessonId));
  const accessibleCourse = applySequentialLessonAccess(course, completedLessonIds, {
    transformUnlocked: (lesson) => ({
      ...lesson,
      videoUrl: lesson.videoUrl ? getSecureVimeoUrl(lesson.videoUrl) : null
    })
  });

  res.json({ course: accessibleCourse, authenticated: true });
});
