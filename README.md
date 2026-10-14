# TransformLab

A personal Cambridge IGCSE Mathematics 0580 Extended transformations revision app. React, TypeScript, Vite, Tailwind, shadcn/ui source components, Lucide, Motion, and SVG provide the interface. A single Cloudflare Worker serves the built frontend and API. D1 stores progress and solutions; R2 stores optional private files. No custom accounts or browser Local Storage are used.

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
2. Create a D1 database: `npx wrangler d1 create transformlab`. Copy its UUID into `wrangler.jsonc` as `database_id`.
3. Create an R2 bucket: `npx wrangler r2 bucket create transformlab-files`.
4. Choose an app hostname in a zone on your account and set a Worker custom domain or route for this Worker. Do not leave the `workers.dev` URL usable outside your Access policy. In Cloudflare Access, add a **Self-hosted** application for the exact hostname and an **Allow** policy with only your email address in the Emails selector. Remove any broader Allow policies. Copy your team domain (such as `your-team.cloudflareaccess.com`) and the application's Audience (AUD) tag into `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` in `wrangler.jsonc`; set `ALLOWED_EMAIL` to the same exact email. These values are configuration, not secrets.
5. Apply migrations: `npx wrangler d1 migrations apply transformlab --remote`.
6. Build and deploy: `npm run deploy`.
7. Confirm a request without Access is rejected with HTTP 403, then sign in through Access and use the app. Also verify any `workers.dev` or preview URL is disabled or covered by Access.

The Worker validates the Access JWT against Cloudflare's JWKS, issuer, audience, and exact allowed email. It ignores client supplied email headers. All static assets and API routes pass through this check. Mutation routes require a same-origin request and a custom header. The backend alone holds DB and R2 bindings and performs marking. Solutions remain in D1 until submission or an explicit solution request.

## Data and API

`/api/question`, `/api/practice/submit`, `/api/practice/history`, `/api/exams`, `/api/exams/:id/answer`, `/api/exams/:id/complete`, `/api/exams/:id/results`, `/api/progress`, `/api/visualizations`, `/api/files`, and `/api/progress/reset` are Worker routes. Practice and exam answer writes accept an idempotency key. Database trigger updates transformation statistics exactly once on insertion. Progress reset requires the literal confirmation `RESET`.

Migrations live in `migrations/`. Optional uploads are limited to 10 MB images or PDFs and are stored in private R2 keys with metadata in D1. Structured progress is always in D1. The app uses TanStack Query for server state and refetches after saves.

The sample draw exercise is available through **Draw → Part a/b/c**. Questions are original and generated from the transformation rules in syllabus section E7.1. The attached syllabus PDF stays in the project as the source reference.

Official references: [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/), [Access JWT validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/), and [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/).
