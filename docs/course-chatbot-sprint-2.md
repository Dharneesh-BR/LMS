# Sprint 2: Course Document Processing and Search

## What Is Included

Sanity uploads -> signed publish webhook -> Netlify background processor -> bounded Firestore keyword index -> authenticated course search. No AI generation, learner chat panel, OpenRouter calls, embeddings, or scanned-document OCR yet.

## 1. Set Netlify Environment Variables

Keep the existing Firebase Admin and Sanity project/dataset variables. Add these server-only variables with Functions scope for the intended deploy context:

- `SANITY_KNOWLEDGE_WEBHOOK_SECRET`: a random secret of at least 32 characters. Generate it locally using `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`; store it privately.
- `SANITY_WRITE_TOKEN`: a project editor/API token for the Sanity project. This is only used to patch `chatbot.processing` on published courses. Never prefix it with `NEXT_PUBLIC_` or `SANITY_STUDIO_`. Without it, processing/search can work but Studio will not receive status updates.

No OpenRouter API key is needed in this sprint. Do not expose provider keys or webhook secrets in Studio/browser code. Deploy Functions and Studio after changing configuration. Confirm your Netlify plan supports background functions and monitor usage.

## 2. Deploy Firestore Index Configuration

From the repository root, using an authorized Firebase CLI account:

```powershell
firebase deploy --only firestore:indexes --project learning-management-syst-adcba
```

The exemption prevents large `courseKnowledge.chunks` contents from being individually indexed. Existing deny-all client rules remain unchanged; the server uses Firebase Admin IAM. Optionally configure Firestore TTL for `knowledgeSearchUsage.expiresAt` to remove old quota counters. Do not grant browser write access.

## 3. Configure the Sanity Webhook

In the project's API > Webhooks configuration, create an enabled POST webhook:

- Dataset: the same production dataset as Netlify.
- URL: `https://learn.magnafic.ai/.netlify/functions/course-knowledge-background`.
- Events: create, update, delete. Do not enable draft events.
- Secret: exactly the value of `SANITY_KNOWLEDGE_WEBHOOK_SECRET`.

Filter (including explicit exclusion of status-only writes to prevent processing loops):

```groq
coalesce(after()._type, before()._type) == "course" &&
!(coalesce(after()._id, before()._id) in path("drafts.**")) &&
!(coalesce(after()._id, before()._id) in path("versions.**")) &&
(
  delta::operation() in ["create", "delete"] ||
  delta::changedAny((chatbot.enabled, chatbot.documents, chatbot.reindexRequestedAt))
)
```

Projection:

```groq
{
  "courseId": coalesce(after()._id, before()._id),
  "projectId": sanity::projectId(),
  "dataset": sanity::dataset(),
  "sourceChanged": delta::operation() in ["create", "delete"] ||
    delta::changedAny((chatbot.enabled, chatbot.documents, chatbot.reindexRequestedAt))
}
```

The worker validates the raw-body signature, timestamp, project, dataset, and published ID. It ignores signed status-only events even if the filter is accidentally broadened. Netlify immediately acknowledges background invocations with HTTP 202; this does **not** prove processing succeeded. Check Studio status, the status API, or the function log.

## 4. Publish a Pilot Course

1. Add a titled, approved searchable PDF, UTF-8 TXT, or Markdown file under Course Chatbot.
2. Enable the chatbot and publish.
3. Wait for Document Processing Status to show `ready`. Reload Studio if the status panel has not refreshed.
4. On failure, fix the document, click Request document reprocessing, then publish. Republishing unchanged content alone does not trigger the selective webhook.

Limits: 10 files, 10 MB/file, 100 pages/PDF, 250 chunks and 450 KB serialized index/course. A text-heavy course can hit the index limit even when file sizes are allowed. These are deliberate pilot bounds, not a scalable semantic-search system. Split long materials or plan a larger retrieval service before increasing limits. Image-only/scanned PDFs need OCR outside this pipeline.

## 5. Test Authenticated Search

Existing API routes:

- `GET /api/chat/course/:courseId/status`
- `POST /api/chat/course/:courseId/search` with JSON `{"question":"distributor coverage"}`

Use a Firebase bearer ID token belonging to an assigned learner or LMS administrator. The API accepts the canonical course ID or slug, then scopes retrieval to the canonical ID. Responses contain up to five passages with document title, page, character offset, and source URL. No relevant keywords -> `matches: []`; it does not fabricate an answer.

Disabled/missing/unprocessed/currently changed content -> HTTP 409. Wrong audience -> 403. No authentication -> 401. Invalid question -> 400. Over 100 searches/user/day -> 429. Conversation, token, and AI spending controls belong to Sprint 3.

## Storage and Lifecycle

- `courseKnowledge/{canonicalCourseId}` stores a bounded index and job state; replacing the index atomically removes previous chunks from that document.
- Claims use short leases and job IDs; an older job cannot overwrite a newer one. Source revision is checked again before activation and on every search.
- Disabling/removing/deleting sources invalidates the stored index when the webhook runs. Even before webhook delivery, search rechecks live published metadata and refuses stale results.
- Full source files remain in Sanity. Indexing does not delete original uploads. Public Sanity files are not confidential storage.

## Acceptance Before Handover

Verify a real production upload reaches `ready`, search returns the expected page, unassigned users are blocked, replacements stop serving old passages immediately, disabled/deleted courses stop serving results, and scanned PDFs show an actionable failure. Verify status-only mirroring does not repeatedly launch indexing. Local tests use a Firestore double and generated PDFs; they do not verify your live IAM, webhook settings, billing plan, or private credentials.

For developers validating a packaged background function: build using the `node_bundler` and `external_node_modules` settings in `netlify.toml`, extract the ZIP, then run `node --no-experimental-require-module netlify/scripts/check-knowledge-bundle.cjs <extracted-directory>/course-knowledge-background.js` from the repository root. The smoke check verifies that `unpdf` is inside the artifact and exercises PDF extraction from the bundled CommonJS code. A bare CLI `functions:build` may not apply the project's external-module configuration; do not treat an unconfigured ZIP as the deployment artifact.

References: [Netlify background functions](https://docs.netlify.com/build/functions/background-functions/), [Sanity webhook filters](https://www.sanity.io/docs/developer-guides/filters-in-groq-powered-webhooks), [Sanity webhook signatures](https://www.sanity.io/docs/content-lake/webhook-best-practices), [unpdf](https://github.com/unjs/unpdf).
