import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import courseRoutes from "./routes/course.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import progressRoutes from "./routes/progress.routes.js";
import assessmentRoutes from "./routes/assessment.routes.js";
import certificateRoutes from "./routes/certificate.routes.js";

const app = express();
const allowedOrigins = new Set([
  env.FRONTEND_URL,
  ...env.FRONTEND_URLS.split(",").map((origin) => origin.trim()).filter(Boolean)
]);

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.has(origin));
  },
  credentials: true
}));
app.use(express.json({ limit: "1mb" }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api", adminRoutes);
app.use("/api", courseRoutes);
app.use("/api", dashboardRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/assessments", assessmentRoutes);
app.use("/api", certificateRoutes);
app.use(errorHandler);

export default app;
