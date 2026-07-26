import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DESIGN_PREVIEW_MODE: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  PORT: z.coerce.number().default(4000),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  FRONTEND_URLS: z.string().default(""),
  CERTIFICATE_PUBLIC_URL: z.string().url().optional(),
  BACKEND_PUBLIC_URL: z.string().url().optional(),
  DATABASE_URL: z.string().min(1),
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().email(),
  FIREBASE_PRIVATE_KEY: z.string().min(1),
  SANITY_PROJECT_ID: z.string().min(1),
  SANITY_DATASET: z.string().default("production"),
  SANITY_API_VERSION: z.string().default("2024-06-01"),
  SANITY_READ_TOKEN: z.string().optional(),
  VIMEO_ACCESS_TOKEN: z.string().optional(),
  VIMEO_ALLOWED_DOMAIN: z.string().optional()
}).superRefine((value, context) => {
  if (value.NODE_ENV === "production" && value.DESIGN_PREVIEW_MODE) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["DESIGN_PREVIEW_MODE"],
      message: "Design preview mode cannot be enabled in production"
    });
  }

  const expectedServiceAccountDomain = `@${value.FIREBASE_PROJECT_ID}.iam.gserviceaccount.com`;
  if (!value.FIREBASE_CLIENT_EMAIL.endsWith(expectedServiceAccountDomain)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["FIREBASE_CLIENT_EMAIL"],
      message: `Firebase service account must belong to ${value.FIREBASE_PROJECT_ID}`
    });
  }
});

export const env = schema.parse(process.env);
export const isDesignPreview = env.NODE_ENV !== "production" && env.DESIGN_PREVIEW_MODE;
