-- Baseline for new installations. Existing deployments must review schema drift
-- with docs/deployment.md before applying these additive migrations.
begin;
create table if not exists public.projects (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 200), description text, avatar_url text,
 created_at timestamptz not null default now()
);
create table if not exists public.keywords (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, keyword text not null,
 created_at timestamptz not null default now(), unique(project_id,keyword)
);
create table if not exists public.social_accounts (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, platform text not null, handle text not null,
 profile_url text, external_id text, enabled boolean not null default true,
 last_synced_at timestamptz, last_sync_status text, last_sync_error text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(project_id,platform)
);
create table if not exists public.mentions (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 social_account_id uuid references public.social_accounts(id) on delete set null,
 keyword_id uuid references public.keywords(id) on delete set null,
 platform text not null, external_id text, author_name text, author_username text, content text, post_url text,
 published_at timestamptz not null default now(), likes bigint not null default 0, shares bigint not null default 0,
 replies bigint not null default 0, views bigint not null default 0, sentiment text, language text,
 is_test boolean not null default false, enriched_at timestamptz, created_at timestamptz not null default now(),
 unique(project_id,external_id)
);
create table if not exists public.project_settings (
 project_id uuid primary key references public.projects(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 automation_enabled boolean not null default true, email_alerts_enabled boolean not null default false, alert_email text,
 negative_threshold integer not null default 40, spike_multiplier numeric not null default 1.5,
 updated_at timestamptz not null default now()
);
create table if not exists public.project_insights (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, executive_summary text not null,
 top_topics jsonb not null default '[]', positive_drivers jsonb not null default '[]', negative_drivers jsonb not null default '[]',
 risks jsonb not null default '[]', opportunities jsonb not null default '[]', recommendations jsonb not null default '[]',
 mentions_analyzed integer not null default 0, generated_at timestamptz not null default now()
);
create table if not exists public.project_alerts (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, alert_type text not null,
 severity text not null, title text not null, description text not null, metadata jsonb not null default '{}',
 is_active boolean not null default true, detected_at timestamptz not null default now(), email_sent_at timestamptz,
 created_at timestamptz not null default now()
);
create table if not exists public.pipeline_runs (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, status text not null,
 imported integer not null default 0, analyzed integer not null default 0, alerts integer not null default 0,
 started_at timestamptz not null default now(), finished_at timestamptz, details jsonb not null default '{}'
);
commit;
