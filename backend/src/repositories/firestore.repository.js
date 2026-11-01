import { createHash } from "node:crypto";
import { ApiError } from "../middleware/error.middleware.js";

const models = {
  user: { collection: "users", keys: ["firebaseUid"], defaults: { name: null, companyName: null, phoneNumber: null, department: null, designation: null, role: "STUDENT" }, created: "createdAt", updated: true },
  course: { collection: "courses", keys: ["sanityId"], created: "createdAt", updated: true },
  progress: { collection: "progress", keys: ["userId", "courseId", "lessonId"], defaults: { watchedSeconds: 0, durationSeconds: 0, completed: false, contentCompleted: false }, updated: true },
  enrollment: { collection: "enrollments", keys: ["userId", "courseId"], defaults: { paymentStatus: "PENDING" }, created: "createdAt", updated: true },
  assessmentAttempt: { collection: "assessmentAttempts", created: "createdAt" },
  courseCompletion: { collection: "courseCompletions", keys: ["userId", "courseId"], created: "completedAt" },
  certificate: { collection: "certificates", keys: ["userId", "courseId"], defaults: { linkedinSharedAt: null }, created: "issuedAt" },
  order: { collection: "orders", defaults: { status: "CREATED", razorpayPaymentId: null }, created: "createdAt", updated: true }
};

export function compoundId(values) {
  return createHash("sha256").update(JSON.stringify(values)).digest("hex");
}

function fields(where = {}) {
  return Object.fromEntries(Object.entries(where).flatMap(([key, value]) =>
    key === "userId_courseId" || key === "userId_courseId_lessonId"
      ? Object.entries(value)
      : [[key, value]]
  ));
}

function documentId(model, data) {
  if (data.id) return data.id;
  const keys = models[model].keys;
  if (!keys?.every((key) => typeof data[key] === "string" && data[key])) return null;
  return keys.length === 1 ? data[keys[0]] : compoundId(keys.map((key) => data[key]));
}

export function normalizeDocument(value) {
  if (value?.toDate instanceof Function) return value.toDate();
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(normalizeDocument);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, normalizeDocument(entry)]));
  }
  return value;
}

function clean(value) {
  if (Array.isArray(value)) return value.map((entry) => entry === undefined ? null : clean(entry));
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined).map(([key, entry]) => [key, clean(entry)]));
  }
  return value;
}

function matches(row, where) {
  return Object.entries(where).every(([key, value]) => {
    if (value && typeof value === "object" && !(value instanceof Date)) {
      if (Array.isArray(value.in)) return value.in.includes(row[key]);
      throw new Error(`Unsupported Firestore filter: ${key}`);
    }
    return row[key] === value;
  });
}

// Keep the existing API's query shapes, with explicitly supported document relations.
export function createFirestoreRepository(getDatabase) {
  const repository = {};
  const fromSnapshot = (snapshot) => snapshot.exists
    ? { ...normalizeDocument(snapshot.data()), id: snapshot.id }
    : null;

  async function related(model, row, key, options) {
    if (key === "user") return repository.user.findUnique({ where: { id: row.userId }, ...options });
    if (key === "course") return repository.course.findUnique({ where: { id: row.courseId }, ...options });
    if (model === "courseCompletion" && key === "certificate") {
      return repository.certificate.findUnique({ where: { userId_courseId: { userId: row.userId, courseId: row.courseId } }, ...options });
    }
    const children = { progress: "progress", courseCompletions: "courseCompletion", certificates: "certificate", assessmentAttempts: "assessmentAttempt", enrollments: "enrollment", orders: "order" };
    if ((model === "user" || model === "course") && children[key]) {
      return repository[children[key]].findMany({ ...options, where: { [model === "user" ? "userId" : "courseId"]: row.id } });
    }
    throw new Error(`Unsupported Firestore relation: ${model}.${key}`);
  }

  async function project(model, row, options = {}) {
    if (!row) return null;
    const result = options.select ? {} : { ...row };
    const relations = new Set(["user", "course", "certificate", "progress", "courseCompletions", "certificates", "assessmentAttempts", "enrollments", "orders"]);
    for (const [key, selection] of Object.entries(options.select || options.include || {})) {
      if (!selection) continue;
      result[key] = relations.has(key)
        ? await related(model, row, key, selection === true ? {} : selection)
        : row[key] ?? null;
    }
    return result;
  }

  for (const [model, definition] of Object.entries(models)) {
    const collection = () => getDatabase().collection(definition.collection);
    async function readMany(options = {}) {
      const where = fields(options.where);
      if (Object.values(where).some((value) => Array.isArray(value?.in) && !value.in.length)) return [];
      const id = documentId(model, where);
      let rows;
      if (id) {
        const row = fromSnapshot(await collection().doc(id).get());
        rows = row ? [row] : [];
      } else {
        // One indexed equality narrows each learner query without composite indexes.
        // Remaining filters and ordering apply to that learner's result set.
        const equality = Object.entries(where).sort(([left], [right]) =>
          (left === "userId" ? -1 : 0) - (right === "userId" ? -1 : 0)
        ).find(([key, value]) =>
          key !== "id" && value !== undefined && (value === null || typeof value !== "object")
        );
        const query = equality ? collection().where(equality[0], "==", equality[1]) : collection();
        rows = (await query.get()).docs.map(fromSnapshot);
      }
      rows = rows.filter((row) => matches(row, where));
      const ordering = Array.isArray(options.orderBy) ? options.orderBy : options.orderBy ? [options.orderBy] : [];
      rows.sort((left, right) => {
        for (const order of ordering) {
          for (const [key, direction] of Object.entries(order)) {
            const a = left[key], b = right[key];
            const comparison = a < b ? -1 : a > b ? 1 : 0;
            if (comparison) return direction === "desc" ? -comparison : comparison;
          }
        }
        return 0;
      });
      return options.take === undefined ? rows : rows.slice(0, options.take);
    }

    async function write({ where, data, create, update, ...options }, operation) {
      const lookup = fields(where);
      const input = clean(data || create || {});
      const id = documentId(model, { ...input, ...lookup });
      if (!id && operation !== "create") throw new Error(`A document key is required for ${model}.${operation}`);
      const ref = id ? collection().doc(id) : collection().doc();
      const row = await getDatabase().runTransaction(async (transaction) => {
        const previous = fromSnapshot(await transaction.get(ref));
        if (operation === "update" && !previous) throw new Error(`${model} not found`);
        if (operation === "create" && previous) {
          if (model === "certificate") return previous;
          throw new Error(`${model} already exists`);
        }
        const changes = clean(previous ? update || data || {} : input);
        if (model === "progress" && previous) {
          changes.completed = previous.completed || changes.completed || false;
          changes.contentCompleted = previous.contentCompleted || changes.contentCompleted || false;
          changes.watchedSeconds = Math.max(previous.watchedSeconds || 0, changes.watchedSeconds || 0);
          changes.durationSeconds = Math.max(previous.durationSeconds || 0, changes.durationSeconds || 0);
        }
        if (previous && Object.entries(changes).every(([key, value]) => JSON.stringify(previous[key]) === JSON.stringify(value))) return previous;
        const now = new Date();
        const next = {
          ...(previous || definition.defaults || {}),
          ...changes,
          ...(!previous && definition.created ? { [definition.created]: now } : {}),
          ...(definition.updated ? { updatedAt: now } : {})
        };
        // Certificate numbers must remain unique even during concurrent issuance.
        if (model === "certificate" && !previous) {
          const numberRef = getDatabase().collection("certificateNumbers").doc(compoundId([next.certificateNumber]));
          if ((await transaction.get(numberRef)).exists) throw new Error("Certificate number already exists");
          transaction.set(numberRef, { certificateId: ref.id });
        }
        transaction.set(ref, next);
        return { ...next, id: ref.id };
      });
      return project(model, row, options);
    }

    repository[model] = {
      async findMany(options = {}) {
        return Promise.all((await readMany(options)).map((row) => project(model, row, options)));
      },
      async findUnique(options) { return project(model, (await readMany({ ...options, take: 1 }))[0], options); },
      async findFirst(options) { return this.findUnique(options); },
      async count(options = {}) { return (await readMany(options)).length; },
      async upsert(options) { return write(options, "upsert"); },
      async create(options) { return write(options, "create"); },
      async update(options) { return write(options, "update"); }
    };
  }

  repository.recordAssessmentAttempt = async (data, maxAttempts) => {
    const database = getDatabase();
    const counterRef = database.collection("assessmentCounters").doc(compoundId([data.userId, data.courseId, data.assessmentId]));
    const attemptRef = database.collection("assessmentAttempts").doc();
    return database.runTransaction(async (transaction) => {
      const counter = await transaction.get(counterRef);
      const attemptsUsed = counter.exists ? counter.data().count : 0;
      if (maxAttempts && attemptsUsed >= maxAttempts) throw new ApiError(409, "No assessment attempts remain");
      const attempt = { ...clean(data), attemptNumber: attemptsUsed + 1, createdAt: new Date() };
      transaction.set(counterRef, { userId: data.userId, courseId: data.courseId, assessmentId: data.assessmentId, count: attempt.attemptNumber });
      transaction.set(attemptRef, attempt);
      return { ...attempt, id: attemptRef.id };
    });
  };
  return repository;
}
