# Netlify and Firestore Setup

## Architecture

The existing Express routes run in `backend/netlify/functions/api.mjs` using
serverless-http. `backend/src/server.js` remains for local development. The frontend
uses its own origin for production API requests unless explicitly overridden.

Firebase Authentication is unchanged. Missing profiles are created at login using
the verified Firebase UID. Firestore replaces PostgreSQL; no SQL data is imported,
backed up, deleted, or accessed. Historical files in `backend/prisma` are unused.
Sanity and Vimeo content remain unchanged.

## Firebase Setup

Create the `(default)` Firestore Standard database in the same project as Auth.
Keep existing Authentication accounts. Publish the root `firestore.rules` through
the console, or deploy rules and indexes from the repository root:

```powershell
npx firebase-tools deploy --only firestore:rules,firestore:indexes --project YOUR_PROJECT_ID
```

Rules deny all direct browser access. Admin SDK requests use IAM and bypass rules;
the API still enforces identity, roles, and course access. Add your website and
Netlify domains to Authentication's Authorized domains. Enable your sign-in methods.

## Netlify Build

Keep the full repository connected. The root `netlify.toml` defines:

| Setting | Value |
| --- | --- |
| Base | `frontend` |
| Build | `npm ci --prefix ../backend && npm run build` |
| Publish | `.next` |
| Functions | `../backend/netlify/functions` |
| Node | `22` |

Backend dependencies are installed during the build. The Next.js plugin handles
the frontend. `/api/*` and `/health` are rewritten to the API function. Do not add
an SPA catch-all rewrite over these routes. PDF, PNG, and Excel responses use binary
encoding. Deploy a preview before changing the live site.

`NPM_FLAGS=--include=dev` is set in `netlify.toml` so production builds install
TypeScript, Tailwind, and PostCSS even when `NODE_ENV=production` is configured.
Do not omit development dependencies during the frontend build: Next.js 14 needs
TypeScript to read the `@/*` aliases from `tsconfig.json`.

## Environment Variables

Preserve the existing browser Firebase and Sanity variables in Netlify's **Builds**
scope. These include `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`,
`NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, and the configured
`NEXT_PUBLIC_SANITY_*` values. Keep optional Firebase values from your web app config.

Remove old `NEXT_PUBLIC_LMS_API_URL` and `NEXT_PUBLIC_API_URL` values in Netlify to
use the same origin. Redeploy after changing browser variables.

Set these server variables with the **Functions** scope, or all scopes if scope
selection is unavailable on your plan:

```text
NODE_ENV=production
FIREBASE_PROJECT_ID=<same project as browser Auth>
FIREBASE_CLIENT_EMAIL=<client_email from service-account JSON>
FIREBASE_PRIVATE_KEY=<private_key from service-account JSON>
SANITY_PROJECT_ID=<Sanity project ID>
SANITY_DATASET=production
SANITY_API_VERSION=2024-06-01
FRONTEND_URL=https://YOUR_WEBSITE_DOMAIN
CERTIFICATE_PUBLIC_URL=https://YOUR_WEBSITE_DOMAIN
BACKEND_PUBLIC_URL=https://YOUR_WEBSITE_DOMAIN
CORS_ORIGINS=https://YOUR_WEBSITE_DOMAIN,https://YOUR_SITE.netlify.app
```

Obtain Admin credentials in Firebase project settings > Service accounts. A dedicated
service account needs Firestore data permissions; the administrator setup script also
needs Firebase Auth user-management permissions. Actual newlines or literal `\n` are
accepted in the private key. Never commit Admin keys, expose them as `NEXT_PUBLIC_*`,
or paste them into chat.

Set `SANITY_READ_TOKEN` for private datasets. Retain `VIMEO_ACCESS_TOKEN` and
`VIMEO_ALLOWED_DOMAIN` if used by the existing integration. `FRONTEND_URLS` supports
additional frontend URLs. Configure appropriate preview URLs in preview environments.
Remove database variables and any custom Prisma migration build commands.

## Collections and Types

The implementation uses top-level collections for existing API/report relationships,
superseding the earlier proposed nested layout. Collections appear on first write;
do not manually create blank records.

| Collection | Document ID | Fields |
| --- | --- | --- |
| `users` | Firebase UID | `firebaseUid`, `email`, `name`, `companyName`, `phoneNumber`, `department`, `designation`, `role`, `createdAt`, `updatedAt` |
| `courses` | Sanity course ID | `sanityId`, `title`, `price`, `createdAt`, `updatedAt` |
| `progress` | Hash of user/course/lesson IDs | `userId`, `courseId`, `lessonId`, `watchedSeconds`, `durationSeconds`, `contentCompleted`, `completed`, `updatedAt` |
| `enrollments` | Hash of user/course IDs | `userId`, `courseId`, `paymentStatus`, `createdAt`, `updatedAt` |
| `assessmentAttempts` | Auto-generated | `userId`, `courseId`, `assessmentId`, `lessonId`, `type`, `answers`, `score`, `passingPercentage`, `passed`, `attemptNumber`, `createdAt` |
| `courseCompletions` | Hash of user/course IDs | `userId`, `courseId`, `completedAt` |
| `certificates` | Hash of user/course IDs | `certificateNumber`, `userId`, `courseId`, `completionId`, `recipientName`, `completedAt`, `issuedAt`, `linkedinSharedAt`, `templateId`, `templateVersion`, `contentSnapshot` |
| `orders` | Auto-generated | `userId`, `courseId`, `razorpayOrderId`, `razorpayPaymentId`, `status`, `amount`, `createdAt`, `updatedAt` |

IDs/text are strings. Dates are Firestore Timestamps, serialized as ISO strings by
the API. Numeric fields are numbers; completion/pass flags are booleans. `answers`
is a map of question keys to arrays of option IDs. `contentSnapshot` is a map of
certificate text, colors, image URLs, and signatories. Optional profile fields,
final-assessment lesson IDs, and unrecorded sharing dates may be null.

Use uppercase roles `STUDENT` and `ADMIN`, and assessment types `LESSON` and `FINAL`.
Payment statuses are `PENDING`, `PAID`, `FAILED`; order statuses are `CREATED`, `PAID`,
`FAILED`. These values match the existing frontend/API, not the earlier examples.

Internal `assessmentCounters` and `certificateNumbers` collections enforce attempt
limits and unique certificate numbers transactionally. Do not manually edit them or
insert assessment attempts. Counters assume a fresh database.

`courses` stores only reporting/access metadata; content remains in Sanity. Enrollment
and order models preserve reports but add no new checkout flow. Course access retains
the existing department/designation and sequential lesson rules.

Remove or correct only confirmed empty test profiles from the earlier console setup.
Existing documents are not erased automatically. A placeholder matching a real Auth
UID should be removed or correctly populated before testing full profile creation.

## Administrator

Sign in once, open `users/{UID}` in the trusted Firebase console, change that account's
`role` to `ADMIN`, and refresh the website. Public profile updates cannot set roles.

The existing `npm run admin:setup` script is optional. It uses Admin credentials and
`ADMIN_PASSWORD` and creates/updates a Firebase Auth account and its password. It is
unnecessary when promoting an existing account manually.

## Verification

1. Request `/health` on the preview: expect `{ "ok": true }`. This checks routing,
   not Firestore connectivity.
2. Sign in and verify `users/{UID}` with Timestamp fields. Sign in again and confirm
   the same profile, original creation date, and any assigned admin role persist.
3. Save department/designation and open a matching Sanity course.
4. Watch normally, reload, and confirm resume progress. Verify forward-seeking is
   still blocked. Finish a lesson and confirm next-lesson access survives reload.
5. Test lesson/final assessments, attempt limits, course completion, and certificates.
6. Check public verification, share images, PDF downloads, admin analytics, and Excel
   exports. Ensure binary downloads are intact.
7. Confirm learners cannot access administrator routes or other learners' records.
8. Publish the verified site, then disable Railway if no other app uses the service.

Run `npm test` in `backend` and `npm run build` in `frontend`. Repository tests use
a transactional in-memory test double, so Firebase IAM/credentials and Netlify's
Linux/native modules need preview verification. Java is required for the official
Firestore emulator if you choose to run it locally.

Free quotas still apply. The video player's existing save cadence is retained;
five-second saves are approximately 720 writes per viewing hour before other work.
Reports read collections and related records and can consume substantial read quota.
This migration does not guarantee unlimited free hosting.
