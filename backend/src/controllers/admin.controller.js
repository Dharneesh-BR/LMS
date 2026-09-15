import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../middleware/error.middleware.js";

function sortByCountDesc(items) {
  return [...items].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function countByLabel(items, key) {
  const counts = new Map();
  items.forEach((item) => {
    const label = item[key]?.trim() || "Not set";
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  return sortByCountDesc([...counts.entries()].map(([label, count]) => ({ label, count })));
}

function uniqueCount(items, key) {
  return new Set(items.map((item) => item[key]).filter(Boolean)).size;
}

function getLatestDate(dates) {
  return dates
    .filter(Boolean)
    .map((date) => new Date(date))
    .sort((a, b) => b.getTime() - a.getTime())[0] || null;
}

export const getAnalytics = asyncHandler(async (_req, res) => {
  const [
    users,
    courses,
    progressRows,
    completedLessons,
    courseCompletions,
    certificates,
    assessmentAttempts,
    recentActivity,
    recentUsers
  ] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        designation: true,
        role: true,
        createdAt: true
      }
    }),
    prisma.course.findMany({
      orderBy: { title: "asc" },
      include: {
        progress: {
          select: {
            userId: true,
            completed: true,
            updatedAt: true
          }
        },
        courseCompletions: {
          select: {
            completedAt: true
          }
        },
        certificates: {
          select: {
            id: true,
            issuedAt: true
          }
        }
      }
    }),
    prisma.progress.findMany({
      select: {
        userId: true,
        courseId: true,
        completed: true,
        updatedAt: true
      }
    }),
    prisma.progress.count({ where: { completed: true } }),
    prisma.courseCompletion.count(),
    prisma.certificate.count(),
    prisma.assessmentAttempt.findMany({
      select: {
        passed: true,
        type: true
      }
    }),
    prisma.progress.findMany({
      take: 8,
      orderBy: { updatedAt: "desc" },
      include: {
        user: { select: { name: true, email: true, department: true, designation: true } },
        course: { select: { title: true, sanityId: true } }
      }
    }),
    prisma.user.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        designation: true,
        role: true,
        createdAt: true
      }
    })
  ]);

  const finalAttempts = assessmentAttempts.filter((attempt) => attempt.type === "FINAL");
  const activeLearners = uniqueCount(progressRows, "userId");
  const startedCourses = uniqueCount(progressRows, "courseId");
  const coursePerformance = courses.map((course) => {
    const latestActivityAt = getLatestDate([
      ...course.progress.map((item) => item.updatedAt),
      ...course.courseCompletions.map((item) => item.completedAt),
      ...course.certificates.map((item) => item.issuedAt)
    ]);

    return {
      id: course.id,
      sanityId: course.sanityId,
      title: course.title,
      learnerCount: uniqueCount(course.progress, "userId"),
      completedLessons: course.progress.filter((item) => item.completed).length,
      completions: course.courseCompletions.length,
      certificates: course.certificates.length,
      latestActivityAt
    };
  });

  res.json({
    totals: {
      users: users.length,
      courses: courses.length,
      activeLearners,
      startedCourses,
      completedLessons,
      completedCourses: courseCompletions,
      certificates,
      assessmentAttempts: assessmentAttempts.length,
      passedAssessments: assessmentAttempts.filter((attempt) => attempt.passed).length,
      finalPasses: finalAttempts.filter((attempt) => attempt.passed).length
    },
    breakdowns: {
      departments: countByLabel(users, "department"),
      designations: countByLabel(users, "designation")
    },
    coursePerformance,
    recentActivity,
    recentUsers
  });
});
