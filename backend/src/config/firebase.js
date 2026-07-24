import admin from "firebase-admin";
import { env } from "./env.js";

export function getFirebaseAdmin() {
  if (!admin.apps.length) {
    if (
      env.FIREBASE_PRIVATE_KEY.includes("replace-with-your-firebase-admin-private-key") ||
      env.FIREBASE_CLIENT_EMAIL === "firebase-adminsdk@example.iam.gserviceaccount.com"
    ) {
      throw new Error("Firebase Admin credentials are not configured");
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
      })
    });
  }

  return admin;
}

export const firebaseAdmin = new Proxy(admin, {
  get(_target, property) {
    return getFirebaseAdmin()[property];
  }
});
