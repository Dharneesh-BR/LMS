import { asyncHandler } from "../middleware/error.middleware.js";
import { getCourseKnowledgeStatus, searchCourseKnowledge } from "../services/course-knowledge.service.js";
import { answerCourseQuestion } from "../services/course-chat.service.js";

export const getKnowledgeStatus = asyncHandler(async (req, res) => {
  const knowledge = await getCourseKnowledgeStatus(req.params.courseId, req.auth.user);
  res.json({ knowledge });
});

export const searchKnowledge = asyncHandler(async (req, res) => {
  const result = await searchCourseKnowledge(req.params.courseId, req.auth.user, req.body.question);
  res.json(result);
});

export const answerQuestion = asyncHandler(async (req, res) => {
  res.json(await answerCourseQuestion(req.params.courseId, req.auth.user, req.body));
});
