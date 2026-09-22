-- Safe to apply independently to existing installations before the app rollout.
begin;
revoke all on function public.metrix_apply_retention(uuid,integer) from public,anon,authenticated;
grant execute on function public.metrix_apply_retention(uuid,integer) to service_role;
commit;
