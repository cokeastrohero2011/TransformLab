# TransformLab

A personal Cambridge IGCSE Mathematics 0580 Extended transformations revision app. React, TypeScript, Vite, Tailwind, shadcn/ui source components, Lucide, Motion, and SVG provide the interface. A single Cloudflare Worker serves the built frontend and API. D1 stores progress, solutions, and uploaded files. No accounts or browser Local Storage are used.

## Local development

1. Install Node.js 20.19+ and npm.
2. Run `npm install`.
3. Run `npm run build` to create the static assets.
4. Run `npx wrangler d1 migrations apply transformlab --local --config wrangler.local.jsonc`.
5. Run `npm run dev:worker` and open `http://localhost:8787`.
6. For Vite hot reload, leave the Worker running, run `npm run dev` in another terminal, and open `http://localhost:5173`.

Vite proxies `/api` to the local Worker. The deployed app is public and does not require sign-in.

Run `npm run check`, `npm test`, and `npm run build` before deploying.

## Cloudflare account setup

These steps create or change your Cloudflare resources; review them before running.

1. Sign into your own Cloudflare account using `npx wrangler login`.
2. This repository's `wrangler.jsonc` is connected to the personal `transformlab` D1 database. If you deploy to a different account, create a D1 database with `npx wrangler d1 create transformlab` and replace `database_id`.
3. Apply migrations: `npx wrangler d1 migrations apply transformlab --remote`.
4. Build and deploy: `npm run deploy`.
5. Open `https://transformlab.cokeastrohero2011.workers.dev`.

The Worker serves the app without authentication. Anyone with the URL can see or change progress and uploaded files, including resetting progress. Mutation routes require a same-origin request and a custom header to reduce accidental cross-origin requests; this is not an access control. The backend alone holds the D1 binding and performs marking. Solutions remain in D1 until submission or an explicit solution request.

## Data and API

`/api/question`, `/api/practice/submit`, `/api/practice/history`, `/api/exams`, `/api/exams/:id/answer`, `/api/exams/:id/complete`, `/api/exams/:id/results`, `/api/progress`, `/api/visualizations`, `/api/files`, and `/api/progress/reset` are Worker routes. Practice and exam answer writes accept an idempotency key. Database trigger updates transformation statistics exactly once on insertion. Progress reset requires the literal confirmation `RESET`.

Migrations live in `migrations/`. Optional uploads are limited to 10 MB images or PDFs and are stored as 512 KB chunks in D1 rows, alongside their metadata. Cloudflare D1 limits individual BLOBs and rows to 2 MB. Structured progress is also in D1. The app uses TanStack Query for server state and refetches after saves.

The sample draw exercise is available through **Draw → Part a/b/c**. Questions are original and generated from the transformation rules in syllabus section E7.1. The attached syllabus PDF stays in the project as the source reference.

Official references: [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/) and [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/).
