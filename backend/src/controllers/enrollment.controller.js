import { prisma } from "../config/prisma.js";
import { ApiError, asyncHandler } from "../middleware/error.middleware.js";
import { getCourseBySanityId } from "../services/course.service.js";

export const enrollFreeCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.body;
  const sanityCourse = await getCourseBySanityId(courseId);

  if (!sanityCourse) {
    throw new ApiError(404, "Course not found");
  }

  const course = await prisma.course.findUnique({ where: { sanityId: sanityCourse._id } });
  const status = course.price > 0 ? "PENDING" : "PAID";

  const enrollment = await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: req.auth.user.id, courseId: course.id } },
    update: { paymentStatus: status },
    create: {
      userId: req.auth.user.id,
      courseId: course.id,
      paymentStatus: status
    }
  });

  res.status(201).json({ enrollment });
});

