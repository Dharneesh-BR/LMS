import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { getFirebaseApp, hasUsableFirebaseServiceAccount } from "./firebase.js";

export function getFirestore() {
  const serverless = process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY;
  if (serverless && !hasUsableFirebaseServiceAccount()
      && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIRESTORE_EMULATOR_HOST) {
    const error = new Error("Firebase Admin credentials are not configured for this function");
    error.code = "FIREBASE_ADMIN_CREDENTIALS_MISSING";
    throw error;
  }
  return getAdminFirestore(getFirebaseApp());
}
