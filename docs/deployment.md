# Deployment and database preflight

## Production rollout: 2026-09-22

The pending migrations were applied atomically to meriX (jedwhinrjwyrzcegnanr), with original migration versions recorded in the same transaction. The coordinated_production_rollout receipt matches remote version 20260922143817. The user explicitly waived a backup and deferred staging. The transaction preserved all 8 projects and 850 mentions. Privileged retention remains denied to anon/authenticated and allowed to service_role. Source writes are server-only, and five-value sentiment/project-scoped identity constraints are installed.

PR #1 merged at 6134c93737e08486c21e2cf7b116b1b5737ff496. Vercel production deployment dpl_3Szwz3RPUASdvEVpVYcBdEEvAVbv reached Ready. Canonical APP_URL, DEMO_TO_EMAIL and OPENAI_MODEL are configured. Tajawal is bundled locally.

Local checks: 27 tests, TypeScript and production build passed; replaying the extracted live schema passed all migrations and 10 database tests. GitHub Verify run 35719728145 passed. Real authenticated user flows and OpenAI have not yet been verified. The request_quotas no-policy advisory is intentional (service-only); leaked password protection remains disabled.

The following checklist applies to future rollouts; it is not a claim that all acceptance flows have been tested.

## Existing database

1. Back up the database and record the currently deployed app revision. Export the current schema, policies, grants and migration history. Existing installations were created by manual SQL files; `CREATE TABLE IF NOT EXISTS` does not reconcile every possible legacy schema.
2. Restore a copy in an isolated staging project. Compare the ordered migrations with the installed columns, foreign keys, check constraints and unique indexes. In particular, confirm project ownership columns, the five sentiment values, `(project_id, external_id)` uniqueness and the existing alerts/insights field types. Reconcile any drift in a separate reviewed migration before proceeding. Do not mark migrations applied merely because a similarly named SQL script was run.
3. Apply `supabase/migrations` in filename order in staging using the Supabase CLI migration workflow. Legacy root SQL files are historical references, not an additional installation step. The baseline is tested against a clean database; upgrade compatibility must be checked against the actual exported schema.
4. Check RLS with two real users: neither can read or mutate the other's projects/children; browser credentials cannot invoke retention, job or token RPCs; derived analytics are read-only. Existing permissive policies on the base tables are deliberately replaced. Review any external integrations that depended on direct client writes.
5. Verify Storage policies and existing objects. Historical manual fixtures remain unchanged; mark only verified fixture IDs as `is_test=true`. Do not bulk-classify old data by guessed text patterns.
6. Deploy the compatible app after migrations pass staging verification. Keep production cron disabled during migration. Run a single project before enabling automation. Rollback the app only with a version compatible with restricted analytics/source writes; do not restore insecure grants as a rollback shortcut.

## Environment

Required for web/auth: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `APP_URL`. Workers and source writes additionally require `SUPABASE_SECRET_KEY`. Set `CRON_SECRET` to a random high-entropy secret. Set the exact Supabase Auth redirect allowlist to the canonical app callback.

Collection uses `ENSEMBLEDATA_TOKEN` and `BRIGHTDATA_API_TOKEN` (and `YOUTUBE_API_KEY` for the existing optional adapter). AI processing requires `OPENAI_API_KEY` and an available Responses API model with structured output support in `OPENAI_MODEL`; no model is silently assumed. Email requires `RESEND_API_KEY`, a verified sender in `ALERT_FROM_EMAIL`, and per-project opt-in/address. Demo requests additionally require `DEMO_TO_EMAIL`.

Use a host supporting a 300-second function duration and Next.js `after()`. Workers stop claiming new stages after 200 seconds; leases expire after six minutes. Failed stages retry with exponential backoff and stop after five failures. Repeated worker crashes are bounded too. Run requests are coalesced, limited to one per project per five minutes and 100 per user per day. Provider/AI charges are still possible on a crash between an external response and database persistence; this is at-least-once execution, not a distributed exactly-once guarantee.

## Scheduling and capacity

`vercel.json` retains daily schedules. A large queue or unfinished Bright Data snapshot can remain pending until the next invocation; users can explicitly continue from the project screen. For timely processing, provision a supported frequent scheduler that invokes the authenticated cron endpoints and monitor queue age/failures. Increase frequency only within the hosting plan and provider budget. The database queue survives function termination but is not itself a scheduler.

## Staging acceptance

Test signup/email confirmation, password login, Google callback, expired-session refresh, password recovery and logout. Test a second user against every project endpoint. Then collect one real source, resume a pending Bright Data snapshot, enrich a batch, inspect stored AI fields, trigger a controlled high-severity alert, and verify actual email delivery. Check repeated execution does not duplicate mentions, metric samples, insights or alerts. Verify source handle changes clear provider identifiers while preserving historical mentions. Test an avatar replacement and inspect Storage ownership.

Monitor `pipeline_jobs`, `pipeline_runs`, `provider_jobs`, `sync_events` and application logs. Usage counts distinguish provider records and AI operations; they do not estimate billing. Generate Supabase TypeScript types from the verified staging schema before further schema-dependent feature development; local handwritten contracts cannot prove the production schema matches.
