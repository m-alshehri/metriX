begin;
create or replace function public.metrix_apply_enrichment(p_project uuid,p_user uuid,p_items jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare item jsonb; v_mention_id uuid; topics text[];
begin
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>25 then raise exception 'Invalid enrichment batch';end if;
 if not exists(select 1 from public.projects where id=p_project and user_id=p_user) then raise exception 'Project not found';end if;
 for item in select value from jsonb_array_elements(p_items) loop
  v_mention_id=(item->>'id')::uuid;
  if not exists(select 1 from public.mentions m where m.id=v_mention_id and m.project_id=p_project and m.user_id=p_user and not m.is_test) then raise exception 'Invalid mention';end if;
  if item->>'sentiment' not in ('very_positive','positive','neutral','negative','very_negative') or item->>'emotion' not in ('joy','anger','sadness','fear','surprise','disgust','neutral') or jsonb_typeof(item->'topics')<>'array' then raise exception 'Invalid enrichment';end if;
  select array_agg(topic) into topics from (select distinct left(trim(value),80) topic from jsonb_array_elements_text(item->'topics') where trim(value)<>'' limit 3)t;
  delete from public.mention_topics mt where mt.mention_id=v_mention_id and mt.project_id=p_project;
  insert into public.mention_topics(mention_id,project_id,user_id,topic,score)
  select v_mention_id,p_project,p_user,topic,1 from unnest(topics) topic;
  update public.mentions m set sentiment=item->>'sentiment',sentiment_confidence=greatest(0,least(1,(item->>'confidence')::numeric)),emotion=item->>'emotion',enriched_at=now()
  where m.id=v_mention_id and m.project_id=p_project;
 end loop;
end $$;
revoke all on function public.metrix_apply_enrichment(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.metrix_apply_enrichment(uuid,uuid,jsonb) to service_role;
commit;
