# Local Project Audit (2026-11-01)

## Changes

- Kept the standalone backend removed; retained the API implementation under Netlify Functions.
- Deduplicated concurrent profile verification for the same Firebase user.
- Prevented a delayed verification for a previous account from replacing the current profile.
- Protected pages now require a verified API profile as well as a Firebase session.
- Login no longer redirects on verification failure or verifies again in its redirect effect.
- Login submission always clears its busy state, including validation failures.
- Public token verification requires numeric expiration/issue times and uses the signed subject as the UID.
- Added the missing public certificate verification page used by certificate links and QR codes.

## Verification

- Frontend component tests include account-switch/deduplication and Vimeo playback regressions.
- Function tests cover cold starts under Lambda's CommonJS/ESM restriction, UID profile creation, progress persistence, lesson unlocking, access isolation, assessments, and certificates.
- These tests use mock Firestore and generated signing keys, not production credentials.
- Production frontend and Sanity builds are checked separately from authenticated production behavior.

## Remaining Risks / Deployment Checks

- A local build cannot establish that production Firebase Admin credentials are present, valid, and authorized. Test sign-in and profile creation after deployment; retain sanitized function errors if they fail.
- `npm audit --omit=dev` still reports high/critical frontend dependencies, including Next.js 14. A framework major-version migration and deployment regression test remain necessary. Do not interpret passing builds as security clearance.
- Browser forward seeking remains blocked and tested. Client-reported completion events are not cryptographic proof of watch time against a deliberately modified client.
- The current frontend lesson model does not expose all assessment/document capabilities implemented by the function API. Content using those capabilities needs end-to-end UI verification before publication.
- Certificate verification is public by design and exposes recipient name, course title, certificate number, and issue date, but not the learner email.
- Firestore rules must remain deny-by-default for this server-only database architecture. Server access uses Firebase Admin IAM, not browser security rules.
