import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  type Auth,
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signOut,
  updatePassword
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId &&
  firebaseConfig.apiKey !== "your-api-key" &&
  firebaseConfig.projectId !== "your-firebase-project-id"
);

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

function assertFirebaseConfig() {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* environment variables.");
  }
}

export function getFirebaseApp() {
  if (typeof window === "undefined") return null;
  assertFirebaseConfig();

  if (!firebaseApp) {
    firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  }

  return firebaseApp;
}

export function getFirebaseAuth() {
  if (typeof window === "undefined") return null;
  if (!firebaseAuth) {
    const app = getFirebaseApp();
    firebaseAuth = app ? getAuth(app) : null;
  }

  return firebaseAuth;
}

function requireFirebaseAuth() {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new Error("Firebase Auth is only available in the browser.");
  }

  return auth;
}

function getGoogleProvider() {
  if (!googleProvider) {
    googleProvider = new GoogleAuthProvider();
  }

  return googleProvider;
}

export const analyticsPromise =
  typeof window === "undefined" || !isFirebaseConfigured
    ? Promise.resolve(null)
    : isSupported().then((supported) => {
        const app = getFirebaseApp();
        return supported && app ? getAnalytics(app) : null;
      });

export const loginWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(requireFirebaseAuth(), email, password);

export const signupWithEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(requireFirebaseAuth(), email, password);

export const loginWithGoogle = () => signInWithPopup(requireFirebaseAuth(), getGoogleProvider());
export const logout = () => signOut(requireFirebaseAuth());

export const sendPasswordReset = (email: string) => sendPasswordResetEmail(requireFirebaseAuth(), email);

export async function changeCurrentUserPassword(currentPassword: string, newPassword: string) {
  const auth = requireFirebaseAuth();
  const user = auth.currentUser;
  const email = user?.email;

  if (!user || !email) {
    throw new Error("Please login again before changing your password.");
  }

  const usesPasswordLogin = user.providerData.some((provider) => provider.providerId === "password");
  if (!usesPasswordLogin) {
    throw new Error("This account uses Google sign-in. Use your Google account settings to change the password.");
  }

  const credential = EmailAuthProvider.credential(email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}
