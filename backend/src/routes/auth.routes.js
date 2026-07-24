import { Router } from "express";
import { verifyAuth } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/verify", requireAuth, verifyAuth);

export default router;

