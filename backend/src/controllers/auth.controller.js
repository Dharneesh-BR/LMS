import { asyncHandler } from "../middleware/error.middleware.js";

export const verifyAuth = asyncHandler(async (req, res) => {
  res.json({ user: req.auth.user });
});

