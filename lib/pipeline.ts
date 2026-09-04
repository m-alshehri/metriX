import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";

type XPost = {
  id: string;
  text?: string;
  author_id?: string;
  created_at?: string;
  lang?: string;
  public_metrics?: {
    like_count?: number;
    reply_count?: number;
    repost_count?: number;
    quote_count?: number;
    impression_count?: number;
  };
};

type XUser = {
  id: string;
  name?: string;
  username?: string;
};

type MentionRow = {
  id: string;
  keyword_id?: string | null;
  platform?: string | null;
  external_id?: string | null;
  author_name?: string | null;
  author_username?: string | null;
  content?: string | null;
  post_url?: string | null;
  published_at?: string | null;
  likes?: number | null;
  shares?: number | null;
  replies?: number | null;
  views?: number | null;
  sentiment?: string | null;
  language?: string | null;
};

function query(keyword: string) {
  const clean = keyword.trim().replace(/"/g, '\\"');
  return `${clean.includes(" ") && !clean.startsWith("#") ? `"${clean}"` : clean} -is:retweet`;
}

function extractText(payload: any): string {
  if (typeof payload?.output_text === "string") return payload.output_text;
  for (const o of payload?.output || []) {
    for (const c of o?.content || []) {
      if (typeof c?.text === "string") return c.text;
    }
  }
  return "";
}

function engagement(m: MentionRow) {
  return Number(m.likes || 0) + Number(m.shares || 0) + Number(m.replies || 0);
}

function severityFromRatio(pct: number) {
  if (pct >= 70) return "critical";
  if (pct >= 55) return "high";
  return "medium";
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function openAI(input: string, schema: any) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY missing");

  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5.6-luna",
      store: false,
      input,
      text: {
        format: {
          type: "json_schema",
          name: "result",
          strict: true,
          schema,
        },
      },
    }),
  });

  if (!r.ok) throw new Error(`OpenAI ${r.status}`);
  return JSON.parse(extractText(await r.json()));
}

async function collectYouTube(
  db: any,
  projectId: string,
  userId: string,
  keywords: any[]
) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return { videos: 0, comments: 0 };

  let videos = 0;
  let comments = 0;
  const processedVideoComments = new Set<string>();

  for (const k of keywords || []) {
    const searchParams = new URLSearchParams({
      part: "snippet",
      type: "video",
      q: k.keyword,
      maxResults: "10",
      order: "date",
      key,
    });

    const sr = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${searchParams}`,
      { cache: "no-store" }
    );

    if (!sr.ok) {
      console.error("YouTube search failed", sr.status, await sr.text());
      continue;
    }

    const sj = await sr.json();
    const items = (sj.items || []).filter((x: any) => x?.id?.videoId);
    if (!items.length) continue;

    const ids = items.map((x: any) => x.id.videoId).join(",");
    const videoParams = new URLSearchParams({
      part: "snippet,statistics",
      id: ids,
      key,
    });

    const vr = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?${videoParams}`,
      { cache: "no-store" }
    );

    if (!vr.ok) {
      console.error("YouTube video details failed", vr.status, await vr.text());
      continue;
    }

    const vj = await vr.json();

    for (const v of vj.items || []) {
      const s = v.snippet || {};
      const st = v.statistics || {};
      const content = [s.title, s.description].filter(Boolean).join("\n\n");

      const { error } = await db.from("mentions").insert({
        user_id: userId,
        project_id: projectId,
        keyword_id: k.id,
        platform: "YouTube",
        external_id: `video:${v.id}`,
        author_name: s.channelTitle || null,
        author_username: s.channelId || null,
        content: content || null,
        post_url: `https://www.youtube.com/watch?v=${v.id}`,
        published_at: s.publishedAt || new Date().toISOString(),
        likes: Number(st.likeCount || 0),
        shares: 0,
        replies: Number(st.commentCount || 0),
        views: Number(st.viewCount || 0),
        sentiment: null,
        language: s.defaultLanguage || s.defaultAudioLanguage || null,
      });

      if (!error) {
        videos++;
        await db.from("usage_events").insert({
          user_id: userId,
          project_id: projectId,
          event_type: "mention_imported",
          metadata: { platform: "YouTube", type: "video" },
        });
      }

      if (processedVideoComments.has(v.id)) continue;
      processedVideoComments.add(v.id);

      const commentParams = new URLSearchParams({
        part: "snippet",
        videoId: v.id,
        maxResults: "20",
        order: "time",
        textFormat: "plainText",
        key,
      });

      const cr = await fetch(
        `https://www.googleapis.com/youtube/v3/commentThreads?${commentParams}`,
        { cache: "no-store" }
      );

      if (!cr.ok) {
        const body = await cr.text();
        if (cr.status !== 403) {
          console.error("YouTube comments failed", cr.status, body);
        }
        continue;
      }

      const cj = await cr.json();

      for (const thread of cj.items || []) {
        const c = thread?.snippet?.topLevelComment;
        const cs = c?.snippet;
        if (!c?.id || !cs?.textDisplay) continue;

        const { error: commentError } = await db.from("mentions").insert({
          user_id: userId,
          project_id: projectId,
          keyword_id: k.id,
          platform: "YouTube",
          external_id: `comment:${c.id}`,
          author_name: cs.authorDisplayName || null,
          author_username: cs.authorChannelId?.value || null,
          content: cs.textDisplay,
          post_url: `https://www.youtube.com/watch?v=${v.id}&lc=${encodeURIComponent(
            c.id
          )}`,
          published_at: cs.publishedAt || new Date().toISOString(),
          likes: Number(cs.likeCount || 0),
          shares: 0,
          replies: Number(thread?.snippet?.totalReplyCount || 0),
          views: 0,
          sentiment: null,
          language: null,
        });

        if (!commentError) {
          comments++;
          await db.from("usage_events").insert({
            user_id: userId,
            project_id: projectId,
            event_type: "mention_imported",
            metadata: {
              platform: "YouTube",
              type: "comment",
              video_id: v.id,
            },
          });
        }
      }
    }
  }

  return { videos, comments };
}

async function hasRecentAlert(
  db: any,
  projectId: string,
  alertType: string,
  fingerprint: string,
  cooldownHours = 12
) {
  const since = new Date(Date.now() - cooldownHours * 60 * 60 * 1000).toISOString();

  const { data } = await db
    .from("project_alerts")
    .select("id,metadata,detected_at")
    .eq("project_id", projectId)
    .eq("alert_type", alertType)
    .gte("detected_at", since)
    .order("detected_at", { ascending: false })
    .limit(20);

  return (data || []).some(
    (a: any) => String(a?.metadata?.fingerprint || "") === fingerprint
  );
}

async function createAlert(
  db: any,
  {
    userId,
    projectId,
    alertType,
    severity,
    title,
    description,
    metadata,
    settings,
    cooldownHours = 12,
  }: {
    userId: string;
    projectId: string;
    alertType: string;
    severity: "low" | "medium" | "high" | "critical";
    title: string;
    description: string;
    metadata: Record<string, any>;
    settings: any;
    cooldownHours?: number;
  }
) {
  const fingerprint = String(
    metadata.fingerprint || `${alertType}:${metadata.keyword_id || "project"}`
  );

  if (
    await hasRecentAlert(
      db,
      projectId,
      alertType,
      fingerprint,
      cooldownHours
    )
  ) {
    return false;
  }

  const inserted = (
    await db
      .from("project_alerts")
      .insert({
        user_id: userId,
        project_id: projectId,
        alert_type: alertType,
        severity,
        title,
        description,
        metadata: { ...metadata, fingerprint },
        is_active: true,
      })
      .select("id,severity,title,description")
      .single()
  ).data;

  if (!inserted) return false;

  if (
    ["high", "critical"].includes(inserted.severity) &&
    settings?.email_alerts_enabled &&
    settings?.alert_email
  ) {
    await sendAlert(
      settings.alert_email,
      inserted.title,
      inserted.description,
      inserted.id
    );
  }

  return true;
}

async function runCrisisEngine(
  db: any,
  projectId: string,
  userId: string,
  keywords: any[],
  settings: any
) {
  let alertCount = 0;

  const now = Date.now();
  const currentStart = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const baselineStart = new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString();

  const { data: recentData } = await db
    .from("mentions")
    .select(
      "id,keyword_id,platform,external_id,author_name,author_username,content,post_url,published_at,likes,shares,replies,views,sentiment,language"
    )
    .eq("project_id", projectId)
    .gte("published_at", baselineStart)
    .order("published_at", { ascending: false })
    .limit(1000);

  const recent = (recentData || []) as MentionRow[];
  const current = recent.filter(
    (m) => m.published_at && new Date(m.published_at).getTime() >= new Date(currentStart).getTime()
  );
  const baseline = recent.filter(
    (m) => m.published_at && new Date(m.published_at).getTime() < new Date(currentStart).getTime()
  );

  const analyzedCurrent = current.filter((m) =>
    ["positive", "neutral", "negative"].includes(String(m.sentiment))
  );
  const negativeCurrent = analyzedCurrent.filter(
    (m) => m.sentiment === "negative"
  );

  const negativeThreshold = Number(settings?.negative_threshold || 40);
  const spikeMultiplier = Number(settings?.spike_multiplier || 1.5);

  // 1) Negative sentiment alert
  if (analyzedCurrent.length >= 5) {
    const pct = Math.round(
      (negativeCurrent.length / analyzedCurrent.length) * 100
    );

    if (pct >= negativeThreshold) {
      const created = await createAlert(db, {
        userId,
        projectId,
        alertType: "negative_sentiment",
        severity: severityFromRatio(pct),
        title: "Elevated negative sentiment",
        description: `Negative mentions are ${pct}% of analyzed mentions in the last 24 hours.`,
        metadata: {
          fingerprint: "negative_sentiment:project",
          percent: pct,
          analyzed_mentions: analyzedCurrent.length,
          negative_mentions: negativeCurrent.length,
          window_hours: 24,
        },
        settings,
        cooldownHours: 12,
      });
      if (created) alertCount++;
    }
  }

  // 2) Conversation spike alert
  const baselineDays = new Set(
    baseline
      .map((m) => m.published_at?.slice(0, 10))
      .filter(Boolean)
  ).size;

  // Require a meaningful historical baseline before declaring a spike.
  // This protects new/low-data projects from exaggerated multipliers.
  const hasReliableBaseline = baseline.length >= 10 && baselineDays >= 3;
  const baselineDailyAverage =
    baselineDays > 0 ? baseline.length / baselineDays : 0;

  if (
    hasReliableBaseline &&
    current.length >= 5 &&
    baselineDailyAverage >= 1 &&
    current.length >= baselineDailyAverage * spikeMultiplier
  ) {
    const multiple = Number(
      (current.length / baselineDailyAverage).toFixed(1)
    );
    const severity =
      multiple >= 3 ? "critical" : multiple >= 2 ? "high" : "medium";

    const created = await createAlert(db, {
      userId,
      projectId,
      alertType: "conversation_spike",
      severity,
      title: "Conversation volume spike",
      description: `Mention volume is ${multiple}× the previous 7-day daily average.`,
      metadata: {
        fingerprint: "conversation_spike:project",
        current_24h_mentions: current.length,
        baseline_daily_average: Number(baselineDailyAverage.toFixed(2)),
        baseline_mentions: baseline.length,
        baseline_days: baselineDays,
        minimum_baseline_mentions: 10,
        minimum_baseline_days: 3,
        multiplier: multiple,
        configured_multiplier: spikeMultiplier,
      },
      settings,
      cooldownHours: 12,
    });
    if (created) alertCount++;
  }

  // 3) Keyword crisis alert
  for (const k of keywords || []) {
    const keywordRows = analyzedCurrent.filter(
      (m) => m.keyword_id === k.id
    );
    if (keywordRows.length < 3) continue;

    const keywordNegative = keywordRows.filter(
      (m) => m.sentiment === "negative"
    );
    const pct = Math.round(
      (keywordNegative.length / keywordRows.length) * 100
    );

    if (
      keywordNegative.length >= 3 &&
      pct >= Math.max(negativeThreshold, 50)
    ) {
      const created = await createAlert(db, {
        userId,
        projectId,
        alertType: "keyword_crisis",
        severity: severityFromRatio(pct),
        title: `Negative conversation around "${k.keyword}"`,
        description: `${pct}% of analyzed mentions for "${k.keyword}" are negative in the last 24 hours.`,
        metadata: {
          fingerprint: `keyword_crisis:${k.id}`,
          keyword_id: k.id,
          keyword: k.keyword,
          percent: pct,
          analyzed_mentions: keywordRows.length,
          negative_mentions: keywordNegative.length,
          window_hours: 24,
        },
        settings,
        cooldownHours: 12,
      });
      if (created) alertCount++;
    }
  }

  // 4) High-engagement negative mention
  const engagementValues = current.map(engagement).filter((v) => v > 0);
  const adaptiveThreshold = Math.max(10, Math.round(median(engagementValues) * 3));

  const candidates = negativeCurrent
    .filter((m) => engagement(m) >= adaptiveThreshold)
    .sort((a, b) => engagement(b) - engagement(a))
    .slice(0, 3);

  for (const m of candidates) {
    const eng = engagement(m);
    const created = await createAlert(db, {
      userId,
      projectId,
      alertType: "high_engagement_negative",
      severity: eng >= adaptiveThreshold * 3 ? "critical" : "high",
      title: "High-engagement negative mention",
      description: `A negative ${m.platform || "social"} mention reached ${eng} engagements.`,
      metadata: {
        fingerprint: `high_engagement_negative:${m.id}`,
        mention_id: m.id,
        platform: m.platform,
        post_url: m.post_url,
        engagement: eng,
        adaptive_threshold: adaptiveThreshold,
        author_name: m.author_name,
        author_username: m.author_username,
      },
      settings,
      cooldownHours: 168,
    });
    if (created) alertCount++;
  }

  // Auto-close stale active alerts after 48 hours.
  await db
    .from("project_alerts")
    .update({ is_active: false })
    .eq("project_id", projectId)
    .eq("is_active", true)
    .lt(
      "detected_at",
      new Date(now - 48 * 60 * 60 * 1000).toISOString()
    );

  return alertCount;
}

export async function runProjectPipeline(projectId: string, userId: string) {
  const db = createAdminClient();

  const run = (
    await db
      .from("pipeline_runs")
      .insert({
        project_id: projectId,
        user_id: userId,
        status: "running",
      })
      .select("id")
      .single()
  ).data;

  let imported = 0;
  let analyzed = 0;
  let alerts = 0;

  try {
    const { data: keywords } = await db
      .from("keywords")
      .select("id,keyword")
      .eq("project_id", projectId);

    // X
    const token = process.env.X_BEARER_TOKEN;
    if (token) {
      for (const k of keywords || []) {
        const p = new URLSearchParams({
          query: query(k.keyword),
          max_results: "10",
          "post.fields": "created_at,lang,public_metrics,author_id",
          expansions: "author_id",
          "user.fields": "name,username",
        });

        const r = await fetch(
          `https://api.x.com/2/tweets/search/recent?${p}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          }
        );

        if (!r.ok) continue;

        const j = await r.json();
        const users = new Map<string, XUser>(
          (j.includes?.users || []).map((u: XUser) => [u.id, u])
        );

        for (const post of (j.data || []) as XPost[]) {
          const u = post.author_id
            ? users.get(post.author_id)
            : undefined;
          const m = post.public_metrics || {};
          const username = u?.username || null;

          const { error } = await db.from("mentions").insert({
            user_id: userId,
            project_id: projectId,
            keyword_id: k.id,
            platform: "X",
            external_id: post.id,
            author_name: u?.name || null,
            author_username: username,
            content: post.text || null,
            post_url: username
              ? `https://x.com/${username}/status/${post.id}`
              : `https://x.com/i/web/status/${post.id}`,
            published_at: post.created_at || new Date().toISOString(),
            likes: m.like_count || 0,
            shares: (m.repost_count || 0) + (m.quote_count || 0),
            replies: m.reply_count || 0,
            views: m.impression_count || 0,
            sentiment: null,
            language: post.lang || null,
          });

          if (!error) {
            imported++;
            await db.from("usage_events").insert({
              user_id: userId,
              project_id: projectId,
              event_type: "mention_imported",
              metadata: { platform: "X" },
            });
          }
        }
      }
    }

    // YouTube videos + comments
    const yt = await collectYouTube(
      db,
      projectId,
      userId,
      keywords || []
    );
    imported += yt.videos + yt.comments;

    // Sentiment — process in batches until pending queue is empty, max 5 batches/run.
    for (let batch = 0; batch < 5; batch++) {
      const { data: pending } = await db
        .from("mentions")
        .select("id,content")
        .eq("project_id", projectId)
        .is("sentiment", null)
        .not("content", "is", null)
        .limit(50);

      if (!pending?.length) break;

      const result = await openAI(
        `Classify sentiment as positive, neutral, or negative. Handle Arabic, Saudi/Gulf dialect, English, code-switching and sarcasm. Return one item per id.\n${JSON.stringify(
          pending
        )}`,
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
                required: ["id", "sentiment"],
                properties: {
                  id: { type: "string" },
                  sentiment: {
                    type: "string",
                    enum: ["positive", "neutral", "negative"],
                  },
                },
              },
            },
          },
        }
      );

      for (const x of result.items || []) {
        const { error } = await db
          .from("mentions")
          .update({ sentiment: x.sentiment })
          .eq("id", x.id)
          .eq("project_id", projectId);

        if (!error) analyzed++;
      }

      if ((result.items || []).length === 0) break;
    }

    const { data: settings } = await db
      .from("project_settings")
      .select("*")
      .eq("project_id", projectId)
      .maybeSingle();

    alerts = await runCrisisEngine(
      db,
      projectId,
      userId,
      keywords || [],
      settings
    );

    const { data: ms } = await db
      .from("mentions")
      .select(
        "id,keyword_id,platform,content,published_at,likes,shares,replies,views,sentiment,language"
      )
      .eq("project_id", projectId)
      .order("published_at", { ascending: false })
      .limit(100);

    const rows = ms || [];

    if (rows.length >= 3) {
      const insights = await openAI(
        `You are metriX social intelligence. Using only supplied mentions, return concise evidence-grounded project intelligence. Do not invent causes or facts. Mentions:\n${JSON.stringify(
          rows.map((m: any) => ({
            platform: m.platform,
            content: (m.content || "").slice(0, 1000),
            sentiment: m.sentiment,
            engagement:
              (m.likes || 0) + (m.shares || 0) + (m.replies || 0),
            language: m.language,
          }))
        )}`,
        {
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
            positive_drivers: {
              type: "array",
              items: { type: "string" },
            },
            negative_drivers: {
              type: "array",
              items: { type: "string" },
            },
            risks: { type: "array", items: { type: "string" } },
            opportunities: {
              type: "array",
              items: { type: "string" },
            },
            recommendations: {
              type: "array",
              items: { type: "string" },
            },
          },
        }
      );

      await db.from("project_insights").insert({
        user_id: userId,
        project_id: projectId,
        ...insights,
        mentions_analyzed: rows.length,
      });
    }

    if (run?.id) {
      await db
        .from("pipeline_runs")
        .update({
          status: "success",
          imported,
          analyzed,
          alerts,
          finished_at: new Date().toISOString(),
          details: {
            sources: ["X", "YouTube"],
            youtube_videos: yt.videos,
            youtube_comments: yt.comments,
            crisis_engine: "v2",
          },
        })
        .eq("id", run.id);
    }

    return { imported, analyzed, alerts };
  } catch (e: any) {
    if (run?.id) {
      await db
        .from("pipeline_runs")
        .update({
          status: "failed",
          imported,
          analyzed,
          alerts,
          details: { error: String(e?.message || e) },
          finished_at: new Date().toISOString(),
        })
        .eq("id", run.id);
    }
    throw e;
  }
}

async function sendAlert(
  to: string,
  title: string,
  description: string,
  id: string
) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_FROM_EMAIL;

  if (!key || !from) return;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `metrix-alert/${id}`,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `metriX alert: ${title}`,
      html: `<h2>${title}</h2><p>${description}</p><p>Open metriX to review the project.</p>`,
    }),
  });

  if (!response.ok) {
    console.error(
      "Resend alert email failed:",
      response.status,
      await response.text()
    );
  }
}
