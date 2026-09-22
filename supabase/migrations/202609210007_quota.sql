begin;
create table if not exists public.request_quotas (key text primary key, count integer not null, resets_at timestamptz not null);
alter table public.request_quotas enable row level security;
revoke all on public.request_quotas from public,anon,authenticated;
grant all on public.request_quotas to service_role;
create or replace function public.metrix_take_quota(p_key text,p_max integer,p_seconds integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if p_max<1 or p_seconds<1 then raise exception 'Invalid quota';end if;
 insert into public.request_quotas(key,count,resets_at) values(p_key,1,now()+make_interval(secs=>p_seconds))
 on conflict(key) do update set count=case when request_quotas.resets_at<=now() then 1 else request_quotas.count+1 end,
 resets_at=case when request_quotas.resets_at<=now() then now()+make_interval(secs=>p_seconds) else request_quotas.resets_at end
 returning count into n;
 return n<=p_max;
end $$;
revoke all on function public.metrix_take_quota(text,integer,integer) from public,anon,authenticated;
grant execute on function public.metrix_take_quota(text,integer,integer) to service_role;
-- Explicit privileges for databases without permissive default privileges.
do $$ declare t text; p record; begin
 foreach t in array array['mention_metrics_history','mention_topics','author_snapshots','provider_jobs','sync_events','project_daily_metrics','daily_project_summaries','metrix_usage_events'] loop
 for p in select policyname from pg_policies where schemaname='public' and tablename=t loop
 execute format('drop policy %I on public.%I',p.policyname,t);
 end loop;
 execute format('create policy owner_read on public.%I for select to authenticated using(user_id=(select auth.uid()))',t);
 execute format('revoke insert,update,delete on public.%I from authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 execute format('revoke all on public.%I from anon',t);
 end loop;
end $$;
commit;

alter table public.project_settings add column if not exists report_locale text not null default 'en';
create or replace function public.metrix_enqueue_due(p_recovery boolean default false)
returns integer language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 insert into public.pipeline_jobs(project_id,user_id,mode,locale,state)
 select p.id,p.user_id,case when p_recovery then 'recover' else 'full' end,coalesce(s.report_locale,'en'),'{"stage":"collect","account":0}'::jsonb
 from public.projects p left join public.project_settings s on s.project_id=p.id
 where coalesce(s.automation_enabled,true)
 and not exists(select 1 from public.pipeline_jobs j where j.project_id=p.id and j.status in ('queued','running','retry'))
 and not exists(select 1 from public.pipeline_jobs j where j.project_id=p.id and j.created_at>now()-interval '5 minutes')
 and (not p_recovery or exists(select 1 from public.provider_jobs j where j.project_id=p.id and j.status='processing' and j.next_retry_at<=now()))
 on conflict do nothing;
 get diagnostics n=row_count;
 delete from public.request_quotas where resets_at<now()-interval '1 day';
 return n;
end $$;
revoke all on function public.metrix_enqueue_due(boolean) from public,anon,authenticated;
grant execute on function public.metrix_enqueue_due(boolean) to service_role;
