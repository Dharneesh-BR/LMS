import { db } from "../config/database.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import {
  buildAccessibleCourse,
  getAssessment,
  getAssessmentContext,
  getCourseCompletionStatus,
  sanitizeAssessment,
  scoreAssessment
} from "../services/assessment.service.js";
import { recordCourseCompletion } from "../services/course-completion.service.js";

function requestContext(req, type) {
  return getAssessmentContext({
    user: req.auth.user,
    sanityCourseId: req.params.courseId,
    lessonId: req.params.lessonId,
    type
  });
}

async function attemptsFor(userId, courseId, assessmentId) {
  return db.assessmentAttempt.count({ where: { userId, courseId, assessmentId } });
}

async function loadAssessment(req, res, type) {
  const context = await requestContext(req, type);
  const assessment = await getAssessment(context.assessmentId);
  const attemptsUsed = await attemptsFor(req.auth.user.id, context.course.id, assessment._id);
  res.json({ assessment: sanitizeAssessment(assessment, attemptsUsed) });
}

async function submitAssessment(req, res, type) {
  const context = await requestContext(req, type);
  const assessment = await getAssessment(context.assessmentId);
  const result = scoreAssessment(assessment, req.body.answers);
  const attempt = await db.recordAssessmentAttempt({
    userId: req.auth.user.id,
    courseId: context.course.id,
    assessmentId: assessment._id,
    lessonId: context.lesson?._id || null,
    type,
    answers: result.answers,
    score: result.score,
    passingPercentage: result.passingPercentage,
    passed: result.passed
  }, assessment.maxAttempts);

  let progress = context.progress;
  if (type === "LESSON" && result.passed) {
    const updated = await db.progress.upsert({
      where: {
        userId_courseId_lessonId: {
          userId: req.auth.user.id,
          courseId: context.course.id,
          lessonId: context.lesson._id
        }
      },
      update: { contentCompleted: true, completed: true },
      create: {
        userId: req.auth.user.id,
        courseId: context.course.id,
        lessonId: context.lesson._id,
        contentCompleted: true,
        completed: true
      }
    });
    progress = context.progress.filter((item) => item.lessonId !== updated.lessonId).concat(updated);
  }

  const finalPassed = type === "FINAL"
    ? result.passed
    : Boolean(await db.assessmentAttempt.findFirst({
        where: {
          userId: req.auth.user.id,
          courseId: context.course.id,
          type: "FINAL",
          passed: true
        }
      }));
  const completionStatus = getCourseCompletionStatus(context.content, progress, finalPassed);
  await recordCourseCompletion({
    userId: req.auth.user.id,
    courseId: context.course.id,
    courseCompleted: completionStatus.courseCompleted
  });
  res.json({
    attempt: {
      id: attempt.id,
      attemptNumber: attempt.attemptNumber,
      score: attempt.score,
      passingPercentage: attempt.passingPercentage,
      passed: attempt.passed
    },
    course: buildAccessibleCourse(context.content, progress),
    ...completionStatus
  });
}

export const getLessonAssessment = asyncHandler((req, res) => loadAssessment(req, res, "LESSON"));
export const submitLessonAssessment = asyncHandler((req, res) => submitAssessment(req, res, "LESSON"));
export const getFinalAssessment = asyncHandler((req, res) => loadAssessment(req, res, "FINAL"));
export const submitFinalAssessment = asyncHandler((req, res) => submitAssessment(req, res, "FINAL"));
