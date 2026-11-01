import { getFirebaseAdmin } from "./firebase.js";

export function getFirestore() {
  return getFirebaseAdmin().firestore();
}
