# Magnafic Academy

LMS with a Next.js frontend, Firebase Authentication, Firestore learner records,
Sanity course content, and Vimeo playback. The Express API runs as a Netlify
Function alongside the frontend, without a separate API host.

## Structure

```text
frontend/                  Next.js and Firebase browser authentication
backend/src/               API routes, business rules, and Firestore repository
backend/netlify/functions/ Netlify API entry point (no listening server)
sanity/                    Course, module, lesson, and assessment content
firebase.json              Firestore rules, indexes, and emulator configuration
```

## Local Development

1. Run `npm ci` in `backend` and `frontend`.
2. Copy each app's `.env.example` to `backend/.env` or `frontend/.env.local` and
   supply Firebase and Sanity settings. Keep Admin credentials server-side.
3. Create the default Firestore Standard database in the Firebase Auth project.
4. Run `npm run dev` in `backend` (port 4000) and `frontend` (port 3000).

The frontend defaults to localhost:4000 in development and its own origin in
production. Explicit API environment variables override those defaults.

## Deployment

Follow [the Netlify and Firestore guide](docs/netlify-firestore.md) for environment
variables, build settings, collection definitions, and verification steps.

Learner records start fresh. This migration does not copy, back up, delete, or
connect to PostgreSQL. Existing Firebase Authentication accounts remain valid;
their Firestore profiles are created on the next authenticated API request.
Historical SQL files in `backend/prisma` are not used at runtime or deployment.

## API

- `POST /api/auth/verify` - verify identity and create/read the profile
- `PUT /api/auth/profile` - update permitted learner profile fields
- `GET /api/courses` and `GET /api/course/:id` - content and lesson access
- `GET /api/progress/:courseId` and `POST /api/progress/update` - saved progress
- `/api/assessments/*` - lesson/final assessments and server-side scoring
- `/api/certificates/*` - issuance, public verification, sharing, and PDFs
- `/api/admin/*` - administrator analytics and Excel reports
- `GET /health` - routing/process health, not Firestore connectivity

## Completion and Certificates

Videos remain in Vimeo; Sanity stores their links. Configure private playback,
disable downloads, and restrict embeds to the website's domains. The existing
player controls and forward-seeking restrictions are retained.

The API checks lesson order and assessment requirements. Firestore transactions
prevent late progress saves from reverting completion. Certificates snapshot the
Sanity template and are issued once per learner/course. PDF downloads retain the
existing requirement to record the LinkedIn share action.

## Verification

Run `npm test` in `backend` and `npm run build` in `frontend`. Repository tests use
a transactional in-memory test double. Live Firebase IAM, credentials, and Netlify
deployment still require the preview checks in the deployment guide.

Sanity Studio retains its existing development and deployment commands.
