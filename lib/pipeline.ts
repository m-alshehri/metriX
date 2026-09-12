import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";
import { collectFromEnsembleData, type SocialAccount } from "@/lib/ensembledata";
import { collectFacebook, collectLinkedIn, collectGoogleMapsReviews } from "@/lib/brightdata";

function outputText(payload: any) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  for (const o of payload?.output || []) {
    for (const c of o?.content || []) {
      if (typeof c?.text === "string") return c.text;
    }
  }
  return "";
}

async function markAccount(db: any, id: string, status: string, error?: string | null, externalId?: string | null) {
  const patch: any = {
    last_synced_at: new Date().toISOString(),
    last_sync_status: status,
    last_sync_error: error || null,
    updated_at: new Date().toISOString(),
  };
  if (externalId) patch.external_id = externalId;
  await db.from("social_accounts").update(patch).eq("id", id);
}

async function insertMention(db: any, projectId: string, userId: string, account: SocialAccount, m: any) {
  const { error } = await db.from("mentions").insert({
    user_id: userId,
    project_id: projectId,
    social_account_id: account.id,
    keyword_id: null,
    platform: m.platform,
    external_id: m.external_id,
    author_name: m.author_name,
    author_username: m.author_username,
    content: m.content,
    post_url: m.post_url,
    published_at: m.published_at,
    likes: m.likes || 0,
    shares: m.shares || 0,
    replies: m.replies || 0,
    views: m.views || 0,
    sentiment: null,
    language: null,
  });

  if (!error) return 1;
  if (String(error.code) === "23505") return 0;
  console.error("mention insert error", error);
  return 0;
}

async function analyzeSentiment(db: any, projectId: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return 0;
  let analyzed = 0;

  for (let batch = 0; batch < 5; batch++) {
    const { data: rows } = await db
      .from("mentions")
      .select("id,content")
      .eq("project_id", projectId)
      .is("sentiment", null)
      .not("content", "is", null)
      .limit(50);

    if (!rows?.length) break;

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        store: false,
        input:
          "Classify sentiment for each social-media item. Handle English, Arabic, Saudi/Gulf dialect, code-switching, emoji and sarcasm. Return exactly one result per id.\n" +
          JSON.stringify(rows),
        text: {
          format: {
            type: "json_schema",
            name: "sentiment_batch",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["items"],
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["id", "sentiment"],
                    properties: {
                      id: { type: "string" },
                      sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    });

    if (!r.ok) {
      console.error("sentiment error", await r.text());
      break;
    }

    let parsed: any = { items: [] };
    try {
      parsed = JSON.parse(outputText(await r.json()) || '{"items":[]}');
    } catch {}

    for (const x of parsed.items || []) {
      const { error } = await db
        .from("mentions")
        .update({ sentiment: x.sentiment })
        .eq("project_id", projectId)
        .eq("id", x.id);
      if (!error) analyzed++;
    }
  }

  return analyzed;
}

async function refreshInsights(db: any, projectId: string, userId: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return;

  const { data: mentions } = await db
    .from("mentions")
    .select("platform,content,sentiment,likes,shares,replies,views,published_at")
    .eq("project_id", projectId)
    .order("published_at", { ascending: false })
    .limit(100);

  if (!mentions?.length) return;

  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5.6-luna",
      store: false,
      input:
        "You are the intelligence layer of metriX. Analyze these account-based social media records. Produce concise executive summary, top topics, positive drivers, negative drivers, risks, opportunities and recommendations. Be evidence-based and do not invent missing facts.\n" +
        JSON.stringify(mentions),
      text: {
        format: {
          type: "json_schema",
          name: "project_insights",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: [
              "executive_summary",
              "top_topics",
              "positive_drivers",
              "negative_drivers",
              "risks",
              "opportunities",
              "recommendations",
            ],
            properties: {
              executive_summary: { type: "string" },
              top_topics: { type: "array", items: { type: "string" } },
              positive_drivers: { type: "array", items: { type: "string" } },
              negative_drivers: { type: "array", items: { type: "string" } },
              risks: { type: "array", items: { type: "string" } },
              opportunities: { type: "array", items: { type: "string" } },
              recommendations: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
    }),
  });

  if (!r.ok) return;
  let parsed: any;
  try {
    parsed = JSON.parse(outputText(await r.json()) || "{}");
  } catch {
    return;
  }

  const payload = {
    ...parsed,
    mentions_analyzed: mentions.length,
    generated_at: new Date().toISOString(),
  };

  const { data: existing } = await db
    .from("project_insights")
    .select("id")
    .eq("project_id", projectId)
    .maybeSingle();

  if (existing?.id) {
    await db.from("project_insights").update({ insights: payload, updated_at: new Date().toISOString() }).eq("id", existing.id);
  } else {
    await db.from("project_insights").insert({
      project_id: projectId,
      user_id: userId,
      insights: payload,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
}

async function scanAlerts(db: any, projectId: string, userId: string) {
  const { data: settings } = await db
    .from("project_settings")
    .select("negative_threshold")
    .eq("project_id", projectId)
    .maybeSingle();

  const threshold = Number(settings?.negative_threshold || 30);

  const { data: recent } = await db
    .from("mentions")
    .select("id,platform,content,sentiment,likes,shares,replies,views,published_at")
    .eq("project_id", projectId)
    .order("published_at", { ascending: false })
    .limit(100);

  if (!recent?.length) return 0;
  const analyzed = recent.filter((m: any) => m.sentiment);
  const negative = analyzed.filter((m: any) => m.sentiment === "negative");
  const pct = analyzed.length ? (negative.length / analyzed.length) * 100 : 0;
  let alerts = 0;

  if (analyzed.length >= 10 && pct >= threshold) {
    const { error } = await db.from("project_alerts").insert({
      project_id: projectId,
      user_id: userId,
      severity: pct >= 50 ? "high" : "medium",
      title: "Negative sentiment threshold reached",
      description: `${Math.round(pct)}% of the latest analyzed items are negative.`,
      metadata: { negative_percentage: pct, analyzed: analyzed.length },
      created_at: new Date().toISOString(),
    });
    if (!error) alerts++;
  }

  const highNegative = negative
    .map((m: any) => ({
      ...m,
      engagement: Number(m.likes || 0) + Number(m.shares || 0) + Number(m.replies || 0),
    }))
    .filter((m: any) => m.engagement >= 50)
    .slice(0, 3);

  for (const m of highNegative) {
    const { error } = await db.from("project_alerts").insert({
      project_id: projectId,
      user_id: userId,
      severity: "high",
      title: `High-engagement negative ${m.platform} content`,
      description: String(m.content || "").slice(0, 500),
      metadata: { mention_id: m.id, engagement: m.engagement, platform: m.platform },
      created_at: new Date().toISOString(),
    });
    if (!error) alerts++;
  }

  return alerts;
}

export async function runProjectPipeline(projectId: string, userId: string) {
  const db = createAdminClient();
  const startedAt = new Date().toISOString();

  const { data: run } = await db
    .from("pipeline_runs")
    .insert({
      project_id: projectId,
      user_id: userId,
      status: "running",
      started_at: startedAt,
      details: { provider: "EnsembleData", mode: "account_based" },
    })
    .select("id")
    .single();

  let imported = 0;
  let analyzed = 0;
  let alerts = 0;
  const details: Record<string, any> = {};

  try {
    const { data: accounts, error } = await db
      .from("social_accounts")
      .select("id,user_id,project_id,platform,handle,external_id")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .eq("enabled", true);

    if (error) throw error;

    for (const raw of accounts || []) {
      const account = raw as SocialAccount;
      const p = String(account.platform || "").toLowerCase();

      try {
        let result: any;
        let provider = "EnsembleData";
        if (p === "facebook") { provider = "Bright Data"; result = await collectFacebook(account.handle); }
        else if (p === "linkedin") { provider = "Bright Data"; result = await collectLinkedIn(account.handle); }
        else if (p === "google_maps") { provider = "Bright Data"; result = await collectGoogleMapsReviews(account.handle); }
        else if (["x","youtube","instagram","tiktok","threads","reddit","snapchat"].includes(p)) { result = await collectFromEnsembleData(account); }
        else { details[p] = { imported: 0, status: "unsupported" }; continue; }

        let n = 0;
        for (const mention of result.mentions || []) n += await insertMention(db, projectId, userId, account, mention);
        imported += n;
        await markAccount(db, account.id, "success", null, result.externalId || null);
        details[p] = { imported: n, fetched: result.mentions?.length || 0, status: "success", provider };
      } catch (e: any) {
        const message = String(e?.message || e);
        await markAccount(db, account.id, "failed", message);
        details[p] = { imported: 0, status: "failed", error: message, provider: ["facebook","linkedin","google_maps"].includes(p) ? "Bright Data" : "EnsembleData" };
      }
    }

    analyzed = await analyzeSentiment(db, projectId);
    await refreshInsights(db, projectId, userId);
    alerts = await scanAlerts(db, projectId, userId);

    if (run?.id) {
      await db
        .from("pipeline_runs")
        .update({
          status: "success",
          finished_at: new Date().toISOString(),
          imported,
          analyzed,
          alerts,
          details: {
            provider: "EnsembleData",
            mode: "account_based",
            platforms: details,
          },
        })
        .eq("id", run.id);
    }

    return { imported, analyzed, alerts, details };
  } catch (e: any) {
    if (run?.id) {
      await db
        .from("pipeline_runs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          imported,
          analyzed,
          alerts,
          details: { provider: "EnsembleData", error: String(e?.message || e), platforms: details },
        })
        .eq("id", run.id);
    }
    throw e;
  }
}
