import { prisma } from "../config/prisma.js";
import { ApiError, asyncHandler } from "../middleware/error.middleware.js";
import { getCourseBySanityId, listCourses, stripLockedLessonData } from "../services/course.service.js";
import { getSecureVimeoUrl } from "../services/vimeo.service.js";
import { isDesignPreview } from "../config/env.js";

export const getCourses = asyncHandler(async (_req, res) => {
  const courses = await listCourses();
  res.json({ courses });
});

export const getCourse = asyncHandler(async (req, res) => {
  const course = await getCourseBySanityId(req.params.id);

  if (!course) {
    throw new ApiError(404, "Course not found");
  }

  const dbCourse = await prisma.course.findUnique({ where: { sanityId: course._id } });
  const enrollment = req.auth?.user && dbCourse
    ? await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: req.auth.user.id, courseId: dbCourse.id } }
      })
    : null;

  const hasAccess = isDesignPreview || enrollment?.paymentStatus === "PAID" || req.auth?.user?.role === "ADMIN";

  if (!hasAccess) {
    return res.json({ course: stripLockedLessonData(course), enrolled: false });
  }

  const unlocked = {
    ...course,
    modules: course.modules?.map((module) => ({
      ...module,
      lessons: module.lessons?.map((lesson) => ({
        ...lesson,
        videoUrl: lesson.videoUrl ? getSecureVimeoUrl(lesson.videoUrl) : null,
        locked: false
      }))
    }))
  };

  res.json({ course: unlocked, enrolled: true });
});
