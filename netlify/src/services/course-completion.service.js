import { db } from "../config/database.js";

export async function recordCourseCompletion({ userId, courseId, courseCompleted }) {
  if (!courseCompleted) return null;

  return db.courseCompletion.upsert({
    where: { userId_courseId: { userId, courseId } },
    update: {},
    create: { userId, courseId }
  });
}
