# TransformLab

A personal Cambridge IGCSE Mathematics 0580 Extended transformations revision app. React, TypeScript, Vite, Tailwind, shadcn/ui source components, Lucide, Motion, and SVG provide the interface. A single Cloudflare Worker serves the built frontend and API. D1 stores progress, solutions, and private files. No custom accounts or browser Local Storage are used.

## Local development

1. Install Node.js 20.19+ and npm.
2. Run `npm install`.
3. Run `npm run build` to create the static assets.
4. Run `npx wrangler d1 migrations apply transformlab --local --config wrangler.local.jsonc`.
5. Run `npm run dev:worker` and open `http://localhost:8787`.
6. For Vite hot reload, leave the Worker running, run `npm run dev` in another terminal, and open `http://localhost:5173`.

Vite proxies `/api` to the local Worker. The development authentication bypass only works when `DEPLOY_ENV=development`, `DEV_AUTH_BYPASS=true`, **and** the Worker request hostname is localhost or 127.0.0.1. The production Wrangler config hard codes `DEPLOY_ENV=production`, so the bypass cannot activate on a deployed hostname.

Run `npm run check`, `npm test`, and `npm run build` before deploying.

## Cloudflare account setup

These steps create or change your Cloudflare resources; review them before running.

1. Sign into your own Cloudflare account using `npx wrangler login`.
2. This repository's `wrangler.jsonc` is connected to the personal `transformlab` D1 database. If you deploy to a different account, create a D1 database with `npx wrangler d1 create transformlab` and replace `database_id`.
3. In Cloudflare Access, protect the Worker (including its `workers.dev` hostname and previews) with an **Allow** policy for only your email address. No custom domain is required. Remove any broader Allow policies. Copy your Access team domain (such as `your-team.cloudflareaccess.com`) and the application's Audience (AUD) tag into `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` in `wrangler.jsonc`; set `ALLOWED_EMAIL` to the same exact email. These values are configuration, not secrets.
4. Apply migrations: `npx wrangler d1 migrations apply transformlab --remote`.
5. Build and deploy: `npm run deploy`.
6. Confirm a request without Access is rejected with HTTP 403, then sign in through Access and use the app. Also verify any `workers.dev` or preview URL is disabled or covered by Access.

The Worker validates the Access JWT against Cloudflare's JWKS, issuer, audience, and exact allowed email. It ignores client supplied email headers. All static assets and API routes pass through this check. Mutation routes require a same-origin request and a custom header. The backend alone holds the D1 binding and performs marking. Solutions remain in D1 until submission or an explicit solution request.

## Data and API

`/api/question`, `/api/practice/submit`, `/api/practice/history`, `/api/exams`, `/api/exams/:id/answer`, `/api/exams/:id/complete`, `/api/exams/:id/results`, `/api/progress`, `/api/visualizations`, `/api/files`, and `/api/progress/reset` are Worker routes. Practice and exam answer writes accept an idempotency key. Database trigger updates transformation statistics exactly once on insertion. Progress reset requires the literal confirmation `RESET`.

Migrations live in `migrations/`. Optional uploads are limited to 10 MB images or PDFs and are stored as 512 KB chunks in private D1 rows, alongside their metadata. Cloudflare D1 limits individual BLOBs and rows to 2 MB. Structured progress is also in D1. The app uses TanStack Query for server state and refetches after saves.

The sample draw exercise is available through **Draw → Part a/b/c**. Questions are original and generated from the transformation rules in syllabus section E7.1. The attached syllabus PDF stays in the project as the source reference.

Official references: [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/), [Access JWT validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/), and [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/).
