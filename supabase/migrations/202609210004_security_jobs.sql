begin;
alter table public.mentions add column if not exists is_test boolean not null default false;
alter table public.mentions add column if not exists enriched_at timestamptz;
create index if not exists mentions_enrichment_idx on public.mentions(project_id,enriched_at) where is_test=false;

-- Remove permissive legacy policies before creating a single owner contract.
do $$ declare t text; p record; begin
 foreach t in array array['projects','keywords','social_accounts','mentions','project_settings','project_insights','project_alerts','pipeline_runs'] loop
  execute format('alter table public.%I enable row level security',t);
  for p in select policyname from pg_policies where schemaname='public' and tablename=t loop
   execute format('drop policy %I on public.%I',p.policyname,t);
  end loop;
  execute format('create policy owner_read on public.%I for select to authenticated using (user_id=(select auth.uid()))',t);
  if t='projects' then
   execute 'create policy owner_write on public.projects for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()))';
  elsif t in ('keywords','social_accounts','project_settings') then
   execute format('create policy owner_write on public.%I for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()) and exists(select 1 from public.projects p where p.id=project_id and p.user_id=(select auth.uid())))',t);
  end if;
  execute format('revoke all on public.%I from anon',t);
  execute format('grant select on public.%I to authenticated',t);
  if t in ('projects','keywords','social_accounts','project_settings') then
   execute format('grant insert,update,delete on public.%I to authenticated',t);
  else
   execute format('revoke insert,update,delete on public.%I from authenticated',t);
  end if;
  execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;

create or replace function public.metrix_apply_retention(p_project_id uuid,p_days integer)
returns integer language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if p_days is null or p_days<30 or p_days>3650 then raise exception 'Invalid retention period'; end if;
 delete from public.mentions where project_id=p_project_id and published_at<now()-make_interval(days=>p_days);
 get diagnostics n=row_count;
 delete from public.author_snapshots where project_id=p_project_id and captured_at<now()-make_interval(days=>p_days);
 delete from public.sync_events where project_id=p_project_id and created_at<now()-make_interval(days=>p_days);
 delete from public.metrix_usage_events where project_id=p_project_id and created_at<now()-make_interval(days=>p_days);
 delete from public.provider_jobs where project_id=p_project_id and status in ('completed','failed') and created_at<now()-make_interval(days=>p_days);
 return n;
end $$;
revoke all on function public.metrix_apply_retention(uuid,integer) from public,anon,authenticated;
grant execute on function public.metrix_apply_retention(uuid,integer) to service_role;

-- Existing token functions remain server-only, including any overloaded versions.
do $$ declare f record; begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in ('store_meta_token','delete_meta_token','get_meta_token_for_user','store_social_oauth_tokens','get_social_oauth_tokens') loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;

create table if not exists public.pipeline_jobs (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, mode text not null, locale text not null default 'en',
 status text not null default 'queued' check(status in ('queued','running','retry','completed','failed')),
 state jsonb not null default '{"stage":"collect","account":0}', lease_token uuid, lease_until timestamptz,
 attempts integer not null default 0, next_retry_at timestamptz not null default now(), error text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists pipeline_one_active_project on public.pipeline_jobs(project_id) where status in ('queued','running','retry');
alter table public.pipeline_jobs enable row level security;
create policy owner_read on public.pipeline_jobs for select to authenticated using(user_id=(select auth.uid()));
grant select on public.pipeline_jobs to authenticated;
grant all on public.pipeline_jobs to service_role;
revoke all on public.pipeline_jobs from anon;

create or replace function public.metrix_enqueue(p_project uuid,p_user uuid,p_mode text,p_locale text)
returns uuid language plpgsql security definer set search_path='' as $$
declare j uuid;
begin
 if not exists(select 1 from public.projects where id=p_project and user_id=p_user) then raise exception 'Project not found'; end if;
 if p_mode not in ('full','recover','enrich','insights') or p_locale not in ('ar','en') then raise exception 'Invalid job'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_project::text,0));
 select id into j from public.pipeline_jobs where project_id=p_project and status in ('queued','running','retry');
 if j is not null then return j; end if;
 if exists(select 1 from public.pipeline_jobs where project_id=p_project and created_at>now()-interval '5 minutes') then raise exception 'Wait five minutes before starting another run'; end if;
 if (select count(*) from public.pipeline_jobs where user_id=p_user and created_at>now()-interval '1 day')>=100 then raise exception 'Daily run limit reached'; end if;
 insert into public.pipeline_jobs(project_id,user_id,mode,locale,state)
 values(p_project,p_user,p_mode,p_locale,jsonb_build_object('stage',case when p_mode='enrich' then 'enrich' when p_mode='insights' then 'insights' else 'collect' end,'account',0)) returning id into j;
 return j;
end $$;

create or replace function public.metrix_claim_job(p_project uuid default null)
returns setof public.pipeline_jobs language plpgsql security definer set search_path='' as $$
begin
 update public.pipeline_jobs set status='failed',error='Worker repeatedly exceeded its lease',lease_token=null,lease_until=null,updated_at=now()
 where status='running' and lease_until<now() and attempts>=4;
 return query with candidate as (
 select id from public.pipeline_jobs where (p_project is null or project_id=p_project)
 and ((status in ('queued','retry') and next_retry_at<=now()) or (status='running' and lease_until<now()))
 order by created_at for update skip locked limit 1
 ) update public.pipeline_jobs j set attempts=case when j.status='running' then j.attempts+1 else j.attempts end,status='running',lease_token=gen_random_uuid(),lease_until=now()+interval '6 minutes',updated_at=now()
 from candidate c where j.id=c.id returning j.*;
end $$;

create or replace function public.metrix_finish_job(p_id uuid,p_lease uuid,p_state jsonb,p_done boolean,p_error text)
returns void language plpgsql security definer set search_path='' as $$
begin
 update public.pipeline_jobs set state=p_state,
 status=case when p_error is not null then case when attempts>=4 then 'failed' else 'retry' end when p_done then 'completed' else 'queued' end,
 attempts=case when p_error is null then 0 else attempts+1 end,
 next_retry_at=case when p_error is null then now() else now()+make_interval(secs=>least(3600,(power(2,attempts)*60)::integer)) end,
 error=p_error,lease_token=null,lease_until=null,updated_at=now()
 where id=p_id and lease_token=p_lease and lease_until>now();
 if not found then raise exception 'Worker lease expired'; end if;
end $$;
revoke all on function public.metrix_enqueue(uuid,uuid,text,text),public.metrix_claim_job(uuid),public.metrix_finish_job(uuid,uuid,jsonb,boolean,text) from public,anon,authenticated;
grant execute on function public.metrix_enqueue(uuid,uuid,text,text),public.metrix_claim_job(uuid),public.metrix_finish_job(uuid,uuid,jsonb,boolean,text) to service_role;
commit;
