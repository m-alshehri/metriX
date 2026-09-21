-- Reconciles constraints observed in the live meriX schema on 2026-09-21.
-- Preserve all existing rows; duplicate identifiers fail migration atomically.
begin;
alter table public.mentions drop constraint if exists mentions_sentiment_check;
alter table public.mentions add constraint mentions_sentiment_check
 check(sentiment is null or sentiment in ('very_positive','positive','neutral','negative','very_negative'));
create unique index if not exists mentions_project_external_id_unique on public.mentions(project_id,external_id);
drop index if exists public.mentions_platform_external_id_unique;
commit;
