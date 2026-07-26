# Magnafic Academy

Full-stack course platform for the Magnafic project, designed for delivering pre-recorded courses with secure learner access and sequential lesson progress.

- Frontend: Next.js App Router + Tailwind CSS
- Backend: Express.js + Prisma + PostgreSQL
- Auth: Firebase Authentication with Firebase Admin JWT verification
- CMS: Sanity for course, module, and lesson content
- Video: Vimeo private embeds stored in Sanity
- Access: Firebase login; platform subscriptions will be added later

## Structure

```text
backend/   Express REST API, Prisma schema, Firebase Admin
frontend/  Next.js App Router, Firebase client auth, protected Magnafic course pages
sanity/    Sanity Studio schemas for courses, modules, lessons
```

## Quick Start

1. Configure environment files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
cp sanity/.env.example sanity/.env
```

2. Install dependencies in each app:

```bash
cd backend && npm install
cd ../frontend && npm install
cd ../sanity && npm install
```

3. Prepare the database:

```bash
cd backend
npx prisma migrate dev --name init
npm run dev
```

4. Start the frontend:

```bash
cd frontend
npm run dev
```

5. Start Sanity Studio:

```bash
cd sanity
npm run dev
```

## Vimeo Security Model

Magnafic admins upload pre-recorded course videos directly to Vimeo. Configure each video as private, disable downloads, and restrict embeds to your production domain in Vimeo. Sanity stores only the Vimeo player URL, for example:

```text
https://player.vimeo.com/video/123456789
```

The backend returns lesson content after Firebase authentication. The first lesson is unlocked, and each following lesson unlocks only after the learner completes every preceding lesson. Vimeo playback URLs are prepared in `backend/src/services/vimeo.service.js`.

## API Overview

- `POST /api/auth/verify`
- `GET /api/courses`
- `GET /api/course/:id`
- `GET /api/progress/:courseId`
- `POST /api/progress/update`
- `GET /api/certificates`
- `GET /api/certificates/eligibility/:courseId`
- `POST /api/certificates/:courseId/issue`
- `POST /api/certificates/:certificateNumber/linkedin-share`
- `GET /api/certificates/:certificateNumber/pdf`
- `GET /api/certificates/verify/:certificateNumber`
- `GET /api/admin/analytics`

## Completion Certificates

Each course can reference a versioned certificate template in Sanity. After all lessons and
the optional final assessment are complete, the learner confirms their certificate name.
The API records the original completion time, snapshots the Sanity certificate content, and
issues one immutable certificate number per learner and course. Generated PDFs include a QR
code linking to the public verification page. Learners must first open the LinkedIn share
flow for that verification URL; the API records the action and only then permits PDF download.

Set `CERTIFICATE_PUBLIC_URL` to the public Magnafic frontend origin in Railway, for example
`https://magnafic.com`. Set `BACKEND_PUBLIC_URL` to the Railway API origin, for example
`https://your-lms-api.up.railway.app`. Railway's `RAILWAY_PUBLIC_DOMAIN` is used automatically
when `BACKEND_PUBLIC_URL` is omitted.

## Frontend Pages

- `/` - public Magnafic course catalog with brand highlights and empty state
- `/login` - Firebase email/password signup, login, and Google login
- `/dashboard` - protected Magnafic learner dashboard with available courses and resume links
- `/courses/[courseId]` - course detail, sequential lesson access, and progress
- `/courses/[courseId]/lessons/[lessonId]` - protected Vimeo player, lesson notes, next/previous navigation, progress update
- `/admin` - protected admin analytics for users with `ADMIN` role

## Next Steps

1. Create `backend/.env` from `backend/.env.example`.
2. Add a Firebase Admin service account to the backend env:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
3. Create a PostgreSQL database in Supabase, Neon, Railway, or locally, then set `DATABASE_URL`.
4. Run Prisma migrations:

```bash
cd backend
npx prisma migrate dev --name init
```

5. Create or connect a Sanity project, then set these in backend and frontend env files:
   - `SANITY_PROJECT_ID=kdugdssj`
   - `SANITY_DATASET`
   - `NEXT_PUBLIC_SANITY_PROJECT_ID=kdugdssj`
   - `NEXT_PUBLIC_SANITY_DATASET`
   - `SANITY_STUDIO_ORGANIZATION_ID=oX29gX2Aa`
6. Start Sanity Studio and create Magnafic Course, Module, and Lesson documents:

```bash
cd sanity
npm run dev
```

7. Upload Magnafic pre-recorded videos directly to Vimeo, set them private, disable downloads, restrict embeds to your domain, and paste the `https://player.vimeo.com/video/{id}` URL into each Sanity lesson.
8. Start the API and frontend:

```bash
cd backend
npm run dev
```

```bash
cd frontend
npm run dev
```

9. Make an admin by updating the user role in PostgreSQL:

```sql
update users set role = 'ADMIN' where email = 'you@example.com';
```

10. Deploy:
   - Frontend to Vercel
   - Backend to Render or Railway
   - PostgreSQL to Supabase or Neon
   - Sanity Studio with `npm run deploy`
