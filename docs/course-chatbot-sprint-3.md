# Sprint 3: OpenRouter Course Chat

## Deployment

1. Deploy this code and the updated Sanity Studio. Complete the [Sprint 2 setup](./course-chatbot-sprint-2.md): Firebase Admin credentials, signed indexing webhook, approved documents, and index exemptions.
2. Add these server-only variables privately in Netlify, available to production Functions:

   ```dotenv
   OPENROUTER_API_KEY=<your private OpenRouter key>
   OPENROUTER_MODEL=openai/gpt-4o
   COURSE_CHAT_ENABLED=false
   ```

3. Configure a stakeholder-approved spending limit on the OpenRouter key/account. Never use a `NEXT_PUBLIC_` prefix for this key, commit it, upload it to Sanity, or paste it into chat.
4. Deploy the Firestore index configuration, including usage/cache TTL fields:

   ```powershell
   firebase deploy --only firestore:indexes --project learning-management-syst-adcba
   ```

   Keep the deny-all browser rules; Functions use Firebase Admin credentials. TTL deletion is asynchronous.
5. Enable and publish the pilot course chatbot in Sanity. Wait until its documents report `ready`. Only upload approved non-sensitive course-wide documents, never answer keys; Sanity's ordinary file CDN is not confidential storage.
6. Set `COURSE_CHAT_ENABLED=true`, redeploy Netlify, and test as an authorized learner before wider rollout.

Add the API key before the first live AI test. Local mocked tests do not need it. The panel is hidden when configuration or the course toggle is disabled; questions are unavailable while indexing is not ready.

## Learner Flow

The signed-in learner opens the assistant on a course or lesson page. The function verifies access and searches only that course's current published document index. It sends up to three bounded passages and a short conversation window to OpenRouter using the selected model and strict JSON output. Source IDs and quoted excerpts are checked against the passages before returning plain text and document links. Missing support or invalid citations produces an insufficient-information response.

Retrieval is keyword-based, not semantic. Citation validation does not prove factual correctness: reviewed pilot questions and stakeholder acceptance remain necessary. Answer-key request filtering is not a substitute for excluding sensitive content from documents.

The panel does not change video playback, seek restrictions, progress, assessments, or certificates. Clearing or changing courses clears the local conversation. Errors restore the question for manual resubmission. There are no automatic paid retries or automatic model fallbacks.

## Limits

Optional server-only settings:

| Variable | Default | Scope |
| --- | --- | --- |
| `COURSE_CHAT_USER_DAILY_LIMIT` | `20` | Generated requests per learner per UTC day |
| `COURSE_CHAT_GLOBAL_DAILY_LIMIT` | `100` | Generated requests globally per UTC day |
| `COURSE_CHAT_DAILY_TOKEN_BUDGET` | `200000` | Conservative global daily token allowance |
| `COURSE_CHAT_MAX_OUTPUT_TOKENS` | `600` | Output tokens per provider call |

Firestore transactions reserve allowance before generation. Identical request IDs/payloads can return a cached answer without another generation; conflicting reuse is rejected. Empty retrieval does not invoke the provider. Sprint 2's separate 100-search-per-user daily quota also applies.

Input reservation uses a conservative byte estimate, not an exact model tokenizer. Known usage settles reservations; unknown usage consumes the full reservation. Cost records include only provider-reported cost; zero recorded cost does not establish that a request was free. These controls are not a dollar spending cap. Use OpenRouter spending controls and monitor provider, Firestore, and Netlify usage separately.

Provider calls time out after 18 seconds. A client timeout or closing the panel does not prove that generation was cancelled or uncharged.

## Privacy and Acceptance

Questions, bounded history, and retrieved excerpts go to OpenRouter and its upstream provider. Review their data-handling terms before enabling production use.

Full conversation history stays in component memory, not persistent browser storage or a conversation database. Firestore stores duplicate-protection metadata and short-lived answers, which may reflect the question. Completed/failed requests expire after one hour, pending requests after 24 hours, and daily usage after 31 days. Logical cache expiry is enforced in code; physical TTL deletion is asynchronous. Clearing the panel does not delete server metadata or provider records.

Automated tests use mocked OpenRouter responses, including authenticated routes, access/revision checks, citations, quotas, duplicate requests, and provider errors. Desktop/mobile browser checks cover panel behavior and keeping the video mounted. Live GPT-4o behavior, production credentials, indexing, and billing still require deployment acceptance testing.
