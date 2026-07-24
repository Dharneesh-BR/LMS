import { Router } from "express";
import { getAnalytics } from "../controllers/admin.controller.js";
import { requireAdmin, requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/admin/analytics", requireAuth, requireAdmin, getAnalytics);

export default router;

