import { Router } from "express";
import { getCourse, getCourses } from "../controllers/course.controller.js";
import { optionalAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/courses", optionalAuth, getCourses);
router.get("/course/:id", optionalAuth, getCourse);

export default router;
