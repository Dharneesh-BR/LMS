import { z } from "zod";
import { asyncHandler } from "../middleware/error.middleware.js";
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
  const user = await prisma.user.update({
    where: { id: req.auth.user.id },
    data: profile
  });

  res.json({ user });
});
