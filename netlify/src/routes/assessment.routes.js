import { Router } from "express";
import {
  getFinalAssessment,
  getLessonAssessment,
  submitFinalAssessment,
  submitLessonAssessment
} from "../controllers/assessment.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/lesson/:courseId/:lessonId", requireAuth, getLessonAssessment);
router.post("/lesson/:courseId/:lessonId/submit", requireAuth, submitLessonAssessment);
router.get("/course/:courseId/final", requireAuth, getFinalAssessment);
router.post("/course/:courseId/final/submit", requireAuth, submitFinalAssessment);

export default router;
