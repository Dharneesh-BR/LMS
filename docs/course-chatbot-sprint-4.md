# Sprint 4: Acceptance and Stakeholder Handover

## Release Status

Local automated acceptance coverage is implemented. Production activation and stakeholder sign-off remain pending until someone with account access completes the checks below. Mocked model tests do not establish live GPT-4o accuracy or resistance to all prompt injection.

## Configuration After Adding the OpenRouter Key

Confirm these server-side settings in Netlify's production Functions environment; do not share their values in screenshots:

| Setting | Requirement |
| --- | --- |
| `OPENROUTER_API_KEY` | Private key with approved spending limit |
| `OPENROUTER_MODEL` | `openai/gpt-4o` |
| `COURSE_CHAT_ENABLED` | `true` only after pilot documents are ready |
| `SANITY_KNOWLEDGE_WEBHOOK_SECRET` | Random secret, at least 32 characters; matches Sanity webhook |
| `SANITY_WRITE_TOKEN` | Server-only editor token for processing status in Studio; optional for indexing itself |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Existing working Firebase Admin credentials |
| `SANITY_PROJECT_ID`, `SANITY_DATASET`, `SANITY_API_VERSION` | Existing project configuration; dataset must match webhook |
| `SANITY_READ_TOKEN` | Required only if the dataset requires authenticated reads |

Keep existing browser Firebase/Sanity configuration. Never expose Admin credentials, provider keys, or webhook secrets through `NEXT_PUBLIC_` variables. No Railway service or PostgreSQL URL is required for course chat.

Optional usage limits have safe defaults; see [Sprint 3](./course-chatbot-sprint-3.md). Publish a new Netlify deployment after environment changes. Deploy Studio separately, configure the signed webhook exactly as in [Sprint 2](./course-chatbot-sprint-2.md), and deploy `firestore.indexes.json`. Verify background-function availability on the site's plan. An accepted webhook request alone does not prove indexing succeeded.

## Content Editor Workflow

1. Open a course in Sanity and expand Course Chatbot.
2. Upload approved searchable PDF, UTF-8 TXT, or Markdown documents with clear titles. Maximum 10 files, 10 MB each, 100 pages per PDF; total index is bounded to 250 chunks / 450 KB.
3. Exclude personal data, confidential documents, and assessment answer keys. Ordinary Sanity file URLs are public; application authentication does not make them private.
4. Enable the assistant, publish, and wait for processing `ready` before learner testing.
5. For revisions, replace/remove the source and publish. Confirm old answers/passages are no longer served.
6. For processing failures, correct the source, select Request document reprocessing, and publish. Scanned PDFs require OCR first. Publishing unchanged content alone does not trigger reprocessing.

## Live Acceptance Record

Record deployment ID/date, canonical course ID, content reviewer, tester, expected page/quote, actual answer/source, and pass/fail for each case. Do not record tokens or secrets. Use a reviewed pilot course and a separate unassigned learner.

| Case | Required result |
| --- | --- |
| Answer explicitly present in a document | Accurate concise answer; citation opens the correct source/page |
| Follow-up about the preceding question | Uses context without treating previous answers as evidence |
| Topic absent from documents | Insufficient-information response, not invented facts |
| Request assessment answer keys | Refusal; no keys exist in indexed documents |
| Question/document says to ignore instructions | Does not reveal secrets, invent citations, or perform actions |
| Wrong department/designation or signed-out user | Access denied; no generated response |
| Switch course/account | Old conversation disappears; citations stay course-scoped |
| Replace/remove document while answering | Stale response refused; only new ready content is available |
| Disable chatbot/delete course | No further course answers; old cached response cannot bypass access |
| Double submission/provider failure | No duplicate generation for the same request ID; useful error, no fake answer |
| Exhaust low test quota | Controlled limit response; no additional provider generation |
| Mobile/desktop | Usable panel, visible send/close controls, no horizontal overflow |
| Video playback and lesson completion | Opening chat preserves playback; forward seeking remains blocked; completion/assessment rules unchanged |

Use a low quota only in an isolated test deployment, not by disrupting production learners. Live tests incur provider/platform usage. Citation matching is not a factual verifier; manually review answers before broad release.

## Operations and Recovery

| Symptom | Check/action |
| --- | --- |
| Assistant missing | Signed-in API user, course audience, course toggle, server enable flag, model/key configuration, latest deployment |
| Awaiting index | Webhook URL/events/filter/signature secret, dataset, background function logs, Firebase Admin permissions |
| Processing failed | Document limits/searchable text, Firestore index exemption, function logs; fix source and request reprocessing |
| Studio status does not update | Server editor token and its write permission; authenticated status API remains authoritative |
| Provider unavailable/verification error | OpenRouter credits/key/model support, provider status, Function logs; do not expose raw provider errors |
| Limit reached | UTC quota window, Firestore usage counters, provider spending limit; investigate before increasing limits |

Emergency stop: set `COURSE_CHAT_ENABLED=false` and redeploy. Disable an individual course's chatbot and publish to stop that course immediately on subsequent access checks. Do not relax Firestore browser rules, remove authentication, or restart the old backend as a workaround.

The app has bounded local-memory history, short-lived response caches, and daily usage metadata, not a durable conversation archive. Review retention and third-party processing details in Sprint 3. Firestore TTL physical deletion is asynchronous. Clearing the chat is not a server/provider deletion request.

## Ownership and Sign-Off

Before handover, assign named stakeholder owners for Netlify deployments, Firebase IAM/Auth/Firestore, Sanity content/webhooks, and OpenRouter billing. Confirm access recovery, billing alerts, spending limits, and who receives operational incidents. Usage on free plans is bounded, not guaranteed unlimited or permanently free.

Rotate credentials through the owning service, update Netlify privately, redeploy, verify the pilot, then revoke old credentials. Coordinate webhook secret changes on both Sanity and Netlify and request reprocessing after rotation. Do not revoke working Firebase credentials before validating replacements.

Release only when the content reviewer and product owner sign the live acceptance record, confirm account/billing ownership, and approve the rollback procedure. Until then Sprint 4's production acceptance remains open.

## Developer Regression Commands

```powershell
npm --prefix netlify run test:lambda
npm --prefix frontend test
npm --prefix frontend run lint
npm --prefix frontend run build
```

Existing tests cover source revisions, removal/disablement, stale jobs, signed webhooks, access controls, citations, context boundaries, quotas, retries, and video completion. Added Sprint 4 tests cover concurrent duplicate generation, cache scope/expiry, UTC quota resets, global caps, and malformed/truncated/refusal provider output. These tests use doubles, not production credentials or paid model calls.
