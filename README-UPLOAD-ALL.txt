metriX — FULL UPDATE v5.0
=========================

This is a COMPLETE repository replacement bundle.

IMPORTANT DEPLOYMENT ORDER
--------------------------
1) Supabase SQL Editor: run
   supabase/metrix_v5_intelligence_upgrade.sql
2) Only after SQL succeeds, replace the full GitHub repository contents with this bundle.
3) Commit to main and let Vercel deploy.
4) Keep the existing Vercel environment variables:
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
   SUPABASE_SECRET_KEY
   OPENAI_API_KEY
   CRON_SECRET
   RESEND_API_KEY
   ALERT_FROM_EMAIL
   ENSEMBLEDATA_TOKEN
   BRIGHTDATA_API_TOKEN
   YOUTUBE_API_KEY (recommended)

WHAT V5 ADDS
------------
- Smart mention upsert: existing posts refresh likes/shares/replies/views instead of being ignored.
- Historical metric snapshots per mention (engagement growth over time).
- Raw provider JSON storage for future extraction/recovery.
- Media metadata, hashtags, @mentions, outbound URLs, content hash and quality status.
- Duplicate protection using provider IDs plus content hashes for analytics support.
- Language detection (Arabic / English / mixed / other).
- AI sentiment confidence.
- AI emotion classification + confidence.
- Structured AI topics stored in the database.
- Virality / content velocity score.
- Fast-growing content section.
- Account/author snapshots where providers expose follower/profile fields.
- Influence score.
- Daily project metrics and period-over-period comparison.
- Daily AI executive summary.
- Conversation-spike and negative-sentiment alerts.
- Combined anomaly metadata for reputation monitoring.
- Provider/account health history.
- SaaS usage accounting for future plans and quotas.
- Configurable retention period (default 365 days).
- Automated retention cleanup.
- Sync cursor/state fields and last successful sync tracking.
- Failure counters + exponential retry scheduling metadata.
- Persistent Bright Data snapshot IDs in provider_jobs.
- Hourly retry cron for unfinished provider jobs.
- Existing all-project daily cron remains exactly midnight Saudi time (21:00 UTC).
- New intelligence dashboard cards: comparison, daily brief, topics, source health,
  influential authors, usage and fastest-growing content.

CRON SCHEDULES
--------------
Daily all-project pipeline:
  0 21 * * *   = 00:00 Saudi Arabia (UTC+3)

Provider retry worker:
  15 * * * *   = every hour at minute 15

PROVIDER-LIMITED FEATURES
-------------------------
Backfill depth and cursor pagination are stored and supported by the metriX data model,
but actual deep historical pagination depends on what each upstream provider endpoint
returns. v5 does NOT invent undocumented endpoints. Current collectors continue using
verified EnsembleData/Bright Data endpoints, while sync_cursor/backfill fields are ready
for endpoint-specific pagination as documented provider cursors become available.

NOTES
-----
- Historical engagement begins accumulating from the first v5 run; past daily snapshots
  cannot be reconstructed if the provider did not previously supply them.
- Author follower/influence snapshots are populated only where raw provider data exposes
  those fields.
- Existing v4.3 homepage/header/footer/demo form and midnight Saudi cron are preserved.
