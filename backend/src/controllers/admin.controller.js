import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middleware/error.middleware.js";

export const getAnalytics = asyncHandler(async (_req, res) => {
  const [users, courses, paidEnrollments, orders, completedLessons] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.enrollment.count({ where: { paymentStatus: "PAID" } }),
    prisma.order.findMany({ where: { status: "PAID" }, select: { amount: true } }),
    prisma.progress.count({ where: { completed: true } })
  ]);

  const revenue = orders.reduce((total, order) => total + order.amount, 0);
  const recentEnrollments = await prisma.enrollment.findMany({
    take: 8,
    orderBy: { updatedAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      course: { select: { title: true, sanityId: true } }
    }
  });

  res.json({
    totals: {
      users,
      courses,
      paidEnrollments,
      revenue,
      completedLessons
    },
    recentEnrollments
  });
});

