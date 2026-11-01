import { Router } from "express";
import { downloadReport, getAnalytics } from "../controllers/admin.controller.js";
import { requireAdmin, requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/admin/analytics", requireAuth, requireAdmin, getAnalytics);
router.get("/admin/reports/:type", requireAuth, requireAdmin, downloadReport);

export default router;
