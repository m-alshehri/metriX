-- One manually armed request per platform across all runs and deployments.
-- Disabled by default: topping up Bright Data must not restart paid collection.
create table public.brightdata_test_budget (
  platform text primary key check (platform in ('facebook','linkedin','google_maps')),
  social_account_id uuid references public.social_accounts(id) on delete set null,
  enabled boolean not null default false,
  reserved_at timestamptz,
  max_records integer not null default 1 check (max_records = 1),
  check (not enabled or reserved_at is null)
);
alter table public.brightdata_test_budget enable row level security;
revoke all on public.brightdata_test_budget from public, anon, authenticated, service_role;
grant select, update on public.brightdata_test_budget to service_role;
insert into public.brightdata_test_budget(platform)
values ('facebook'), ('linkedin'), ('google_maps');
