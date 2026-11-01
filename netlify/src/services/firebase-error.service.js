export function firebaseServiceFailure(error) {
  const code = error.code;
  if (code === "FIREBASE_ADMIN_CREDENTIALS_MISSING") {
    return {
      code,
      message: "Set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY for Netlify Functions, then redeploy."
    };
  }
  if (["app/invalid-credential", "app/invalid-app-options", "auth/invalid-credential"].includes(code)
      || /Could not load the default credentials|Unable to detect a Project Id/i.test(error.message || "")) {
    return {
      code: "FIREBASE_ADMIN_CONFIGURATION_ERROR",
      message: "The server cannot authenticate with Firebase. Check Firebase Admin credentials in Netlify Functions and redeploy."
    };
  }
  if (code === 7 || code === "PERMISSION_DENIED") {
    return {
      code: "FIRESTORE_PERMISSION_DENIED",
      message: "The server was denied access to Firestore. Check the service account permissions and Firebase project configuration."
    };
  }
  if (code === 16 || code === "UNAUTHENTICATED") {
    return {
      code: "FIRESTORE_UNAUTHENTICATED",
      message: "Firestore rejected the server credentials. Check the Firebase Admin service account in Netlify."
    };
  }
  if (code === 5 || code === "NOT_FOUND") {
    return {
      code: "FIRESTORE_RESOURCE_NOT_FOUND",
      message: "A required Firestore resource was not found. Check that the default database exists in the configured Firebase project."
    };
  }
  if (code === 8 || code === "RESOURCE_EXHAUSTED") {
    return { code: "FIRESTORE_QUOTA_EXCEEDED", message: "The learning database has reached a resource limit. Please try again later." };
  }
  if ([4, 14, "DEADLINE_EXCEEDED", "UNAVAILABLE"].includes(code)) {
    return { code: "FIRESTORE_UNAVAILABLE", message: "The learning database is temporarily unavailable. Please try again shortly." };
  }
  return null;
}
