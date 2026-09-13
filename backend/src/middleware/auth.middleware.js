import { prisma } from "../config/prisma.js";
import { firebaseAdmin, hasUsableFirebaseServiceAccount } from "../config/firebase.js";
import { isDesignPreview } from "../config/env.js";
import { ApiError } from "./error.middleware.js";
import { verifyFirebaseIdToken } from "../services/firebase-token.service.js";

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

async function authenticateToken(token) {
  let decoded;
  try {
    decoded = hasUsableFirebaseServiceAccount()
      ? await firebaseAdmin.auth().verifyIdToken(token)
      : await verifyFirebaseIdToken(token);
  } catch (error) {
    console.warn("Firebase token verification failed", error.code || error.message);
    throw new ApiError(401, "Invalid or expired token");
  }

  const email = decoded.email;
  if (!email) {
    throw new ApiError(401, "Firebase account is missing an email");
  }

  const department = typeof decoded.department === "string" ? decoded.department : undefined;
  const designation = typeof decoded.designation === "string" ? decoded.designation : undefined;
  const profileUpdates = {};
  if (department) profileUpdates.department = department;
  if (designation) profileUpdates.designation = designation;

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      firebaseUid: decoded.uid,
      email,
      name: decoded.name || decoded.email?.split("@")[0] || null,
      ...profileUpdates
    },
    create: {
      firebaseUid: decoded.uid,
      email,
      name: decoded.name || decoded.email?.split("@")[0] || null,
      department: department || null,
      designation: designation || null
    }
  });

  return { firebase: decoded, user };
}

export async function requireAuth(req, _res, next) {
  if (isDesignPreview) {
    req.auth = {
      firebase: { uid: "design-preview" },
      user: { id: "design-preview", email: "designer@localhost", name: "Design preview", role: "ADMIN", department: null, designation: null }
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
    next(error);
  }
}

export function requireAdmin(req, _res, next) {
  if (req.auth?.user?.role !== "ADMIN") {
    return next(new ApiError(403, "Admin access required"));
  }

  next();
}
