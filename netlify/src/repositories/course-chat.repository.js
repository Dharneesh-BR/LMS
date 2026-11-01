import { createHash } from "node:crypto";
import { getFirestore } from "../config/firestore.js";
import { ApiError } from "../middleware/error.middleware.js";

const hash = (parts) => createHash("sha256").update(JSON.stringify(parts)).digest("hex");
export function createCourseChatRepository(database, now = Date.now) {
  const requestRef = (uid, requestId) => database().collection("courseChatRequests").doc(hash([uid, requestId]));
  const budgetRef = (day, uid) => database().collection("courseChatUsage").doc(uid ? hash([day, uid]) : `global-${day}`);
  return {
    async reserve({ uid, requestId, fingerprint, courseId, revision, tokens, userLimit, globalLimit, tokenBudget }) {
      const day = new Date(now()).toISOString().slice(0, 10);
      return database().runTransaction(async (transaction) => {
        const request = requestRef(uid, requestId), global = budgetRef(day), learner = budgetRef(day, uid);
        const [previous, globalSnapshot, userSnapshot] = await Promise.all([transaction.get(request), transaction.get(global), transaction.get(learner)]);
        if (previous.exists) {
          const value = previous.data();
          if (value.fingerprint !== fingerprint || value.courseId !== courseId || value.revision !== revision) throw new ApiError(409, "This request belongs to different course content. Send a new question.");
          if (value.status === "complete" && value.cacheUntil > now()) return { cached: value.response };
          throw new ApiError(409, "This request is already processing or cannot be replayed. Wait, then send a new question.");
        }
        const current = globalSnapshot.exists ? globalSnapshot.data() : { requests: 0, tokens: 0, reserved: 0, costUsd: 0 };
        const user = userSnapshot.exists ? userSnapshot.data() : { requests: 0 };
        if (user.requests >= userLimit) throw new ApiError(429, "Your daily course-assistant question limit has been reached");
        if (current.requests >= globalLimit || current.tokens + current.reserved + tokens > tokenBudget) throw new ApiError(429, "The course assistant has reached its daily usage allowance");
        const expiresAt = new Date(now() + 86400000);
        transaction.set(global, { ...current, requests: current.requests + 1, reserved: current.reserved + tokens, expiresAt: new Date(now() + 2678400000) });
        transaction.set(learner, { requests: user.requests + 1, expiresAt: new Date(now() + 2678400000) });
        transaction.set(request, { uid, day, courseId, revision, fingerprint, reservation: tokens, status: "pending", expiresAt });
        return { remainingQuestions: userLimit - user.requests - 1 };
      });
    },
    async finish(uid, requestId, response, usage) {
      return database().runTransaction(async (transaction) => {
        const request = requestRef(uid, requestId);
        const snapshot = await transaction.get(request);
        if (!snapshot.exists || snapshot.data().status !== "pending") return;
        const value = snapshot.data();
        const global = budgetRef(value.day);
        const globalSnapshot = await transaction.get(global);
        const budget = globalSnapshot.data();
        const tokens = Number.isSafeInteger(usage?.totalTokens) && usage.totalTokens >= 0 ? usage.totalTokens : value.reservation;
        transaction.set(global, { ...budget, reserved: Math.max(0, budget.reserved - value.reservation), tokens: budget.tokens + tokens,
          costUsd: budget.costUsd + (usage?.costUsd || 0) });
        transaction.set(request, { ...value, status: response ? "complete" : "failed", response: response || null,
          usage: usage || null, cacheUntil: now() + 3600000, expiresAt: new Date(now() + 3600000) });
      });
    }
  };
}

export const courseChatStore = createCourseChatRepository(getFirestore);
