-- metriX v5 Intelligence & Historical Analytics Upgrade
-- Run once in Supabase SQL Editor before deploying v5.

begin;

-- 1) Rich mention storage + smart refresh fields
alter table public.mentions add column if not exists raw_data jsonb;
alter table public.mentions add column if not exists media_type text;
alter table public.mentions add column if not exists media_url text;
alter table public.mentions add column if not exists thumbnail_url text;
alter table public.mentions add column if not exists media_duration_seconds numeric;
alter table public.mentions add column if not exists media_count integer default 0;
alter table public.mentions add column if not exists location text;
alter table public.mentions add column if not exists outbound_domains text[] default '{}';
alter table public.mentions add column if not exists hashtags text[] default '{}';
alter table public.mentions add column if not exists mentioned_users text[] default '{}';
alter table public.mentions add column if not exists outbound_urls text[] default '{}';
alter table public.mentions add column if not exists content_hash text;
alter table public.mentions add column if not exists sentiment_confidence numeric(5,4);
alter table public.mentions add column if not exists emotion text;
alter table public.mentions add column if not exists emotion_confidence numeric(5,4);
alter table public.mentions add column if not exists detected_language text;
alter table public.mentions add column if not exists first_seen_at timestamptz default now();
alter table public.mentions add column if not exists last_seen_at timestamptz default now();
alter table public.mentions add column if not exists updated_at timestamptz default now();
alter table public.mentions add column if not exists virality_score numeric default 0;
alter table public.mentions add column if not exists quality_status text default 'ok';

create index if not exists mentions_project_published_idx on public.mentions(project_id, published_at desc);
create index if not exists mentions_project_sentiment_idx on public.mentions(project_id, sentiment);
create index if not exists mentions_project_hash_idx on public.mentions(project_id, content_hash);
create index if not exists mentions_social_account_idx on public.mentions(social_account_id, published_at desc);

-- 2) Daily metric snapshots per post (historical engagement growth)
create table if not exists public.mention_metrics_history (
  id uuid primary key default gen_random_uuid(),
  mention_id uuid not null references public.mentions(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null,
  likes bigint not null default 0,
  shares bigint not null default 0,
  replies bigint not null default 0,
  views bigint not null default 0,
  engagement bigint generated always as (likes + shares + replies) stored,
  captured_at timestamptz not null default now()
);
create index if not exists mention_metrics_history_mention_idx on public.mention_metrics_history(mention_id, captured_at desc);
create index if not exists mention_metrics_history_project_idx on public.mention_metrics_history(project_id, captured_at desc);

-- 3) Structured AI topics
create table if not exists public.mention_topics (
  id uuid primary key default gen_random_uuid(),
  mention_id uuid not null references public.mentions(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null,
  topic text not null,
  score numeric(5,4) default 1,
  first_seen_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  unique(mention_id, topic)
);
create index if not exists mention_topics_project_idx on public.mention_topics(project_id, last_seen_at desc);
create index if not exists mention_topics_topic_idx on public.mention_topics(project_id, topic);

-- 4) Author/account snapshots for influence and growth
create table if not exists public.author_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null,
  social_account_id uuid references public.social_accounts(id) on delete cascade,
  platform text not null,
  author_username text,
  author_name text,
  followers bigint,
  following bigint,
  verified boolean,
  biography text,
  account_category text,
  location text,
  influence_score numeric default 0,
  raw_data jsonb,
  captured_at timestamptz not null default now()
);
create index if not exists author_snapshots_project_idx on public.author_snapshots(project_id, captured_at desc);

-- 5) Reliable incremental sync state
alter table public.social_accounts add column if not exists provider text;
alter table public.social_accounts add column if not exists sync_cursor text;
alter table public.social_accounts add column if not exists last_external_id text;
alter table public.social_accounts add column if not exists last_successful_sync timestamptz;
alter table public.social_accounts add column if not exists consecutive_failures integer not null default 0;
alter table public.social_accounts add column if not exists next_retry_at timestamptz;
alter table public.social_accounts add column if not exists backfill_completed boolean not null default false;
alter table public.social_accounts add column if not exists backfill_target_days integer not null default 30;
alter table public.social_accounts add column if not exists records_imported bigint not null default 0;

-- 6) Persist asynchronous provider snapshots/jobs
create table if not exists public.provider_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null,
  social_account_id uuid not null references public.social_accounts(id) on delete cascade,
  provider text not null,
  platform text not null,
  external_job_id text not null,
  status text not null default 'processing',
  attempts integer not null default 0,
  next_retry_at timestamptz default now(),
  last_error text,
  payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(provider, external_job_id)
);
create index if not exists provider_jobs_retry_idx on public.provider_jobs(status, next_retry_at);

-- 7) Provider/account health events
create table if not exists public.sync_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null,
  social_account_id uuid references public.social_accounts(id) on delete cascade,
  platform text not null,
  provider text not null,
  status text not null,
  fetched integer default 0,
  inserted integer default 0,
  updated integer default 0,
  error text,
  duration_ms integer,
  created_at timestamptz not null default now()
);
create index if not exists sync_events_project_idx on public.sync_events(project_id, created_at desc);

-- 8) Daily project analytics / period comparison
create table if not exists public.project_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null,
  metric_date date not null,
  mentions integer not null default 0,
  engagement bigint not null default 0,
  views bigint not null default 0,
  positive integer not null default 0,
  neutral integer not null default 0,
  negative integer not null default 0,
  unique(project_id, metric_date)
);
create index if not exists project_daily_metrics_project_idx on public.project_daily_metrics(project_id, metric_date desc);

-- 9) Daily AI executive summary
create table if not exists public.daily_project_summaries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null,
  summary_date date not null,
  executive_summary text not null,
  highlights jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  opportunities jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(project_id, summary_date)
);

-- 10) SaaS usage accounting (separate stable schema)
create table if not exists public.metrix_usage_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid not null,
  event_type text not null,
  quantity numeric not null default 1,
  provider text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists metrix_usage_events_user_idx on public.metrix_usage_events(user_id, created_at desc);

-- 11) Retention / automation controls
alter table public.project_settings add column if not exists retention_days integer not null default 365;
alter table public.project_settings add column if not exists daily_summary_enabled boolean not null default true;
alter table public.project_settings add column if not exists anomaly_alerts_enabled boolean not null default true;
alter table public.project_settings add column if not exists comparison_window_days integer not null default 7;

-- 12) Alert de-duplication
alter table public.project_alerts add column if not exists dedupe_key text;
create unique index if not exists project_alerts_dedupe_idx
  on public.project_alerts(project_id, dedupe_key)
  where dedupe_key is not null;

-- 13) RLS
alter table public.mention_metrics_history enable row level security;
alter table public.mention_topics enable row level security;
alter table public.author_snapshots enable row level security;
alter table public.provider_jobs enable row level security;
alter table public.sync_events enable row level security;
alter table public.project_daily_metrics enable row level security;
alter table public.daily_project_summaries enable row level security;
alter table public.metrix_usage_events enable row level security;

-- Re-create simple owner policies safely.
do $$
declare t text;
begin
  foreach t in array array['mention_metrics_history','mention_topics','author_snapshots','provider_jobs','sync_events','project_daily_metrics','daily_project_summaries','metrix_usage_events'] loop
    execute format('drop policy if exists %I on public.%I', t || '_owner_select', t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = auth.uid())', t || '_owner_select', t);
  end loop;
end $$;

-- 14) Retention helper. Service-role pipeline can call this daily.
create or replace function public.metrix_apply_retention(p_project_id uuid, p_days integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare deleted_count integer;
begin
  if p_days is null or p_days <= 0 then return 0; end if;
  delete from public.mentions
  where project_id = p_project_id
    and published_at < now() - make_interval(days => p_days);
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

commit;
