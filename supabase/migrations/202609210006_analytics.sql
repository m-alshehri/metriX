begin;
drop index if exists public.project_alerts_dedupe_idx;
create unique index project_alerts_dedupe_idx on public.project_alerts(project_id,dedupe_key);
alter table public.mention_metrics_history add column if not exists sample_key text;
create unique index if not exists history_sample_key on public.mention_metrics_history(mention_id,sample_key);
alter table public.project_insights add column if not exists generation_key text;
create unique index if not exists insight_generation_key on public.project_insights(generation_key);
create or replace function public.metrix_daily_metrics(p_project uuid,p_days integer default 180)
returns table(metric_date date,mentions bigint,engagement numeric,views numeric,positive bigint,neutral bigint,negative bigint)
language sql stable security invoker set search_path='' as $$
 select (m.published_at at time zone 'UTC')::date, count(*),sum(m.likes+m.shares+m.replies),sum(m.views),
 count(*) filter(where m.sentiment in ('positive','very_positive')),count(*) filter(where m.sentiment='neutral'),
 count(*) filter(where m.sentiment in ('negative','very_negative'))
 from public.mentions m where m.project_id=p_project and m.is_test=false
 and m.published_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'-make_interval(days=>least(180,greatest(1,p_days)))
 group by 1 order by 1;
$$;
create or replace function public.metrix_dashboard(p_project uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('platforms',coalesce((select jsonb_agg(t) from (
 select platform,count(*) items,sum(likes+shares+replies) engagement,sum(views) views from public.mentions
 where project_id=p_project and is_test=false group by platform order by count(*) desc) t),'[]'::jsonb),
 'sentiments',coalesce((select jsonb_object_agg(sentiment,n) from (select coalesce(sentiment,'pending') sentiment,count(*) n
 from public.mentions where project_id=p_project and is_test=false group by sentiment) s),'{}'::jsonb));
$$;
revoke all on function public.metrix_daily_metrics(uuid,integer),public.metrix_dashboard(uuid) from public,anon;
grant execute on function public.metrix_daily_metrics(uuid,integer),public.metrix_dashboard(uuid) to authenticated,service_role;
commit;

-- Save the complete source list atomically; changing a handle invalidates identity/cursors.
create or replace function public.metrix_save_accounts(p_project uuid,p_user uuid,p_accounts jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare a jsonb; old public.social_accounts; platforms text[]='{}'; p text; h text;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_project::text,0));
 if not exists(select 1 from public.projects where id=p_project and user_id=p_user) then raise exception 'Project not found';end if;
 if exists(select 1 from public.pipeline_jobs where project_id=p_project and status in ('queued','running','retry')) then raise exception 'Wait until the current run finishes before changing sources';end if;
 if jsonb_typeof(p_accounts)<>'array' or jsonb_array_length(p_accounts)>10 then raise exception 'Invalid accounts';end if;
 for a in select value from jsonb_array_elements(p_accounts) loop
  p=a->>'platform';h=trim(a->>'handle');
  if p is null or p<>all(array['x','youtube','instagram','tiktok','threads','facebook','linkedin','google_maps','reddit','snapchat']) or h is null or length(h) not between 1 and 500 or p=any(platforms) then raise exception 'Invalid source';end if;
  platforms=array_append(platforms,p);
  select * into old from public.social_accounts where project_id=p_project and platform=p;
  if old.id is not null and old.handle<>h then
   update public.mentions set social_account_id=null where social_account_id=old.id;
   delete from public.provider_jobs where social_account_id=old.id;
   update public.social_accounts set external_id=null,sync_cursor=null,last_external_id=null,last_successful_sync=null,
   last_sync_status=null,last_sync_error=null,consecutive_failures=0,next_retry_at=null,records_imported=0,backfill_completed=false where id=old.id;
  end if;
  insert into public.social_accounts(project_id,user_id,platform,handle,enabled) values(p_project,p_user,p,h,true)
  on conflict(project_id,platform) do update set handle=excluded.handle,enabled=true,updated_at=now();
 end loop;
 update public.social_accounts set enabled=false where project_id=p_project and not(platform=any(platforms));
end $$;
revoke all on function public.metrix_save_accounts(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.metrix_save_accounts(uuid,uuid,jsonb) to service_role;
-- Route all source writes through the atomic server function above.
drop policy if exists owner_write on public.social_accounts;
revoke insert,update,delete on public.social_accounts from authenticated;
