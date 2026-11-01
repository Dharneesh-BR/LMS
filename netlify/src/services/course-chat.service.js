import { createHash } from "node:crypto";
import { z } from "zod";
import { env } from "../config/env.js";
import { ApiError } from "../middleware/error.middleware.js";
import { courseChatStore } from "../repositories/course-chat.repository.js";
import { searchCourseKnowledge, getCourseKnowledgeStatus } from "./course-knowledge.service.js";
import { callOpenRouter, isCourseChatConfigured, courseChatInstructions } from "./openrouter.service.js";

const inputSchema = z.object({ question: z.string().trim().min(2).max(500), requestId: z.string().uuid(),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(1000) }).strict()).max(4).default([])
}).strict();
const fallback = { answer: "The course documents do not contain enough information to answer this question. Try asking about a specific course topic.", sources: [], insufficient: true };
const normalize = (text) => text.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();

export function verifyGroundedAnswer(result, passages) {
  if (result.insufficient) return { ...fallback };
  if (!result.citations.length || /https?:\/\/|<\/?[a-z][^>]*>/i.test(result.answer)) return { ...fallback };
  const sources = [];
  for (const citation of result.citations) {
    const passage = passages.find((item) => item.id === citation.sourceId);
    if (!passage || !normalize(passage.text).includes(normalize(citation.quote))) return { ...fallback };
    if (!sources.some((source) => source.id === passage.id)) sources.push({ id: passage.id, title: passage.title,
      page: passage.page, url: passage.sourceUrl, quote: citation.quote });
  }
  return { answer: result.answer, sources, insufficient: false };
}

export function createCourseChat({ config = env, retrieve = searchCourseKnowledge, status = getCourseKnowledgeStatus,
  store = courseChatStore, generate = callOpenRouter } = {}) {
  return async (courseId, user, body) => {
    const input = inputSchema.parse(body);
    if (!isCourseChatConfigured(config)) throw new ApiError(503, "Course assistant is not configured yet");
    const previousQuestion = [...input.history].reverse().find((message) => message.role === "user")?.content || "";
    const query = `${input.question} ${previousQuestion}`.slice(0, 500);
    const knowledge = await retrieve(courseId, user, query);
    if (/\b(answer key|correct (answer|option)|answers? (to|for) (the )?(quiz|assessment|test))\b/i.test(input.question)) {
      return { answer: "I can explain course concepts, but I cannot provide assessment answer keys or choose quiz answers.", sources: [], insufficient: true };
    }
    if (!knowledge.matches.length) return { ...fallback };
    const passages = knowledge.matches.slice(0, 3).map((item) => ({ ...item, text: item.text.slice(0, 1200) }));
    const history = [...input.history];
    const content = () => JSON.stringify({ question: input.question, history, passages: passages.map(({ id, text, title }) => ({ sourceId: id, title, text })) });
    while (Buffer.byteLength(content()) > 10000 && history.length) history.shift();
    while (Buffer.byteLength(content()) > 10000 && passages.length > 1) passages.pop();
    if (Buffer.byteLength(content()) > 10000) throw new ApiError(400, "Question context is too large. Start a new conversation.");
    const messages = [{ role: "system", content: courseChatInstructions }, { role: "user", content: content() }];
    // Conservative byte-based reservation, not an exact model tokenizer or a dollar cap.
    const tokens = Buffer.byteLength(JSON.stringify(messages)) + 1024 + config.COURSE_CHAT_MAX_OUTPUT_TOKENS;
    const fingerprint = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    const reserved = await store.reserve({ uid: user.id, requestId: input.requestId, fingerprint, courseId: knowledge.courseId, revision: knowledge.revision,
      tokens, userLimit: config.COURSE_CHAT_USER_DAILY_LIMIT, globalLimit: config.COURSE_CHAT_GLOBAL_DAILY_LIMIT, tokenBudget: config.COURSE_CHAT_DAILY_TOKEN_BUDGET });
    if (reserved.cached) return reserved.cached;
    let usage;
    try {
      const generated = await generate(messages, { config });
      usage = generated.usage;
      const current = await status(courseId, user);
      if (current.status !== "ready" || current.revision !== knowledge.revision) throw new ApiError(409, "Course documents changed while answering. Please ask again.");
      const response = { ...verifyGroundedAnswer(generated, passages), remainingQuestions: reserved.remainingQuestions };
      await store.finish(user.id, input.requestId, response, usage);
      return response;
    } catch (error) {
      await store.finish(user.id, input.requestId, null, usage || error.usage);
      throw error;
    }
  };
}

export const answerCourseQuestion = createCourseChat();
