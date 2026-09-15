import { prisma } from "../config/prisma.js";
import { sanityClient } from "../config/sanity.js";
import { ApiError } from "../middleware/error.middleware.js";
import { assertCourseAudience, getCourseBySanityId } from "./course.service.js";
import { applySequentialLessonAccess } from "./lesson-access.service.js";
import { getSecureVimeoUrl } from "./vimeo.service.js";

const assessmentQuery = `*[_type == "assessment" && _id == $id][0] {
  _id,
  title,
  instructions,
  passingPercentage,
  maxAttempts,
  randomizeOptions,
  questions[]{
    _key,
    prompt,
    questionType,
    options[]{_key, label, isCorrect}
  }
}`;

function allLessons(course) {
  return course.modules?.flatMap((module) => module.lessons || []) || [];
}

function shuffle(items) {
  return items
    .map((item) => ({ item, order: Math.random() }))
    .sort((left, right) => left.order - right.order)
    .map(({ item }) => item);
}

export function sanitizeAssessment(assessment, attemptsUsed = 0) {
  return {
    _id: assessment._id,
    title: assessment.title,
    instructions: assessment.instructions,
    passingPercentage: assessment.passingPercentage || 70,
    maxAttempts: assessment.maxAttempts || null,
    attemptsUsed,
    questions: (assessment.questions || []).map((question) => ({
      _key: question._key,
      prompt: question.prompt,
      questionType: question.questionType,
      options: (assessment.randomizeOptions ? shuffle(question.options || []) : question.options || [])
        .map(({ _key, label }) => ({ _key, label }))
    }))
  };
}

export async function getAssessment(id) {
  const assessment = await sanityClient.fetch(assessmentQuery, { id });
  if (!assessment) throw new ApiError(404, "Assessment not found");
  if (!assessment.questions?.length) throw new ApiError(409, "Assessment has no questions");
  return assessment;
}

export function scoreAssessment(assessment, submittedAnswers = {}) {
  let correct = 0;
  const answers = {};

  for (const question of assessment.questions) {
    const available = new Set((question.options || []).map((option) => option._key));
    const raw = submittedAnswers[question._key];
    const selected = Array.isArray(raw) ? [...new Set(raw)] : raw ? [raw] : [];
    if (selected.some((key) => !available.has(key))) {
      throw new ApiError(400, "An answer contains an invalid option");
    }
    if (question.questionType !== "multipleChoice" && selected.length > 1) {
      throw new ApiError(400, "Only one option may be selected for this question");
    }

    const expected = (question.options || [])
      .filter((option) => option.isCorrect)
      .map((option) => option._key)
      .sort();
    const normalized = selected.sort();
    if (expected.length === normalized.length && expected.every((key, index) => key === normalized[index])) {
      correct += 1;
    }
    answers[question._key] = normalized;
  }

  const score = Math.round((correct / assessment.questions.length) * 100);
  const passingPercentage = assessment.passingPercentage || 70;
  return { answers, score, passingPercentage, passed: score >= passingPercentage };
}

export async function getAssessmentContext({ user, sanityCourseId, lessonId, type }) {
  const content = await getCourseBySanityId(sanityCourseId);
  if (!content) throw new ApiError(404, "Course not found");
  assertCourseAudience(content, user);
  const course = await prisma.course.findUnique({ where: { sanityId: content._id } });
  if (!course) throw new ApiError(500, "Course record could not be synced.");
  const userId = user.id;
  const progress = await prisma.progress.findMany({ where: { userId, courseId: course.id } });
  const completedIds = new Set(progress.filter((item) => item.completed).map((item) => item.lessonId));

  if (type === "FINAL") {
    const assessmentId = content.finalAssessment?._id;
    if (!assessmentId) throw new ApiError(404, "This course has no final assessment");
    if (allLessons(content).some((lesson) => !completedIds.has(lesson._id))) {
      throw new ApiError(403, "Complete every lesson to unlock the final assessment");
    }
    return { content, course, progress, assessmentId, lesson: null };
  }

  const accessible = applySequentialLessonAccess(content, completedIds);
  const lesson = allLessons(accessible).find((item) => item._id === lessonId);
  if (!lesson) throw new ApiError(404, "Lesson not found");
  if (lesson.locked) throw new ApiError(403, "Complete the previous lesson to unlock this lesson");
  if (!lesson.assessment?._id) throw new ApiError(404, "This lesson has no assessment");
  const lessonProgress = progress.find((item) => item.lessonId === lessonId);
  if (!lessonProgress?.contentCompleted && !lessonProgress?.completed) {
    throw new ApiError(403, "Complete the lesson content before starting the assessment");
  }
  return { content, course, progress, assessmentId: lesson.assessment._id, lesson };
}

export function buildAccessibleCourse(content, progress) {
  const completedIds = new Set(progress.filter((item) => item.completed).map((item) => item.lessonId));
  return applySequentialLessonAccess(content, completedIds, {
    transformUnlocked: (lesson) => ({
      ...lesson,
      videoUrl: lesson.videoUrl ? getSecureVimeoUrl(lesson.videoUrl) : null
    })
  });
}

export function getCourseCompletionStatus(content, progress, finalPassed) {
  const lessons = allLessons(content);
  const completedIds = new Set(progress.filter((item) => item.completed).map((item) => item.lessonId));
  const lessonsCompleted = lessons.length > 0 && lessons.every((lesson) => completedIds.has(lesson._id));
  const hasFinalAssessment = Boolean(content.finalAssessment?._id);
  return {
    lessonsCompleted,
    finalAssessment: hasFinalAssessment ? {
      ...content.finalAssessment,
      unlocked: lessonsCompleted,
      passed: Boolean(finalPassed)
    } : null,
    courseCompleted: lessonsCompleted && (!hasFinalAssessment || Boolean(finalPassed))
  };
}
