import { Router } from "express";
import { updateProfile, verifyAuth } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/verify", requireAuth, verifyAuth);
router.put("/profile", requireAuth, updateProfile);

export default router;
