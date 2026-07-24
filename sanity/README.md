# Magnafic Course Studio

Sanity Studio for Magnafic Academy pre-recorded courses.

## Demo Content

`demo-content.json` contains:

- 4 demo courses
- 8 modules
- 18 Vimeo-backed lessons
- 1 free course for enrollment and learner-flow testing

Seed the configured Sanity project with:

```bash
npm run seed:demo
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
