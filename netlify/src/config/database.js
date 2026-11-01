import { getFirestore } from "./firestore.js";
import { createFirestoreRepository } from "../repositories/firestore.repository.js";

export const db = createFirestoreRepository(getFirestore);
