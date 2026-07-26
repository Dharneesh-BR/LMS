# Magnafic Course Studio

Sanity Studio for Magnafic Academy pre-recorded courses.

## Test Content

`demo-content.json` contains:

- 4 test courses
- 8 modules
- 19 video and content-only lessons with summaries
- Lesson assessments using single-choice, multiple-choice, and true/false questions
- A final course assessment
- A reusable certificate template referenced by every test course
- An Ads-style dynamic landing page for every course
- Sequential lesson content for learner-flow testing

The Course schema includes a required hotspot-enabled course image used by both the course
listing card and course detail banner. Existing seeded courses use the frontend brand fallback
until an editor uploads their images.

Each course has a **Course Detail Landing Page** group. Editors can choose section designs for
content and media, rich text, lists, cards, differentiators, accordions, curriculum previews,
timelines, FAQs, outcomes, testimonials, statistics, media galleries, and calls to action. The
public page is `/courses/:courseId`; its Start Course action opens the existing syllabus at
`/programs/courses/:courseId`.

Seed the configured Sanity project with:

```bash
npm run seed:test
```

The fixture uses stable document IDs, so rerunning it replaces the same test documents rather
than creating duplicates. Verify the published graph with:

```bash
npm run verify:test
```

The configured project is `kdugdssj`, dataset `production`.

If Sanity reports `project user not found`, log in with a Sanity account that belongs to project `kdugdssj`, or add the current Sanity CLI user to that project in Sanity Manage, then run the seed command again.

## Hosting

The Studio is configured to deploy to Sanity hosting at:

```text
https://magnafic-course-studio.sanity.studio
```

Deploy with:

```bash
npm run deploy
```

After the first successful deploy, Sanity may print a `deployment.appId`. Add that ID to `sanity.cli.ts` if you want auto-updates pinned to that specific Studio application instead of Sanity's latest runtime channel.
