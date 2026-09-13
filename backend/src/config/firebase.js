import admin from "firebase-admin";
import { env } from "./env.js";

export function hasUsableFirebaseServiceAccount() {
  return Boolean(
    env.FIREBASE_CLIENT_EMAIL &&
      env.FIREBASE_PRIVATE_KEY &&
      env.FIREBASE_CLIENT_EMAIL.endsWith(`@${env.FIREBASE_PROJECT_ID}.iam.gserviceaccount.com`) &&
      !env.FIREBASE_PRIVATE_KEY.includes("replace-with-your-firebase-admin-private-key") &&
      env.FIREBASE_CLIENT_EMAIL !== "firebase-adminsdk@example.iam.gserviceaccount.com"
  );
}

export function getFirebaseAdmin() {
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: env.FIREBASE_PROJECT_ID,
      ...(hasUsableFirebaseServiceAccount()
        ? {
            credential: admin.credential.cert({
              projectId: env.FIREBASE_PROJECT_ID,
              clientEmail: env.FIREBASE_CLIENT_EMAIL,
              privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
            })
          }
        : {})
    });
  }

  return admin;
}

export const firebaseAdmin = new Proxy(admin, {
  get(_target, property) {
    return getFirebaseAdmin()[property];
  }
});
