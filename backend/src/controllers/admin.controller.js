import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middleware/error.middleware.js";

export const getAnalytics = asyncHandler(async (_req, res) => {
  const [users, courses, learnerRows, completedLessons, recentActivity] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.progress.findMany({ distinct: ["userId"], select: { userId: true } }),
    prisma.progress.count({ where: { completed: true } }),
    prisma.progress.findMany({
      take: 8,
      orderBy: { updatedAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        course: { select: { title: true, sanityId: true } }
      }
    })
  ]);

  res.json({
    totals: {
      users,
      courses,
      activeLearners: learnerRows.length,
      completedLessons
    },
    recentActivity
  });
});
