import { prisma } from "../config/prisma.js";

export async function recordCourseCompletion({ userId, courseId, courseCompleted }) {
  if (!courseCompleted) return null;

  return prisma.courseCompletion.upsert({
    where: { userId_courseId: { userId, courseId } },
    update: {},
    create: { userId, courseId }
  });
}
