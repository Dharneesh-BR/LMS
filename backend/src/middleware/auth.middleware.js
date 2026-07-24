import { prisma } from "../config/prisma.js";
import { firebaseAdmin } from "../config/firebase.js";
import { isDesignPreview } from "../config/env.js";
import { ApiError } from "./error.middleware.js";

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

async function authenticateToken(token) {
  let decoded;
  try {
    decoded = await firebaseAdmin.auth().verifyIdToken(token);
  } catch (error) {
    console.warn("Firebase token verification failed", error.code || error.message);
    throw new ApiError(401, "Invalid or expired token");
  }

  const email = decoded.email;
  if (!email) {
    throw new ApiError(401, "Firebase account is missing an email");
  }

  const user = await prisma.user.upsert({
    where: { firebaseUid: decoded.uid },
    update: {
      email,
      name: decoded.name || decoded.email?.split("@")[0] || null
    },
    create: {
      firebaseUid: decoded.uid,
      email,
      name: decoded.name || decoded.email?.split("@")[0] || null
    }
  });

  return { firebase: decoded, user };
}

export async function requireAuth(req, _res, next) {
  if (isDesignPreview) {
    req.auth = {
      firebase: { uid: "design-preview" },
      user: { id: "design-preview", email: "designer@localhost", name: "Design preview", role: "ADMIN" }
    };
    return next();
  }

  const token = getBearerToken(req);

  if (!token) {
    return next(new ApiError(401, "Missing authorization token"));
  }

  try {
    req.auth = await authenticateToken(token);
    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalAuth(req, _res, next) {
  const token = getBearerToken(req);

  if (!token) {
    return next();
  }

  try {
    req.auth = await authenticateToken(token);
    next();
  } catch (error) {
    if (error.statusCode === 401) {
      return next();
    }
    next(error);
  }
}

export function requireAdmin(req, _res, next) {
  if (req.auth?.user?.role !== "ADMIN") {
    return next(new ApiError(403, "Admin access required"));
  }

  next();
}
