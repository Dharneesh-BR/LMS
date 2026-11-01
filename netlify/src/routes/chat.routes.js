import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getKnowledgeStatus, searchKnowledge, answerQuestion } from "../controllers/chat.controller.js";

const router = Router();
router.get("/course/:courseId/status", requireAuth, getKnowledgeStatus);
router.post("/course/:courseId/search", requireAuth, searchKnowledge);
router.post("/course/:courseId/message", requireAuth, answerQuestion);
export default router;
