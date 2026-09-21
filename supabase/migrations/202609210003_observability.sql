-- metriX v5.4 — Bright Data observability and safe snapshot persistence
alter table public.provider_jobs add column if not exists requested_rows integer not null default 0;
alter table public.provider_jobs add column if not exists returned_rows integer not null default 0;
alter table public.provider_jobs add column if not exists normalized_rows integer not null default 0;
alter table public.provider_jobs add column if not exists failed_rows integer not null default 0;
alter table public.provider_jobs add column if not exists response_sample jsonb;

alter table public.sync_events add column if not exists requested integer not null default 0;
alter table public.sync_events add column if not exists returned integer not null default 0;
alter table public.sync_events add column if not exists normalized integer not null default 0;
alter table public.sync_events add column if not exists failed integer not null default 0;
alter table public.sync_events add column if not exists snapshot_id text;
alter table public.sync_events add column if not exists raw_sample jsonb;
