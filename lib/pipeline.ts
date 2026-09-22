import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";
import { checked } from "@/lib/db-result";
import { BrightDataBudgetPausedError } from "@/lib/brightdata-budget";
import { collectFromEnsembleData } from "@/lib/ensembledata";
import {
  collectFacebook,
  collectLinkedIn,
  collectGoogleMapsReviews,
  resumeBrightDataSnapshot,
  isBrightDataPending,
} from "@/lib/brightdata";
import {
  authorSignals,
  contentHash,
  detectLanguageHeuristic,
  extractTextMetadata,
  inferMedia,
  recoverContent,
} from "@/lib/mention-utils";
import { generate, insightSchema, validateInsight, sentiments } from "@/lib/ai";
import { fetchJson } from "@/lib/http";
import { escapeHtml, safePublicUrl } from "@/lib/security";

type DB = ReturnType<typeof createAdminClient>;
type State = {
  stage: string;
  account: number;
  accounts?: any[];
  imported?: number;
  analyzed?: number;
  alerts?: number;
  pending?: number;
  paused?: number;
  batches?: number;
  runId?: string;
};
export type PipelineJob = {
  id: string;
  project_id: string;
  user_id: string;
  mode: string;
  locale: string;
  state: State;
};
const stamp = () => new Date().toISOString();
const num = (x: unknown) => Math.max(0, Number(x) || 0);
const provider = (platform: string) =>
  ["facebook", "linkedin", "google_maps"].includes(platform)
    ? "Bright Data"
    : "EnsembleData";

async function recordUsage(
  db: DB,
  j: PipelineJob,
  type: string,
  quantity: number,
  source: string,
) {
  checked(
    await db.from("metrix_usage_events").insert({
      project_id: j.project_id,
      user_id: j.user_id,
      event_type: type,
      quantity,
      provider: source,
      metadata: { job_id: j.id },
    }),
  );
}
async function collect(db: DB, j: PipelineJob, a: any) {
  const p = a.platform,
    source = provider(p);
  let snapshotId: string | null = null;
  if (source === "Bright Data") {
    const job = checked(
      await db
        .from("provider_jobs")
        .select("*")
        .eq("social_account_id", a.id)
        .eq("status", "processing")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    );
    snapshotId = job?.external_job_id || null;
    if (j.mode === "recover" && !snapshotId)
      return { count: 0, pending: false };
  }
  try {
    const result = snapshotId
      ? await resumeBrightDataSnapshot(snapshotId, p, a.handle)
      : p === "facebook"
        ? await collectFacebook(a.handle, a.id)
        : p === "linkedin"
          ? await collectLinkedIn(a.handle, a.id)
          : p === "google_maps"
            ? await collectGoogleMapsReviews(a.handle, a.id)
            : await collectFromEnsembleData(a);
    const rows = (result.mentions || []).map((m: any) => {
      const content = recoverContent(m.raw_data, String(m.content || "")).slice(
          0,
          20000,
        ),
        lang = detectLanguageHeuristic(content),
        media = inferMedia(m.raw_data);
      return {
        project_id: j.project_id,
        user_id: j.user_id,
        social_account_id: a.id,
        platform: m.platform,
        external_id: m.external_id,
        author_name: m.author_name,
        author_username: m.author_username,
        content,
        post_url: safePublicUrl(m.post_url),
        published_at: m.published_at,
        likes: num(m.likes),
        shares: num(m.shares),
        replies: num(m.replies),
        views: num(m.views),
        raw_data: m.raw_data || null,
        content_hash: contentHash(m.platform, content, m.author_username),
        detected_language: lang,
        media_type: media.mediaType,
        media_url: media.mediaUrl,
        thumbnail_url: media.thumbnailUrl,
        media_count: media.mediaCount,
        ...extractTextMetadata(content),
        last_seen_at: stamp(),
        updated_at: stamp(),
        quality_status: content.length < 2 ? "incomplete" : "ok",
        virality_score:
          Math.round(
            ((num(m.likes) + num(m.shares) + num(m.replies)) /
              Math.sqrt(
                Math.max(
                  1,
                  (Date.now() - Date.parse(m.published_at)) / 3600000,
                ),
              )) *
              100,
          ) / 100,
      };
    });
    // Convert metadata names once at the boundary.
    for (const r of rows as any[]) {
      r.mentioned_users = r.mentionedUsers;
      r.outbound_urls = r.outboundUrls;
      r.outbound_domains = r.outboundDomains;
      delete r.mentionedUsers;
      delete r.outboundUrls;
      delete r.outboundDomains;
    }
    const unique = Array.from(
      new Map(rows.map((r: any) => [r.external_id, r])).values(),
    ) as any[];
    if (unique.length) {
      const saved =
        checked(
          await db
            .from("mentions")
            .upsert(unique, { onConflict: "project_id,external_id" })
            .select("id,likes,shares,replies,views"),
        ) || [];
      checked(
        await db.from("mention_metrics_history").upsert(
          saved.map((m) => ({
            mention_id: m.id,
            project_id: j.project_id,
            user_id: j.user_id,
            likes: m.likes,
            shares: m.shares,
            replies: m.replies,
            views: m.views,
            sample_key: j.id,
          })),
          { onConflict: "mention_id,sample_key" },
        ),
      );
    }
    const authors = new Map<string, any>();
    for (const m of unique) {
      const a = authorSignals(m.raw_data);
      if (!m.author_username || a.followers === null) continue;
      authors.set(`${m.platform}:${m.author_username}`, {
        project_id: j.project_id,
        user_id: j.user_id,
        social_account_id: m.social_account_id,
        platform: m.platform,
        author_username: m.author_username,
        author_name: m.author_name,
        followers: a.followers,
        following: a.following,
        verified: a.verified,
        biography: a.biography,
        account_category: a.category,
        location: a.location,
        influence_score:
          a.followers * 0.6 + (m.likes + m.shares + m.replies) * 0.4,
        sample_key: j.id,
      });
    }
    if (authors.size)
      checked(
        await db.from("author_snapshots").upsert([...authors.values()], {
          onConflict: "project_id,platform,author_username,sample_key",
        }),
      );
    // Mark snapshots complete only AFTER every normalized row is persisted.
    if (snapshotId)
      checked(
        await db
          .from("provider_jobs")
          .update({
            status: "completed",
            completed_at: stamp(),
            updated_at: stamp(),
            returned_rows: unique.length,
            last_error: null,
          })
          .eq("provider", "Bright Data")
          .eq("external_job_id", snapshotId),
      );
    checked(
      await db
        .from("social_accounts")
        .update({
          external_id: result.externalId || a.external_id,
          last_synced_at: stamp(),
          last_successful_sync: stamp(),
          last_sync_status: unique.length ? "success" : "no_data",
          last_sync_error: null,
          consecutive_failures: 0,
          next_retry_at: null,
          provider: source,
        })
        .eq("id", a.id)
        .eq("handle", a.handle),
    );
    checked(
      await db.from("sync_events").insert({
        project_id: j.project_id,
        user_id: j.user_id,
        social_account_id: a.id,
        platform: p,
        provider: source,
        status: unique.length ? "success" : "no_data",
        fetched: unique.length,
        returned: unique.length,
        normalized: unique.length,
        updated: unique.length,
        snapshot_id: snapshotId,
      }),
    );
    await recordUsage(db, j, "provider_records", unique.length, source);
    return { count: unique.length, pending: false };
  } catch (error) {
    if (error instanceof BrightDataBudgetPausedError) {
      checked(
        await db
          .from("social_accounts")
          .update({
            last_sync_status: "paused",
            last_sync_error: error.message,
            provider: source,
          })
          .eq("id", a.id),
      );
      return { count: 0, pending: false, paused: true };
    }
    if (isBrightDataPending(error)) {
      checked(
        await db.from("provider_jobs").upsert(
          {
            project_id: j.project_id,
            user_id: j.user_id,
            social_account_id: a.id,
            provider: "Bright Data",
            platform: p,
            external_job_id: error.snapshotId,
            status: "processing",
            next_retry_at: new Date(Date.now() + 10 * 60000).toISOString(),
            updated_at: stamp(),
          },
          { onConflict: "provider,external_job_id" },
        ),
      );
      checked(
        await db
          .from("social_accounts")
          .update({
            last_sync_status: "processing",
            provider: source,
            last_sync_error: null,
          })
          .eq("id", a.id),
      );
      return { count: 0, pending: true };
    }
    checked(
      await db
        .from("social_accounts")
        .update({
          last_sync_status: "failed",
          last_sync_error: "Collection failed; retry scheduled.",
          provider: source,
        })
        .eq("id", a.id),
    );
    throw error;
  }
}

async function enrich(db: DB, j: PipelineJob) {
  const rows =
    checked(
      await db
        .from("mentions")
        .select("id,content")
        .eq("project_id", j.project_id)
        .eq("is_test", false)
        .is("enriched_at", null)
        .not("content", "is", null)
        .neq("quality_status", "incomplete")
        .order("id")
        .limit(25),
    ) || [];
  if (!rows.length) return 0;
  const props = {
    id: { type: "string" },
    sentiment: { type: "string", enum: sentiments },
    confidence: { type: "number" },
    emotion: {
      type: "string",
      enum: [
        "joy",
        "anger",
        "sadness",
        "fear",
        "surprise",
        "disgust",
        "neutral",
      ],
    },
    topics: { type: "array", items: { type: "string" } },
  };
  const result = await generate(
    {
      type: "object",
      additionalProperties: false,
      required: ["items"],
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: Object.keys(props),
            properties: props,
          },
        },
      },
    },
    "Classify sentiment toward the discussed subject into five levels, including Arabic/Gulf dialect and sarcasm. Return one result for every ID, confidence 0–1, dominant emotion, and at most three short topics.",
    rows.map((m) => ({ ...m, content: String(m.content).slice(0, 2000) })),
    j.locale,
  );
  const valid = new Set(rows.map((x) => x.id)),
    seen = new Set<string>();
  if (!Array.isArray(result.items) || result.items.length !== rows.length)
    throw new Error("Incomplete enrichment");
  for (const x of result.items) {
    if (
      !valid.has(x.id) ||
      seen.has(x.id) ||
      !sentiments.includes(x.sentiment) ||
      !Number.isFinite(x.confidence) ||
      !Array.isArray(x.topics) ||
      x.topics.some((v: unknown) => typeof v !== "string")
    )
      throw new Error("Invalid enrichment");
    seen.add(x.id);
  }
  checked(
    await db.rpc("metrix_apply_enrichment", {
      p_project: j.project_id,
      p_user: j.user_id,
      p_items: result.items,
    }),
  );
  await recordUsage(db, j, "ai_enrichment", rows.length, "OpenAI");
  return rows.length;
}
async function insights(db: DB, j: PipelineJob) {
  if (
    checked(
      await db
        .from("project_insights")
        .select("id")
        .eq("generation_key", j.id)
        .maybeSingle(),
    )
  )
    return;
  const rows =
    checked(
      await db
        .from("mentions")
        .select("id,platform,content,sentiment,likes,shares,replies,views")
        .eq("project_id", j.project_id)
        .eq("is_test", false)
        .order("published_at", { ascending: false })
        .limit(100),
    ) || [];
  if (!rows.length) return;
  const value = validateInsight(
    await generate(
      insightSchema,
      "Create an evidence-based executive summary, recurring topics, positive/negative drivers, risks, opportunities and recommendations. State uncertainty. Empty lists are valid when evidence is insufficient.",
      rows.map((x) => ({
        ...x,
        content: String(x.content || "").slice(0, 1200),
      })),
      j.locale,
    ),
  );
  checked(
    await db.from("project_insights").insert({
      ...value,
      project_id: j.project_id,
      user_id: j.user_id,
      generation_key: j.id,
      mentions_analyzed: rows.length,
      generated_at: stamp(),
    }),
  );
  await recordUsage(db, j, "ai_project_insight", 1, "OpenAI");
}
async function metrics(db: DB, j: PipelineJob) {
  const rows =
    checked(
      await db.rpc("metrix_daily_metrics", {
        p_project: j.project_id,
        p_days: 180,
      }),
    ) || [];
  if (rows.length)
    checked(
      await db.from("project_daily_metrics").upsert(
        rows.map((r: any) => ({
          ...r,
          project_id: j.project_id,
          user_id: j.user_id,
        })),
        { onConflict: "project_id,metric_date" },
      ),
    );
}
async function alerts(db: DB, j: PipelineJob) {
  const s = checked(
    await db
      .from("project_settings")
      .select("*")
      .eq("project_id", j.project_id)
      .maybeSingle(),
  );
  const now = Date.now(),
    day = 86400000,
    days = s?.comparison_window_days || 7;
  const query = (from: number, to: number) =>
    db
      .from("mentions")
      .select("id", { count: "exact", head: true })
      .eq("project_id", j.project_id)
      .eq("is_test", false)
      .gte("published_at", new Date(from).toISOString())
      .lt("published_at", new Date(to).toISOString());
  const results = await Promise.all([
    query(now - day, now),
    query(now - day, now).not("sentiment", "is", null),
    query(now - day, now).in("sentiment", ["negative", "very_negative"]),
    query(now - (days + 1) * day, now - day),
  ]);
  results.forEach((r) => checked(r));
  const [volume, analyzed, negative, prior] = results.map((r) => r.count || 0),
    percent = analyzed ? (negative / analyzed) * 100 : 0,
    baseline = prior / days;
  const entries: any[] = [];
  if (analyzed >= 10 && percent >= (s?.negative_threshold ?? 40))
    entries.push({
      alert_type: "negative_sentiment",
      severity: percent >= 50 ? "high" : "medium",
      title:
        j.locale === "ar"
          ? "ارتفاع نسبة المشاعر السلبية"
          : "Negative sentiment threshold reached",
      description: `${percent.toFixed(1)}% (${negative}/${analyzed})`,
      metadata: {
        percent,
        negative_mentions: negative,
        analyzed_mentions: analyzed,
      },
    });
  if (
    s?.anomaly_alerts_enabled !== false &&
    baseline >= 2 &&
    volume >= baseline * (s?.spike_multiplier ?? 1.5)
  )
    entries.push({
      alert_type: "conversation_spike",
      severity: volume >= baseline * 3 ? "high" : "medium",
      title: j.locale === "ar" ? "ارتفاع حجم المحادثات" : "Conversation spike",
      description: `${volume} / ${baseline.toFixed(1)}`,
      metadata: {
        multiplier: volume / baseline,
        baseline_mentions: prior,
        baseline_days: days,
      },
    });
  for (const e of entries)
    checked(
      await db.from("project_alerts").upsert(
        {
          ...e,
          project_id: j.project_id,
          user_id: j.user_id,
          dedupe_key: `${e.alert_type}:${stamp().slice(0, 10)}`,
          detected_at: stamp(),
          is_active: true,
        },
        { onConflict: "project_id,dedupe_key", ignoreDuplicates: true },
      ),
    );
  return entries.length;
}
async function email(db: DB, j: PipelineJob) {
  const s = checked(
    await db
      .from("project_settings")
      .select("email_alerts_enabled,alert_email")
      .eq("project_id", j.project_id)
      .maybeSingle(),
  );
  if (!s?.email_alerts_enabled || !s.alert_email) return;
  const alerts =
    checked(
      await db
        .from("project_alerts")
        .select("id,title,description,detected_at")
        .eq("project_id", j.project_id)
        .eq("is_active", true)
        .is("email_sent_at", null)
        .in("severity", ["high", "critical"])
        .gte("detected_at", new Date(Date.now() - 86400000).toISOString())
        .order("detected_at")
        .limit(1),
    ) || [];
  if (
    alerts.length &&
    (!process.env.RESEND_API_KEY || !process.env.ALERT_FROM_EMAIL)
  )
    throw new Error("Alert email is not configured");
  for (const a of alerts) {
    await fetchJson("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `metrix-alert-${a.id}`,
      },
      body: JSON.stringify({
        from: process.env.ALERT_FROM_EMAIL,
        to: [s.alert_email],
        subject: a.title,
        html: `<h2>${escapeHtml(a.title)}</h2><p>${escapeHtml(a.description)}</p>`,
      }),
    });
    checked(
      await db
        .from("project_alerts")
        .update({ email_sent_at: stamp() })
        .eq("id", a.id),
    );
  }
  return alerts.length > 0;
}
async function summary(db: DB, j: PipelineJob) {
  const s = checked(
    await db
      .from("project_settings")
      .select("daily_summary_enabled")
      .eq("project_id", j.project_id)
      .maybeSingle(),
  );
  if (s?.daily_summary_enabled === false) return;
  const date = stamp().slice(0, 10);
  if (
    checked(
      await db
        .from("daily_project_summaries")
        .select("id")
        .eq("project_id", j.project_id)
        .eq("summary_date", date)
        .maybeSingle(),
    )
  )
    return;
  const rows =
    checked(
      await db
        .from("mentions")
        .select("content,sentiment,platform")
        .eq("project_id", j.project_id)
        .eq("is_test", false)
        .gte("published_at", new Date(Date.now() - 86400000).toISOString())
        .order("published_at", { ascending: false })
        .limit(100),
    ) || [];
  if (!rows.length) return;
  const x = validateInsight(
    await generate(
      insightSchema,
      "Summarize the last 24 hours using this sample only.",
      rows.map((r) => ({
        ...r,
        content: String(r.content || "").slice(0, 1200),
      })),
      j.locale,
    ),
  );
  checked(
    await db.from("daily_project_summaries").upsert(
      {
        project_id: j.project_id,
        user_id: j.user_id,
        summary_date: date,
        executive_summary: x.executive_summary,
        highlights: x.top_topics,
        risks: x.risks,
        opportunities: x.opportunities,
        recommendations: x.recommendations,
        metrics: { sample_size: rows.length, window: "24h" },
      },
      { onConflict: "project_id,summary_date" },
    ),
  );
  await recordUsage(db, j, "ai_daily_summary", 1, "OpenAI");
}

export async function executeStage(
  j: PipelineJob,
): Promise<{ state: State; done: boolean }> {
  const db = createAdminClient(),
    state = { ...j.state };
  // Revalidate ownership even for jobs created before an account/project change.
  if (
    !checked(
      await db
        .from("projects")
        .select("id")
        .eq("id", j.project_id)
        .eq("user_id", j.user_id)
        .maybeSingle(),
    )
  )
    throw new Error("Project not found");
  if (!state.runId) {
    checked(
      await db.from("pipeline_runs").upsert(
        {
          id: j.id,
          project_id: j.project_id,
          user_id: j.user_id,
          status: "running",
          details: { mode: j.mode },
        },
        { onConflict: "id", ignoreDuplicates: true },
      ),
    );
    state.runId = j.id;
  }
  if (state.stage === "collect") {
    if (!state.accounts)
      state.accounts =
        checked(
          await db
            .from("social_accounts")
            .select("*")
            .eq("project_id", j.project_id)
            .eq("user_id", j.user_id)
            .eq("enabled", true)
            .order("id"),
        ) || [];
    const a = state.accounts[state.account];
    if (a) {
      const live = checked(
        await db
          .from("social_accounts")
          .select("*")
          .eq("id", a.id)
          .eq("project_id", j.project_id)
          .eq("handle", a.handle)
          .eq("enabled", true)
          .maybeSingle(),
      );
      if (
        live &&
        (j.mode !== "recover" || provider(live.platform) === "Bright Data")
      ) {
        const r = await collect(db, j, live);
        state.imported = (state.imported || 0) + r.count;
        state.pending = (state.pending || 0) + Number(r.pending);
        state.paused = (state.paused || 0) + Number("paused" in r && r.paused);
      }
      state.account++;
    } else state.stage = "enrich";
  } else if (state.stage === "enrich") {
    const count = await enrich(db, j);
    state.analyzed = (state.analyzed || 0) + count;
    state.batches = (state.batches || 0) + 1;
    // Bound one run's spend; remaining records are resumed by the next run.
    if (count === 0 || state.batches >= 10) state.stage = "insights";
  } else if (state.stage === "insights") {
    await insights(db, j);
    state.stage = "metrics";
  } else if (state.stage === "metrics") {
    await metrics(db, j);
    state.stage = "alerts";
  } else if (state.stage === "alerts") {
    state.alerts = await alerts(db, j);
    state.stage = "email";
  } else if (state.stage === "email") {
    if (!(await email(db, j))) state.stage = "summary";
  } else if (state.stage === "summary") {
    await summary(db, j);
    state.stage = "retention";
  } else if (state.stage === "retention") {
    const s = checked(
      await db
        .from("project_settings")
        .select("retention_days")
        .eq("project_id", j.project_id)
        .maybeSingle(),
    );
    checked(
      await db.rpc("metrix_apply_retention", {
        p_project_id: j.project_id,
        p_days: s?.retention_days || 365,
      }),
    );
    state.stage = "done";
  }
  const done = state.stage === "done";
  checked(
    await db
      .from("pipeline_runs")
      .update({
        status: done
          ? state.pending || state.paused
            ? "partial"
            : "success"
          : "running",
        imported: state.imported || 0,
        analyzed: state.analyzed || 0,
        alerts: state.alerts || 0,
        finished_at: done ? stamp() : null,
        details: {
          mode: j.mode,
          stage: state.stage,
          pending: state.pending || 0,
          paused: state.paused || 0,
          records_refreshed: state.imported || 0,
        },
      })
      .eq("id", state.runId),
  );
  return { state, done };
}
