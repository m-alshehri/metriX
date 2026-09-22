import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { beforeAll, afterAll, it, expect } from "vitest";
let db: PGlite;
const a = "11111111-1111-4111-8111-111111111111",
  b = "22222222-2222-4222-8222-222222222222";
const pa = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  pb = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public to authenticated,anon,service_role;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;`);
  for (const f of (await readdir("supabase/migrations")).sort())
    if (f.endsWith(".sql"))
      await db.exec(await readFile(`supabase/migrations/${f}`, "utf8"));
  await db.exec(`insert into auth.users values('${a}'),('${b}');insert into public.projects(id,user_id,name) values('${pa}','${a}','A'),('${pb}','${b}','B');
 insert into public.mentions(project_id,user_id,platform,external_id,content,published_at,likes) values('${pa}','${a}','X','one','hello','2026-09-20',10),('${pb}','${b}','X','two','private','2026-09-20',20);`);
});
afterAll(() => db?.close());
it("keeps Bright Data disabled and reserves each enabled test exactly once", async () => {
  expect(
    (
      await db.query(
        "select count(*)::int n from brightdata_test_budget where enabled",
      )
    ).rows,
  ).toEqual([{ n: 0 }]);
  const account = "33333333-3333-4333-8333-333333333333";
  await db.exec(`insert into social_accounts(id,project_id,user_id,platform,handle) values('${account}','${pa}','${a}','facebook','example');
    update brightdata_test_budget set social_account_id='${account}',enabled=true where platform='facebook';`);
  const claim = `update brightdata_test_budget set enabled=false,reserved_at=now()
    where platform='facebook' and social_account_id='${account}' and enabled and reserved_at is null returning max_records`;
  const results = await Promise.all([db.query(claim), db.query(claim)]);
  expect(results.flatMap((x) => x.rows)).toEqual([{ max_records: 1 }]);
  await expect(
    db.exec(
      "update brightdata_test_budget set enabled=true where platform='facebook'",
    ),
  ).rejects.toThrow();
  await expect(
    db.exec(
      "update brightdata_test_budget set max_records=100 where platform='google_maps'",
    ),
  ).rejects.toThrow();
  await db.exec("set role authenticated");
  try {
    await expect(
      db.query("select * from brightdata_test_budget"),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.exec("update brightdata_test_budget set reserved_at=null"),
    ).rejects.toThrow(/permission denied/);
  } finally {
    await db.exec("reset role");
  }
});
it("creates all migrations on a clean PostgreSQL instance", async () =>
  expect((await db.query("select count(*)::int n from projects")).rows).toEqual(
    [{ n: 2 }],
  ));
it("isolates reads and rejects child rows in another user project", async () => {
  await db.exec(
    `set role authenticated;select set_config('request.jwt.claim.sub','${a}',false);`,
  );
  try {
    expect((await db.query("select name from projects")).rows).toEqual([
      { name: "A" },
    ]);
    expect((await db.query("select external_id from mentions")).rows).toEqual([
      { external_id: "one" },
    ]);
    await expect(
      db.exec(
        `insert into keywords(project_id,user_id,keyword) values('${pb}','${a}','attack')`,
      ),
    ).rejects.toThrow();
    await expect(
      db.exec(`select metrix_apply_retention('${pb}',30)`),
    ).rejects.toThrow(/permission denied/);
    expect(
      (await db.query(`select metrix_dashboard('${pb}') value`)).rows[0],
    ).toEqual({ value: { platforms: [], sentiments: {} } });
  } finally {
    await db.exec("reset role");
  }
});
it("denies privileged RPCs to anonymous requests", async () => {
  await db.exec("set role anon");
  try {
    await expect(
      db.exec(`select metrix_apply_retention('${pa}',30)`),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.exec("select * from metrix_claim_job(null)"),
    ).rejects.toThrow(/permission denied/);
  } finally {
    await db.exec("reset role");
  }
});
it("coalesces duplicate runs and fences stale workers", async () => {
  const one = (
    await db.query<{ id: string }>(
      `select metrix_enqueue('${pa}','${a}','full','en') id`,
    )
  ).rows[0].id;
  const two = (
    await db.query<{ id: string }>(
      `select metrix_enqueue('${pa}','${a}','full','en') id`,
    )
  ).rows[0].id;
  expect(two).toBe(one);
  const job = (await db.query<any>(`select * from metrix_claim_job('${pa}')`))
    .rows[0];
  expect(job.id).toBe(one);
  expect(
    (await db.query(`select * from metrix_claim_job('${pa}')`)).rows,
  ).toHaveLength(0);
  await expect(
    db.exec(`select metrix_finish_job('${one}','${b}','{}',true,null)`),
  ).rejects.toThrow(/lease/);
  await db.exec(
    `select metrix_finish_job('${one}','${job.lease_token}','{"stage":"done"}',true,null)`,
  );
  expect(
    (await db.query<any>(`select status from pipeline_jobs where id='${one}'`))
      .rows[0].status,
  ).toBe("completed");
});
it("changes source identity atomically without losing historical posts", async () => {
  await db.exec(`select metrix_save_accounts('${pb}','${b}','[{"platform":"instagram","handle":"old"}]');
 update social_accounts set external_id='123',sync_cursor='cursor' where project_id='${pb}';
 update mentions set social_account_id=(select id from social_accounts where project_id='${pb}') where project_id='${pb}';
 select metrix_save_accounts('${pb}','${b}','[{"platform":"instagram","handle":"new"}]');`);
  expect(
    (
      await db.query<any>(
        `select handle,external_id,sync_cursor from social_accounts where project_id='${pb}'`,
      )
    ).rows[0],
  ).toEqual({ handle: "new", external_id: null, sync_cursor: null });
  expect(
    (
      await db.query<any>(
        `select social_account_id from mentions where project_id='${pb}'`,
      )
    ).rows[0].social_account_id,
  ).toBeNull();
});
it("counts the complete dataset and excludes test records", async () => {
  await db.exec(`insert into mentions(project_id,user_id,platform,external_id,content,published_at,likes,is_test)
 select '${pb}','${b}','X','bulk-'||n,'bulk',now(),1,n>1100 from generate_series(1,1105)n;`);
  await db.exec(
    `set role authenticated;select set_config('request.jwt.claim.sub','${b}',false)`,
  );
  try {
    const value = (await db.query<any>(`select metrix_dashboard('${pb}') v`))
      .rows[0].v;
    expect(
      value.platforms.reduce((sum: number, r: any) => sum + Number(r.items), 0),
    ).toBe(1101);
  } finally {
    await db.exec("reset role");
  }
});
it("enforces database quotas and resets expired windows", async () => {
  expect(
    (await db.query<any>(`select metrix_take_quota('test',1,60) allowed`))
      .rows[0].allowed,
  ).toBe(true);
  expect(
    (await db.query<any>(`select metrix_take_quota('test',1,60) allowed`))
      .rows[0].allowed,
  ).toBe(false);
  await db.exec(
    `update request_quotas set resets_at=now()-interval '1 second' where key='test'`,
  );
  expect(
    (await db.query<any>(`select metrix_take_quota('test',1,60) allowed`))
      .rows[0].allowed,
  ).toBe(true);
});
it("backs off failures and bounds recovery of crashed workers", async () => {
  const id = (
    await db.query<any>(`select metrix_enqueue('${pb}','${b}','full','ar') id`)
  ).rows[0].id;
  const job = (await db.query<any>(`select * from metrix_claim_job('${pb}')`))
    .rows[0];
  await db.exec(
    `select metrix_finish_job('${id}','${job.lease_token}','{}',false,'failure')`,
  );
  expect(
    (await db.query(`select * from metrix_claim_job('${pb}')`)).rows,
  ).toHaveLength(0);
  await db.exec(
    `update pipeline_jobs set status='running',attempts=4,lease_until=now()-interval '1 minute' where id='${id}'`,
  );
  expect(
    (await db.query(`select * from metrix_claim_job('${pb}')`)).rows,
  ).toHaveLength(0);
  expect(
    (await db.query<any>(`select status from pipeline_jobs where id='${id}'`))
      .rows[0].status,
  ).toBe("failed");
});

it("rolls back enrichment when any item belongs to another project", async () => {
  const own = (
    await db.query<any>(
      `select id from mentions where project_id='${pa}' limit 1`,
    )
  ).rows[0].id;
  const foreign = (
    await db.query<any>(
      `select id from mentions where project_id='${pb}' limit 1`,
    )
  ).rows[0].id;
  const item = (id: string) => ({
    id,
    sentiment: "positive",
    confidence: 0.9,
    emotion: "joy",
    topics: ["education"],
  });
  await expect(
    db.query(`select metrix_apply_enrichment($1,$2,$3::jsonb)`, [
      pa,
      a,
      JSON.stringify([item(own), item(foreign)]),
    ]),
  ).rejects.toThrow("Invalid mention");
  expect(
    (await db.query<any>("select enriched_at from mentions where id=$1", [own]))
      .rows[0].enriched_at,
  ).toBeNull();
  await db.query(`select metrix_apply_enrichment($1,$2,$3::jsonb)`, [
    pa,
    a,
    JSON.stringify([item(own)]),
  ]);
  expect(
    (await db.query<any>("select sentiment from mentions where id=$1", [own]))
      .rows[0].sentiment,
  ).toBe("positive");
  expect(
    (
      await db.query<any>(
        "select topic from mention_topics where mention_id=$1",
        [own],
      )
    ).rows,
  ).toEqual([{ topic: "education" }]);
});

it("upgrades legacy sentiment and global identity constraints without losing rows", async () => {
  await db.exec(`alter table mentions drop constraint mentions_sentiment_check;
 alter table mentions add constraint mentions_sentiment_check check(sentiment is null or sentiment in ('positive','neutral','negative'));
 create unique index mentions_platform_external_id_unique on mentions(platform,external_id) where external_id is not null;`);
  const f = (await readdir("supabase/migrations")).find((f) =>
    f.endsWith("_legacy_schema_compatibility.sql"),
  )!;
  await db.exec(await readFile(`supabase/migrations/${f}`, "utf8"));
  await db.exec(`update mentions set sentiment='very_positive' where project_id='${pa}';
 insert into mentions(project_id,user_id,platform,external_id) values('${pb}','${b}','X','one');`);
  expect(
    (
      await db.query<any>(
        "select count(*)::int n from mentions where external_id='one'",
      )
    ).rows[0].n,
  ).toBe(2);
  await expect(
    db.exec(
      `insert into mentions(project_id,user_id,platform,external_id) values('${pb}','${b}','X','one')`,
    ),
  ).rejects.toThrow();
});
