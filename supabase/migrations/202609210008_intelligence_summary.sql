begin;
alter table public.author_snapshots add column if not exists sample_key text;
create unique index if not exists author_sample_key on public.author_snapshots(project_id,platform,author_username,sample_key);
create or replace function public.metrix_intelligence(p_project uuid)
returns jsonb language sql stable security invoker set search_path='' as $$
select jsonb_build_object(
 'topics',coalesce((select jsonb_agg(t) from (select topic,count(*) mentions from public.mention_topics where project_id=p_project and last_seen_at>=now()-interval '30 days' group by topic order by count(*) desc limit 8)t),'[]'::jsonb),
 'usage',coalesce((select jsonb_agg(t) from (select event_type,provider,sum(quantity) quantity from public.metrix_usage_events where project_id=p_project and created_at>=now()-interval '30 days' group by event_type,provider)t),'[]'::jsonb),
 'authors',coalesce((select jsonb_agg(t) from (select * from (select distinct on(platform,author_username) platform,author_username,author_name,followers,influence_score,captured_at from public.author_snapshots where project_id=p_project order by platform,author_username,captured_at desc) latest order by influence_score desc limit 5)t),'[]'::jsonb),
 'viral',coalesce((select jsonb_agg(t) from(select id,platform,content,post_url,virality_score from public.mentions where project_id=p_project and is_test=false order by virality_score desc limit 5)t),'[]'::jsonb),
 'top',coalesce((select jsonb_agg(t) from(select id,platform,content,post_url,(likes+shares+replies) engagement from public.mentions where project_id=p_project and is_test=false order by (likes+shares+replies) desc limit 5)t),'[]'::jsonb)
);
$$;
revoke all on function public.metrix_intelligence(uuid) from public,anon;
grant execute on function public.metrix_intelligence(uuid) to authenticated,service_role;
commit;
