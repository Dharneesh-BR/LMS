# Course Chatbot Delivery

## Sprint 1: Document Foundation (Implemented)

- Sanity Course > Course Chatbot: enable toggle and titled PDF/TXT/Markdown uploads.
- Maximum 10 documents per course, maximum 10 MB per file. Server validates metadata; parser-level validation belongs to Sprint 2.
- Existing courses default to disabled; no migration or seed overwrite is required.
- Authenticated `GET /api/chat/course/:courseId/status` uses the existing department/designation access checks.
- Returns `disabled`, `needs_documents`, or `awaiting_index`, with a revision fingerprint and document metadata. It does not claim documents have been processed.
- Draft courses are excluded. Documents are not added to existing public course API projections.
- Sprint 1 alone does not perform AI calls, document downloads, indexing jobs, database writes, or provide a learner chat panel. Sprint 2 below adds indexing/search.
- No new environment variables are needed for this sprint.

To try after deploying Studio and Functions: open a course in Sanity, expand Course Chatbot, add an approved document with a title, enable, and publish. Before indexing completes, the status endpoint reports `awaiting_index`. Sprint 2 adds Studio status mirroring and the processing worker; follow its deployment setup before expecting `ready`.

## Sprint 2: Processing and Search (Implemented; Deployment Setup Required)

- Uses a bounded keyword index in Firestore, not paid embeddings or semantic search. AI credentials are not required for this approach. OpenRouter is selected for generated answers in Sprint 3.
- Signed publish webhooks invoke an idempotent Netlify background processor; no parsing in learner requests.
- Downloads only constructed Sanity CDN URLs, rejecting redirects, oversized/changed files, invalid UTF-8, binary text, and invalid PDFs.
- PDF parsing uses `unpdf` in an isolated worker, with a 20-second parse timeout, 128 MB V8 heap limit, and 100-page maximum. OCR is not included.
- Stores at most 250 overlapping chunks / 450 KB serialized index per course, atomically replacing the previous index. Each chunk has document ID, title, page, character offset, and stable chunk ID.
- Firestore tracks processing/ready/failed state. An optional server-only Sanity editor token mirrors status into Studio's read-only status fields.
- Each search rechecks the latest published course and revision. Removed, disabled, deleted, stale, and draft content cannot be served through the search endpoint.
- Atomic quota: 100 searches per Firebase user per UTC day, across all courses. Firestore reads/writes and Netlify background work still incur usage; this is not unlimited free hosting.
- See [Sprint 2 Setup](./course-chatbot-sprint-2.md) for required webhook, credentials, indexes, and acceptance checks.

## Sprint 3: Chat and Usage Controls (Implemented; Activation Required)

- Netlify chat endpoint checks login, course access, enablement, and index readiness on every request.
- Use OpenRouter for answer generation; choose a specific model and budget before enabling calls. Do not use an automatic paid fallback without approval.
- Retrieve only the current course's approved course-wide documents. Do not include assessment keys or arbitrary web content.
- Generate answers with validated source references, treating documents as untrusted content rather than instructions.
- Show an honest insufficient-information answer when supporting material is absent.
- Add reusable course/lesson chat panel, error/retry states, and isolated conversations.
- Keep provider secrets server-side; implement atomic learner quotas, bounded context/output, usage logging, and spending controls.
- Define chat retention/deletion before storing conversations. Do not modify playback, progress, assessment, or certificate actions.
- Selected model: `openai/gpt-4o`. See [Sprint 3 Setup](./course-chatbot-sprint-3.md) for activation, credentials, limits, privacy, and live acceptance checks.

## Sprint 4: Acceptance and Handover (Local Coverage Implemented; Live Sign-Off Pending)

- Test document replacement/removal, stale indexing jobs, course isolation, unauthorized access, answer-key leakage, prompt injection, quotas, retries, citations, and mobile layout.
- Run stakeholder acceptance questions against a reviewed pilot course before wider rollout.
- Document upload workflow, processing failures, billing ownership, account ownership, and credential rotation.
- Follow the [Sprint 4 Handover](./course-chatbot-sprint-4.md) for configuration checks, the live acceptance record, incident recovery, and ownership sign-off. Mocked tests do not complete production acceptance.

## Content Privacy

The existing public Sanity dataset and ordinary file CDN are not confidential document storage. Protecting the application endpoint does not make uploaded file URLs private. Upload only approved, non-sensitive course-wide resources; exclude personal data and answer keys. Confidential or lesson-restricted material requires a separate storage/access design before use.

## Still Needed

Sprint 2 needs the webhook secret, existing Firebase Admin access, approved sample documents, and a Sanity editor token for Studio status mirroring. Sprint 3 needs a stakeholder-owned OpenRouter account, private credentials in Netlify, and an approved spending limit. Do not paste API keys into chat or commit them to Git. Mocked verification does not establish that production indexing or live AI answering is configured.
