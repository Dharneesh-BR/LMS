import { z } from "zod";
import { ApiError, asyncHandler } from "../middleware/error.middleware.js";
import { prisma } from "../config/prisma.js";

const profileSchema = z.object({
  department: z.string().trim().min(1, "Department is required").max(100),
  designation: z.string().trim().min(1, "Designation is required").max(100)
});

export const verifyAuth = asyncHandler(async (req, res) => {
  res.json({ user: req.auth.user });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const profile = profileSchema.parse(req.body);
  const firebaseUid = req.auth.firebase?.uid;
  const email = req.auth.user?.email || req.auth.firebase?.email;

  if (!firebaseUid || !email) {
    throw new ApiError(401, "A valid Firebase account is required to save profile details");
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      firebaseUid,
      email,
      name: req.auth.user?.name || email.split("@")[0] || null,
      ...profile
    },
    create: {
      firebaseUid,
      email,
      name: req.auth.user?.name || email.split("@")[0] || null,
      ...profile
    }
  });

  res.json({ user });
});
