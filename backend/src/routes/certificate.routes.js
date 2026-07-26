import { Router } from "express";
import {
  createCertificate,
  downloadCertificate,
  getEligibility,
  getMyCertificates,
  getShareImage,
  getSharePage,
  getVerification,
  recordLinkedInShare
} from "../controllers/certificate.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/certificates", requireAuth, getMyCertificates);
router.get("/certificates/verify/:certificateNumber", getVerification);
router.get("/certificates/share/:certificateNumber", getSharePage);
router.get("/certificates/:certificateNumber/image.png", getShareImage);
router.get("/certificates/eligibility/:courseId", requireAuth, getEligibility);
router.post("/certificates/:courseId/issue", requireAuth, createCertificate);
router.post(
  "/certificates/:certificateNumber/linkedin-share",
  requireAuth,
  recordLinkedInShare
);
router.get("/certificates/:certificateNumber/pdf", requireAuth, downloadCertificate);

export default router;
