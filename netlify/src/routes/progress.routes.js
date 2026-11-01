import { Router } from "express";
import { getProgress, updateProgress } from "../controllers/progress.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/:courseId", requireAuth, getProgress);
router.post("/update", requireAuth, updateProgress);

export default router;

