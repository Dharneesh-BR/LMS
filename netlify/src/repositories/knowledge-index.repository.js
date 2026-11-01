import { randomUUID, createHash } from "node:crypto";
import { getFirestore } from "../config/firestore.js";
import { ApiError } from "../middleware/error.middleware.js";

export function createKnowledgeIndexRepository(database, now = Date.now) {
  const ref = (id) => database().collection("courseKnowledge").doc(id);
  return {
    async read(id) { const snapshot = await ref(id).get(); return snapshot.exists ? snapshot.data() : null; },
    async claim(id, revision) {
      return database().runTransaction(async (transaction) => {
        const document = ref(id);
        const snapshot = await transaction.get(document);
        const previous = snapshot.exists ? snapshot.data() : null;
        if (previous?.revision === revision && previous.status === "ready") return null;
        if (previous?.revision === revision && previous.status === "processing" && previous.leaseUntil > now()) {
          throw new Error("Knowledge indexing is already processing; retry later");
        }
        const jobId = randomUUID();
        transaction.set(document, { revision, jobId, status: "processing", leaseUntil: now() + 180000, chunks: [], error: null, updatedAt: new Date(now()).toISOString() });
        return jobId;
      });
    },
    async finish(id, jobId, revision, result) {
      return database().runTransaction(async (transaction) => {
        const document = ref(id);
        const snapshot = await transaction.get(document);
        if (!snapshot.exists || snapshot.data().jobId !== jobId || snapshot.data().revision !== revision) return false;
        transaction.set(document, { revision, jobId, leaseUntil: 0, ...result, updatedAt: new Date(now()).toISOString() });
        return true;
      });
    },
    async invalidate(id, status, error = null) {
      return database().runTransaction(async (transaction) => {
        const document = ref(id);
        const snapshot = await transaction.get(document);
        if (snapshot.exists && snapshot.data().status === status && snapshot.data().revision === null && snapshot.data().error === error) return false;
        transaction.set(document, { status, revision: null, jobId: randomUUID(), chunks: [], leaseUntil: 0, error, updatedAt: new Date(now()).toISOString() });
        return true;
      });
    },
    async reserveSearch(uid, limit = 100) {
      const day = new Date(now()).toISOString().slice(0, 10);
      const id = createHash("sha256").update(JSON.stringify([uid, day])).digest("hex");
      const document = database().collection("knowledgeSearchUsage").doc(id);
      return database().runTransaction(async (transaction) => {
        const snapshot = await transaction.get(document);
        const count = snapshot.exists ? snapshot.data().count : 0;
        if (count >= limit) throw new ApiError(429, "Daily course-document search limit reached");
        transaction.set(document, { count: count + 1, day, expiresAt: new Date(now() + 172800000) });
      });
    }
  };
}

export const knowledgeIndex = createKnowledgeIndexRepository(getFirestore);
