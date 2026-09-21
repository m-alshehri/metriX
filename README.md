# metriX

Bilingual (Arabic/English) social listening application built with Next.js App Router, React and Supabase. Authenticated users own projects, configured social sources, collected mentions and derived intelligence.

## Local setup

Use Node.js 22.12+ and pnpm 11.19.0. Copy `.env.example` to `.env.local`, configure a **development** Supabase project and apply the ordered migrations in `supabase/migrations` before starting. Do not apply them to an existing production database without the preflight in [deployment.md](docs/deployment.md).

```sh
pnpm install --frozen-lockfile
pnpm dev
```

`APP_URL` is the canonical application origin (HTTPS in production). Configure Supabase Auth's site URL and allowed callback URL to `${APP_URL}/auth/callback`. Google login also requires enabling/configuring Google's provider in Supabase. Never expose `SUPABASE_SECRET_KEY` to the browser.

## Architecture

- `app/[locale]`: public pages, Supabase authentication and protected project/dashboard screens.
- `proxy.ts`, `lib/supabase/server.ts`: server-side session validation and cookie refresh.
- `lib/pipeline.ts`: resumable collection, enrichment, insights, metrics, alerts, email and retention stages.
- `lib/jobs.ts`, `lib/worker.ts`: database-backed queue, leases, retries and bounded worker execution.
- `lib/ensembledata.ts`, `lib/brightdata.ts`: provider adapters. Bright Data snapshots are persisted and recovered without starting a replacement scrape.
- `supabase/migrations`: reproducible schema, ownership RLS, service-only writes/RPCs, queue and aggregate queries.

Users enqueue a run through server actions. Workers execute one stage at a time, and database leases prevent concurrent workers from claiming the same job. The UI polls job state and allows continuing queued work. The two cron endpoints require `Authorization: Bearer ${CRON_SECRET}`. The checked-in schedules are daily; they are not a continuous background worker.

## Accuracy and operational limits

Dashboard totals and calendar comparisons aggregate the complete retained dataset in PostgreSQL. The feed is paginated at 50 records. Collection retains the existing 100-record provider cap; AI insights use the newest 100 records and enrichment handles at most 250 pending records per run. These are explicit processing limits, not a claim of complete platform coverage. Virality/influence are heuristics, and usage quantities are not currency costs. Test mentions are excluded using `is_test`; historical fixtures must be identified explicitly by an operator.

Unwired Meta/TikTok/Threads OAuth collection routes return 410. Login with Google remains supported. Stored provider tokens are not deleted. Manual test-mention creation and duplicate inactive pipelines have been removed.

## Checks

```sh
pnpm typecheck
pnpm test
pnpm format:check
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Database tests use PGlite PostgreSQL with simulated Supabase roles/Auth/Storage schemas. Browser tests cover public authentication pages, anonymous redirects and endpoint protection. Real OAuth, refresh-token expiry, Storage uploads, provider collection and email delivery require staging credentials; local test results do not certify those integrations.
