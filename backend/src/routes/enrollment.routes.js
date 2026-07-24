import { Router } from "express";
import { enrollFreeCourse } from "../controllers/enrollment.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/enroll", requireAuth, enrollFreeCourse);

export default router;

