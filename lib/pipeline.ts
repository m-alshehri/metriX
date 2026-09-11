import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";

type SocialAccount = {
  id: string;
  platform: string;
  handle: string;
  external_id?: string | null;
};

type Mention = {
  id?: string;
  platform?: string | null;
  content?: string | null;
  published_at?: string | null;
  likes?: number | null;
  shares?: number | null;
  replies?: number | null;
  views?: number | null;
  sentiment?: string | null;
};

function cleanUsername(input: string) {
  const value = String(input || "").trim();
  const withoutQuery = value.split("?")[0].replace(/\/+$/, "");
  const match = withoutQuery.match(/(?:x\.com|twitter\.com|instagram\.com|tiktok\.com|threads\.net)\/@?([^/]+)/i);
  if (match?.[1]) return match[1].replace(/^@/, "");
  return withoutQuery.replace(/^@/, "");
}

function extractYouTubeHandle(input: string) {
  const value = String(input || "").trim();
  const handleMatch = value.match(/youtube\.com\/@([^/?]+)/i);
  if (handleMatch?.[1]) return `@${handleMatch[1]}`;
  if (value.startsWith("@")) return value;
  return value;
}

function engagement(m: Mention) {
  return Number(m.likes || 0) + Number(m.shares || 0) + Number(m.replies || 0);
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

async function openAI(input: string, schema: any) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY missing");

  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5.6-luna",
      store: false,
      input,
      text: { format: { type: "json_schema", name: "result", strict: true, schema } },
    }),
  });

  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`);
  return JSON.parse(extractText(await r.json()));
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

async function insertMention(db: any, row: any) {
  const { error } = await db.from("mentions").insert(row);
  if (!error) return 1;
  // Duplicate external IDs are expected on repeated syncs.
  if (String(error.code) === "23505") return 0;
  console.error("mention insert failed", error);
  return 0;
}

async function collectX(db: any, projectId: string, userId: string, account: SocialAccount) {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) {
    await markAccount(db, account.id, "failed", "X_BEARER_TOKEN missing");
    return { imported: 0, note: "X token missing" };
  }

  const username = cleanUsername(account.handle);
  try {
    const ur = await fetch(
      `https://api.x.com/2/users/by/username/${encodeURIComponent(username)}?user.fields=id,name,username`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );
    if (!ur.ok) throw new Error(`X user lookup ${ur.status}`);
    const uj = await ur.json();
    const u = uj.data;
    if (!u?.id) throw new Error("X account not found");

    let imported = 0;

    // 1) Account's own recent posts.
    const tp = new URLSearchParams({
      max_results: "20",
      "tweet.fields": "created_at,lang,public_metrics,author_id",
      exclude: "retweets",
    });
    const tr = await fetch(`https://api.x.com/2/users/${u.id}/tweets?${tp}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (tr.ok) {
      const tj = await tr.json();
      for (const post of tj.data || []) {
        const m = post.public_metrics || {};
        imported += await insertMention(db, {
          user_id: userId,
          project_id: projectId,
          social_account_id: account.id,
          keyword_id: null,
          platform: "X",
          external_id: post.id,
          author_name: u.name || null,
          author_username: u.username || username,
          content: post.text || null,
          post_url: `https://x.com/${u.username || username}/status/${post.id}`,
          published_at: post.created_at || new Date().toISOString(),
          likes: Number(m.like_count || 0),
          shares: Number(m.repost_count || 0) + Number(m.quote_count || 0),
          replies: Number(m.reply_count || 0),
          views: Number(m.impression_count || 0),
          sentiment: null,
          language: post.lang || null,
        });
      }
    }

    // 2) Recent public conversation directed at / mentioning the account.
    const qp = new URLSearchParams({
      query: `(@${username} OR to:${username}) -from:${username} -is:retweet`,
      max_results: "20",
      "tweet.fields": "created_at,lang,public_metrics,author_id",
      expansions: "author_id",
      "user.fields": "name,username",
    });
    const mr = await fetch(`https://api.x.com/2/tweets/search/recent?${qp}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (mr.ok) {
      const mj = await mr.json();
      const users = new Map<string, any>(
        (mj.includes?.users || []).map((x: any) => [String(x.id), x])
      );
      for (const post of mj.data || []) {
        const author = users.get(String(post.author_id));
        const m = post.public_metrics || {};
        imported += await insertMention(db, {
          user_id: userId,
          project_id: projectId,
          social_account_id: account.id,
          keyword_id: null,
          platform: "X",
          external_id: post.id,
          author_name: author?.name || null,
          author_username: author?.username || null,
          content: post.text || null,
          post_url: author?.username
            ? `https://x.com/${author.username}/status/${post.id}`
            : `https://x.com/i/web/status/${post.id}`,
          published_at: post.created_at || new Date().toISOString(),
          likes: Number(m.like_count || 0),
          shares: Number(m.repost_count || 0) + Number(m.quote_count || 0),
          replies: Number(m.reply_count || 0),
          views: Number(m.impression_count || 0),
          sentiment: null,
          language: post.lang || null,
        });
      }
    }

    await markAccount(db, account.id, "success", null, String(u.id));
    return { imported, note: "X account + mentions synced" };
  } catch (e: any) {
    await markAccount(db, account.id, "failed", String(e?.message || e));
    return { imported: 0, note: String(e?.message || e) };
  }
}

async function resolveYouTubeChannel(key: string, handle: string) {
  const h = extractYouTubeHandle(handle);

  if (/^UC[\w-]{20,}$/.test(h)) return h;

  const params = new URLSearchParams({ part: "id,snippet", key });
  if (h.startsWith("@")) params.set("forHandle", h.slice(1));
  else params.set("forUsername", h);

  const r = await fetch(`https://www.googleapis.com/youtube/v3/channels?${params}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`YouTube channel lookup ${r.status}`);
  const j = await r.json();
  if (!j.items?.[0]?.id) throw new Error("YouTube channel not found");
  return String(j.items[0].id);
}

async function collectYouTube(db: any, projectId: string, userId: string, account: SocialAccount) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    await markAccount(db, account.id, "failed", "YOUTUBE_API_KEY missing");
    return { imported: 0, videos: 0, comments: 0, note: "YouTube key missing" };
  }

  try {
    const channelId = await resolveYouTubeChannel(key, account.handle);
    const sp = new URLSearchParams({
      part: "snippet",
      type: "video",
      channelId,
      maxResults: "15",
      order: "date",
      key,
    });

    const sr = await fetch(`https://www.googleapis.com/youtube/v3/search?${sp}`, { cache: "no-store" });
    if (!sr.ok) throw new Error(`YouTube search ${sr.status}`);
    const sj = await sr.json();
    const ids = (sj.items || []).map((x: any) => x?.id?.videoId).filter(Boolean);

    if (!ids.length) {
      await markAccount(db, account.id, "success", null, channelId);
      return { imported: 0, videos: 0, comments: 0, note: "No recent videos" };
    }

    const vp = new URLSearchParams({
      part: "snippet,statistics",
      id: ids.join(","),
      key,
    });
    const vr = await fetch(`https://www.googleapis.com/youtube/v3/videos?${vp}`, { cache: "no-store" });
    if (!vr.ok) throw new Error(`YouTube videos ${vr.status}`);
    const vj = await vr.json();

    let videos = 0, comments = 0;

    for (const v of vj.items || []) {
      const s = v.snippet || {};
      const st = v.statistics || {};
      videos += await insertMention(db, {
        user_id: userId,
        project_id: projectId,
        social_account_id: account.id,
        keyword_id: null,
        platform: "YouTube",
        external_id: `video:${v.id}`,
        author_name: s.channelTitle || null,
        author_username: channelId,
        content: [s.title, s.description].filter(Boolean).join("\n\n"),
        post_url: `https://www.youtube.com/watch?v=${v.id}`,
        published_at: s.publishedAt || new Date().toISOString(),
        likes: Number(st.likeCount || 0),
        shares: 0,
        replies: Number(st.commentCount || 0),
        views: Number(st.viewCount || 0),
        sentiment: null,
        language: s.defaultLanguage || s.defaultAudioLanguage || null,
      });

      const cp = new URLSearchParams({
        part: "snippet",
        videoId: v.id,
        maxResults: "20",
        order: "time",
        textFormat: "plainText",
        key,
      });
      const cr = await fetch(`https://www.googleapis.com/youtube/v3/commentThreads?${cp}`, { cache: "no-store" });
      if (!cr.ok) continue;
      const cj = await cr.json();

      for (const thread of cj.items || []) {
        const c = thread?.snippet?.topLevelComment;
        const cs = c?.snippet;
        if (!c?.id || !cs?.textDisplay) continue;

        comments += await insertMention(db, {
          user_id: userId,
          project_id: projectId,
          social_account_id: account.id,
          keyword_id: null,
          platform: "YouTube",
          external_id: `comment:${c.id}`,
          author_name: cs.authorDisplayName || null,
          author_username: cs.authorChannelId?.value || null,
          content: cs.textDisplay,
          post_url: `https://www.youtube.com/watch?v=${v.id}&lc=${encodeURIComponent(c.id)}`,
          published_at: cs.publishedAt || new Date().toISOString(),
          likes: Number(cs.likeCount || 0),
          shares: 0,
          replies: Number(thread?.snippet?.totalReplyCount || 0),
          views: 0,
          sentiment: null,
          language: null,
        });
      }
    }

    await markAccount(db, account.id, "success", null, channelId);
    return { imported: videos + comments, videos, comments, note: "YouTube synced" };
  } catch (e: any) {
    await markAccount(db, account.id, "failed", String(e?.message || e));
    return { imported: 0, videos: 0, comments: 0, note: String(e?.message || e) };
  }
}

async function getMetaToken(db: any, userId: string) {
  const { data, error } = await db.rpc("get_meta_token_for_user", { p_user_id: userId });
  if (error) return null;
  return typeof data === "string" ? data : null;
}

function normalizeFacebookTarget(handle: string) {
  const value = String(handle || "").trim().replace(/\/+$/, "");
  const match = value.match(/facebook\.com\/([^/?]+)/i);
  return (match?.[1] || value).replace(/^@/, "");
}

async function collectMeta(db: any, projectId: string, userId: string, accounts: SocialAccount[]) {
  const fb = accounts.find((a) => a.platform === "facebook");
  const ig = accounts.find((a) => a.platform === "instagram");
  if (!fb && !ig) return { imported: 0, note: "No Meta accounts configured" };

  const token = await getMetaToken(db, userId);
  if (!token) {
    for (const a of [fb, ig].filter(Boolean) as SocialAccount[]) {
      await markAccount(db, a.id, "authorization_required", "Connect Meta first");
    }
    return { imported: 0, note: "Meta authorization required" };
  }

  try {
    const p = new URLSearchParams({
      fields: "id,name,access_token,instagram_business_account{id,username,name}",
      limit: "100",
      access_token: token,
    });
    const r = await fetch(`https://graph.facebook.com/v24.0/me/accounts?${p}`, { cache: "no-store" });
    if (!r.ok) throw new Error(`Meta pages ${r.status}`);
    const j = await r.json();
    const pages = j.data || [];

    let imported = 0;

    let matchedPage: any = null;
    if (fb) {
      const wanted = normalizeFacebookTarget(fb.handle).toLowerCase();
      matchedPage = pages.find((x: any) =>
        String(x.id) === wanted ||
        String(x.name || "").toLowerCase() === wanted ||
        String(x.name || "").toLowerCase().replace(/\s+/g, "") === wanted.replace(/\s+/g, "")
      );

      if (!matchedPage) {
        await markAccount(db, fb.id, "failed", "Facebook Page not found among authorized Pages");
      } else {
        const pp = new URLSearchParams({
          fields: "id,message,created_time,permalink_url,shares,comments.limit(0).summary(true),reactions.limit(0).summary(true)",
          limit: "20",
          access_token: matchedPage.access_token,
        });
        const pr = await fetch(`https://graph.facebook.com/v24.0/${matchedPage.id}/posts?${pp}`, { cache: "no-store" });
        if (pr.ok) {
          const pj = await pr.json();
          for (const post of pj.data || []) {
            imported += await insertMention(db, {
              user_id: userId,
              project_id: projectId,
              social_account_id: fb.id,
              keyword_id: null,
              platform: "Facebook",
              external_id: `fb:${post.id}`,
              author_name: matchedPage.name || null,
              author_username: fb.handle,
              content: post.message || null,
              post_url: post.permalink_url || null,
              published_at: post.created_time || new Date().toISOString(),
              likes: Number(post.reactions?.summary?.total_count || 0),
              shares: Number(post.shares?.count || 0),
              replies: Number(post.comments?.summary?.total_count || 0),
              views: 0,
              sentiment: null,
              language: null,
            });
          }
          await markAccount(db, fb.id, "success", null, String(matchedPage.id));
        } else {
          await markAccount(db, fb.id, "failed", `Facebook posts ${pr.status}`);
        }
      }
    }

    if (ig) {
      const username = cleanUsername(ig.handle).toLowerCase();
      let pageForInstagram = matchedPage;
      if (!pageForInstagram?.instagram_business_account) {
        pageForInstagram = pages.find((x: any) =>
          String(x.instagram_business_account?.username || "").toLowerCase() === username
        );
      }

      const iga = pageForInstagram?.instagram_business_account;
      if (!iga?.id) {
        await markAccount(db, ig.id, "failed", "Instagram professional account not found among authorized Meta assets");
      } else {
        const ip = new URLSearchParams({
          fields: "id,caption,media_type,permalink,timestamp,like_count,comments_count",
          limit: "20",
          access_token: pageForInstagram.access_token,
        });
        const ir = await fetch(`https://graph.facebook.com/v24.0/${iga.id}/media?${ip}`, { cache: "no-store" });
        if (ir.ok) {
          const ij = await ir.json();
          for (const media of ij.data || []) {
            imported += await insertMention(db, {
              user_id: userId,
              project_id: projectId,
              social_account_id: ig.id,
              keyword_id: null,
              platform: "Instagram",
              external_id: `ig:${media.id}`,
              author_name: iga.name || null,
              author_username: iga.username || ig.handle,
              content: media.caption || `[${media.media_type || "media"}]`,
              post_url: media.permalink || null,
              published_at: media.timestamp || new Date().toISOString(),
              likes: Number(media.like_count || 0),
              shares: 0,
              replies: Number(media.comments_count || 0),
              views: 0,
              sentiment: null,
              language: null,
            });

            const cp = new URLSearchParams({
              fields: "id,text,timestamp,username,like_count",
              limit: "20",
              access_token: pageForInstagram.access_token,
            });
            const cr = await fetch(`https://graph.facebook.com/v24.0/${media.id}/comments?${cp}`, { cache: "no-store" });
            if (!cr.ok) continue;
            const cj = await cr.json();
            for (const c of cj.data || []) {
              imported += await insertMention(db, {
                user_id: userId,
                project_id: projectId,
                social_account_id: ig.id,
                keyword_id: null,
                platform: "Instagram",
                external_id: `ig-comment:${c.id}`,
                author_name: c.username || null,
                author_username: c.username || null,
                content: c.text || null,
                post_url: media.permalink || null,
                published_at: c.timestamp || new Date().toISOString(),
                likes: Number(c.like_count || 0),
                shares: 0,
                replies: 0,
                views: 0,
                sentiment: null,
                language: null,
              });
            }
          }
          await markAccount(db, ig.id, "success", null, String(iga.id));
        } else {
          await markAccount(db, ig.id, "failed", `Instagram media ${ir.status}`);
        }
      }
    }

    return { imported, note: "Meta sync completed" };
  } catch (e: any) {
    for (const a of [fb, ig].filter(Boolean) as SocialAccount[]) {
      await markAccount(db, a.id, "failed", String(e?.message || e));
    }
    return { imported: 0, note: String(e?.message || e) };
  }
}

async function markOAuthRequired(db: any, accounts: SocialAccount[]) {
  for (const account of accounts.filter((a) => ["tiktok", "threads"].includes(a.platform))) {
    await markAccount(
      db,
      account.id,
      "authorization_required",
      `${account.platform} requires per-user OAuth authorization before metriX can collect account data`
    );
  }
}

async function analyzeSentiment(db: any, projectId: string) {
  let analyzed = 0;

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
      `Classify each social media item as positive, neutral, or negative. Handle Arabic, Saudi/Gulf dialect, English, code-switching and sarcasm. Return exactly one item per id.\n${JSON.stringify(pending)}`,
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
                sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
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
    if (!(result.items || []).length) break;
  }

  return analyzed;
}

async function refreshInsights(db: any, projectId: string, userId: string) {
  const { data } = await db
    .from("mentions")
    .select("platform,content,likes,shares,replies,sentiment,language")
    .eq("project_id", projectId)
    .order("published_at", { ascending: false })
    .limit(100);

  const rows = data || [];
  if (rows.length < 3) return false;

  const result = await openAI(
    `You are metriX social intelligence. Use only the supplied account-based social data. Do not invent causes or facts. Produce concise evidence-grounded intelligence.\n${JSON.stringify(rows.map((m:any)=>({
      platform:m.platform,
      content:String(m.content||"").slice(0,1000),
      sentiment:m.sentiment,
      engagement:Number(m.likes||0)+Number(m.shares||0)+Number(m.replies||0),
      language:m.language
    })))}`,
    {
      type: "object",
      additionalProperties: false,
      required: ["executive_summary","top_topics","positive_drivers","negative_drivers","risks","opportunities","recommendations"],
      properties: {
        executive_summary: { type: "string" },
        top_topics: { type: "array", items: { type: "string" } },
        positive_drivers: { type: "array", items: { type: "string" } },
        negative_drivers: { type: "array", items: { type: "string" } },
        risks: { type: "array", items: { type: "string" } },
        opportunities: { type: "array", items: { type: "string" } },
        recommendations: { type: "array", items: { type: "string" } },
      },
    }
  );

  await db.from("project_insights").insert({
    user_id: userId,
    project_id: projectId,
    ...result,
    mentions_analyzed: rows.length,
  });

  return true;
}

async function runAlerts(db: any, projectId: string, userId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: rows } = await db
    .from("mentions")
    .select("id,platform,content,sentiment,likes,shares,replies,post_url")
    .eq("project_id", projectId)
    .gte("published_at", since);

  const ms = rows || [];
  const analyzed = ms.filter((m:any) => ["positive","neutral","negative"].includes(String(m.sentiment)));
  const neg = analyzed.filter((m:any) => m.sentiment === "negative");

  const { data: settings } = await db
    .from("project_settings")
    .select("negative_threshold")
    .eq("project_id", projectId)
    .maybeSingle();

  const threshold = Number(settings?.negative_threshold || 40);
  let alerts = 0;

  if (analyzed.length >= 5) {
    const pct = Math.round((neg.length / analyzed.length) * 100);
    if (pct >= threshold) {
      const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      const { data: existing } = await db
        .from("project_alerts")
        .select("id")
        .eq("project_id", projectId)
        .eq("alert_type", "negative_sentiment")
        .gte("detected_at", cutoff)
        .limit(1);

      if (!existing?.length) {
        const { error } = await db.from("project_alerts").insert({
          user_id: userId,
          project_id: projectId,
          alert_type: "negative_sentiment",
          severity: pct >= 70 ? "critical" : pct >= 55 ? "high" : "medium",
          title: "Elevated negative sentiment",
          description: `Negative content is ${pct}% of analyzed account activity in the last 24 hours.`,
          metadata: { percent: pct, analyzed_mentions: analyzed.length, negative_mentions: neg.length, source: "account_based" },
          is_active: true,
        });
        if (!error) alerts++;
      }
    }
  }

  const highNegative = neg
    .map((m:any) => ({ ...m, eng: engagement(m) }))
    .filter((m:any) => m.eng >= 25)
    .sort((a:any,b:any)=>b.eng-a.eng)
    .slice(0,3);

  for (const m of highNegative) {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await db
      .from("project_alerts")
      .select("id")
      .eq("project_id", projectId)
      .eq("alert_type", "high_engagement_negative")
      .gte("detected_at", cutoff)
      .contains("metadata", { mention_id: m.id })
      .limit(1);

    if (!existing?.length) {
      const { error } = await db.from("project_alerts").insert({
        user_id: userId,
        project_id: projectId,
        alert_type: "high_engagement_negative",
        severity: m.eng >= 100 ? "critical" : "high",
        title: "High-engagement negative content",
        description: `A negative ${m.platform || "social"} item reached ${m.eng} engagements.`,
        metadata: { mention_id: m.id, platform: m.platform, engagement: m.eng, post_url: m.post_url, source: "account_based" },
        is_active: true,
      });
      if (!error) alerts++;
    }
  }

  return alerts;
}

export async function runProjectPipeline(projectId: string, userId: string) {
  const db = createAdminClient();

  const { data: run } = await db
    .from("pipeline_runs")
    .insert({ project_id: projectId, user_id: userId, status: "running" })
    .select("id")
    .single();

  let imported = 0;
  let analyzed = 0;
  let alerts = 0;

  const details: any = { mode: "account_based", platforms: {} };

  try {
    const { data: accounts, error } = await db
      .from("social_accounts")
      .select("id,platform,handle,external_id")
      .eq("project_id", projectId)
      .eq("enabled", true);

    if (error) throw error;

    const list = (accounts || []) as SocialAccount[];

    for (const account of list.filter((a) => a.platform === "x")) {
      const result = await collectX(db, projectId, userId, account);
      imported += result.imported;
      details.platforms.x = result;
    }

    for (const account of list.filter((a) => a.platform === "youtube")) {
      const result = await collectYouTube(db, projectId, userId, account);
      imported += result.imported;
      details.platforms.youtube = result;
    }

    const metaResult = await collectMeta(db, projectId, userId, list);
    imported += metaResult.imported;
    details.platforms.meta = metaResult;

    await markOAuthRequired(db, list);
    if (list.some((a) => a.platform === "tiktok")) {
      details.platforms.tiktok = { imported: 0, note: "Per-user TikTok OAuth required" };
    }
    if (list.some((a) => a.platform === "threads")) {
      details.platforms.threads = { imported: 0, note: "Per-user Threads OAuth required" };
    }

    analyzed = await analyzeSentiment(db, projectId);
    await refreshInsights(db, projectId, userId);
    alerts = await runAlerts(db, projectId, userId);

    if (run?.id) {
      await db
        .from("pipeline_runs")
        .update({
          status: "success",
          imported,
          analyzed,
          alerts,
          finished_at: new Date().toISOString(),
          details,
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
          details: { ...details, error: String(e?.message || e) },
        })
        .eq("id", run.id);
    }
    throw e;
  }
}
