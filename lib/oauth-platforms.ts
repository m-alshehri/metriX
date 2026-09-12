import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";

type Account = {
  id: string;
  platform: string;
  handle: string;
  external_id?: string | null;
};

async function insertMention(db: any, row: any) {
  const { error } = await db.from("mentions").insert(row);
  if (!error) return 1;
  if (String(error.code) === "23505") return 0;
  console.error("oauth mention insert failed", error);
  return 0;
}

async function markAccount(
  db: any,
  id: string,
  status: string,
  error?: string | null,
  externalId?: string | null
) {
  const patch: any = {
    last_synced_at: new Date().toISOString(),
    last_sync_status: status,
    last_sync_error: error || null,
    updated_at: new Date().toISOString(),
  };
  if (externalId) patch.external_id = externalId;
  await db.from("social_accounts").update(patch).eq("id", id);
}

async function getTokens(db: any, userId: string, projectId: string, platform: string) {
  const { data, error } = await db.rpc("get_social_oauth_tokens", {
    p_user_id: userId,
    p_project_id: projectId,
    p_platform: platform,
  });
  if (error || !Array.isArray(data) || !data[0]) return null;
  return data[0];
}

async function storeTokens(
  db: any,
  args: {
    userId: string;
    projectId: string;
    platform: string;
    accessToken: string;
    refreshToken?: string | null;
    providerUserId?: string | null;
    username?: string | null;
    scopes?: string[];
    expiresAt?: string | null;
    refreshExpiresAt?: string | null;
  }
) {
  const { error } = await db.rpc("store_social_oauth_tokens", {
    p_user_id: args.userId,
    p_project_id: args.projectId,
    p_platform: args.platform,
    p_access_token: args.accessToken,
    p_refresh_token: args.refreshToken || null,
    p_provider_user_id: args.providerUserId || null,
    p_username: args.username || null,
    p_scopes: args.scopes || [],
    p_token_expires_at: args.expiresAt || null,
    p_refresh_expires_at: args.refreshExpiresAt || null,
  });
  if (error) throw error;
}

async function refreshTikTokIfNeeded(db: any, userId: string, projectId: string, tokenRow: any) {
  const expires = tokenRow?.token_expires_at ? new Date(tokenRow.token_expires_at).getTime() : 0;
  if (!expires || expires > Date.now() + 5 * 60 * 1000) return tokenRow.access_token;

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret || !tokenRow.refresh_token) {
    throw new Error("TikTok token expired; reconnect TikTok");
  }

  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: tokenRow.refresh_token,
  });

  const r = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw new Error(j?.error_description || "TikTok refresh failed");

  await storeTokens(db, {
    userId,
    projectId,
    platform: "tiktok",
    accessToken: j.access_token,
    refreshToken: j.refresh_token || tokenRow.refresh_token,
    providerUserId: j.open_id || tokenRow.provider_user_id,
    username: tokenRow.username,
    scopes: String(j.scope || "").split(",").filter(Boolean),
    expiresAt: j.expires_in ? new Date(Date.now() + Number(j.expires_in) * 1000).toISOString() : null,
    refreshExpiresAt: j.refresh_expires_in
      ? new Date(Date.now() + Number(j.refresh_expires_in) * 1000).toISOString()
      : tokenRow.refresh_expires_at,
  });

  return j.access_token as string;
}

async function collectTikTok(
  db: any,
  projectId: string,
  userId: string,
  account: Account
) {
  try {
    const tokenRow = await getTokens(db, userId, projectId, "tiktok");
    if (!tokenRow?.access_token) {
      await markAccount(db, account.id, "authorization_required", "Connect TikTok first");
      return { imported: 0, note: "TikTok authorization required" };
    }

    const token = await refreshTikTokIfNeeded(db, userId, projectId, tokenRow);

    const fields = [
      "id",
      "create_time",
      "share_url",
      "video_description",
      "title",
      "like_count",
      "comment_count",
      "share_count",
      "view_count",
    ].join(",");

    const r = await fetch(
      `https://open.tiktokapis.com/v2/video/list/?fields=${encodeURIComponent(fields)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ max_count: 20 }),
        cache: "no-store",
      }
    );
    const j = await r.json();
    if (!r.ok || (j?.error?.code && j.error.code !== "ok")) {
      throw new Error(j?.error?.message || `TikTok videos ${r.status}`);
    }

    const videos = j?.data?.videos || [];
    let imported = 0;
    for (const v of videos) {
      imported += await insertMention(db, {
        user_id: userId,
        project_id: projectId,
        social_account_id: account.id,
        keyword_id: null,
        platform: "TikTok",
        external_id: `tt:${v.id}`,
        author_name: tokenRow.username || account.handle,
        author_username: tokenRow.username || account.handle,
        content: v.video_description || v.title || "[TikTok video]",
        post_url: v.share_url || null,
        published_at: v.create_time
          ? new Date(Number(v.create_time) * 1000).toISOString()
          : new Date().toISOString(),
        likes: Number(v.like_count || 0),
        shares: Number(v.share_count || 0),
        replies: Number(v.comment_count || 0),
        views: Number(v.view_count || 0),
        sentiment: null,
        language: null,
      });
    }

    await markAccount(
      db,
      account.id,
      "success",
      null,
      tokenRow.provider_user_id || account.external_id || null
    );
    return { imported, note: "TikTok synced" };
  } catch (e: any) {
    await markAccount(db, account.id, "failed", String(e?.message || e));
    return { imported: 0, note: String(e?.message || e) };
  }
}

async function collectThreads(
  db: any,
  projectId: string,
  userId: string,
  account: Account
) {
  try {
    const tokenRow = await getTokens(db, userId, projectId, "threads");
    if (!tokenRow?.access_token) {
      await markAccount(db, account.id, "authorization_required", "Connect Threads first");
      return { imported: 0, note: "Threads authorization required" };
    }

    const token = tokenRow.access_token;
    const profileUrl = new URL("https://graph.threads.net/v1.0/me");
    profileUrl.searchParams.set("fields", "id,username");
    profileUrl.searchParams.set("access_token", token);

    const pr = await fetch(profileUrl, { cache: "no-store" });
    const profile = await pr.json();
    if (!pr.ok || !profile?.id) {
      throw new Error(profile?.error?.message || `Threads profile ${pr.status}`);
    }

    const mediaUrl = new URL("https://graph.threads.net/v1.0/me/threads");
    mediaUrl.searchParams.set(
      "fields",
      "id,text,timestamp,permalink,media_type,username,is_quote_post"
    );
    mediaUrl.searchParams.set("limit", "25");
    mediaUrl.searchParams.set("access_token", token);

    const mr = await fetch(mediaUrl, { cache: "no-store" });
    const mj = await mr.json();
    if (!mr.ok) throw new Error(mj?.error?.message || `Threads posts ${mr.status}`);

    let imported = 0;
    for (const post of mj?.data || []) {
      imported += await insertMention(db, {
        user_id: userId,
        project_id: projectId,
        social_account_id: account.id,
        keyword_id: null,
        platform: "Threads",
        external_id: `threads:${post.id}`,
        author_name: profile.username || account.handle,
        author_username: post.username || profile.username || account.handle,
        content: post.text || `[${post.media_type || "Threads post"}]`,
        post_url: post.permalink || null,
        published_at: post.timestamp || new Date().toISOString(),
        likes: 0,
        shares: 0,
        replies: 0,
        views: 0,
        sentiment: null,
        language: null,
      });
    }

    await markAccount(db, account.id, "success", null, String(profile.id));
    return { imported, note: "Threads synced" };
  } catch (e: any) {
    await markAccount(db, account.id, "failed", String(e?.message || e));
    return { imported: 0, note: String(e?.message || e) };
  }
}

async function getMetaToken(db: any, userId: string) {
  const { data, error } = await db.rpc("get_meta_token_for_user", { p_user_id: userId });
  if (error) return null;
  return typeof data === "string" ? data : null;
}

async function collectAssignedMeta(
  db: any,
  projectId: string,
  userId: string,
  accounts: Account[]
) {
  const fb = accounts.find((a) => a.platform === "facebook");
  const ig = accounts.find((a) => a.platform === "instagram");
  if (!fb && !ig) return { imported: 0, note: "No Meta accounts configured" };

  const token = await getMetaToken(db, userId);
  if (!token) return { imported: 0, note: "Meta not connected" };

  const { data: assigned } = await db
    .from("meta_assets")
    .select("asset_type,external_id,name,username,parent_external_id,project_id")
    .eq("user_id", userId)
    .eq("project_id", projectId);

  if (!assigned?.length) {
    return { imported: 0, note: "No Meta assets assigned to this project" };
  }

  const p = new URLSearchParams({
    fields: "id,name,access_token,instagram_business_account{id,username,name}",
    limit: "100",
    access_token: token,
  });
  const pagesResponse = await fetch(
    `https://graph.facebook.com/v24.0/me/accounts?${p}`,
    { cache: "no-store" }
  );
  const pagesPayload = await pagesResponse.json();
  if (!pagesResponse.ok) {
    throw new Error(pagesPayload?.error?.message || `Meta pages ${pagesResponse.status}`);
  }

  const pages = pagesPayload?.data || [];
  let imported = 0;

  if (fb) {
    const fbAsset = assigned.find((a: any) => a.asset_type === "facebook_page");
    if (fbAsset) {
      const page = pages.find((x: any) => String(x.id) === String(fbAsset.external_id));
      if (page?.access_token) {
        const q = new URLSearchParams({
          fields:
            "id,message,created_time,permalink_url,shares,comments.limit(0).summary(true),reactions.limit(0).summary(true)",
          limit: "20",
          access_token: page.access_token,
        });
        const r = await fetch(
          `https://graph.facebook.com/v24.0/${page.id}/posts?${q}`,
          { cache: "no-store" }
        );
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error?.message || `Facebook posts ${r.status}`);

        for (const post of j?.data || []) {
          imported += await insertMention(db, {
            user_id: userId,
            project_id: projectId,
            social_account_id: fb.id,
            keyword_id: null,
            platform: "Facebook",
            external_id: `fb:${post.id}`,
            author_name: page.name || fbAsset.name || null,
            author_username: fb.handle,
            content: post.message || "[Facebook post]",
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
        await markAccount(db, fb.id, "success", null, String(page.id));
      }
    }
  }

  if (ig) {
    const igAsset = assigned.find((a: any) => a.asset_type === "instagram_account");
    if (igAsset) {
      const parent = pages.find(
        (x: any) =>
          String(x.id) === String(igAsset.parent_external_id) ||
          String(x.instagram_business_account?.id) === String(igAsset.external_id)
      );
      const iga = parent?.instagram_business_account;
      if (iga?.id && parent?.access_token) {
        const q = new URLSearchParams({
          fields: "id,caption,media_type,permalink,timestamp,like_count,comments_count",
          limit: "20",
          access_token: parent.access_token,
        });
        const r = await fetch(
          `https://graph.facebook.com/v24.0/${iga.id}/media?${q}`,
          { cache: "no-store" }
        );
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error?.message || `Instagram media ${r.status}`);

        for (const media of j?.data || []) {
          imported += await insertMention(db, {
            user_id: userId,
            project_id: projectId,
            social_account_id: ig.id,
            keyword_id: null,
            platform: "Instagram",
            external_id: `ig:${media.id}`,
            author_name: iga.name || igAsset.name || null,
            author_username: iga.username || igAsset.username || ig.handle,
            content: media.caption || `[${media.media_type || "Instagram media"}]`,
            post_url: media.permalink || null,
            published_at: media.timestamp || new Date().toISOString(),
            likes: Number(media.like_count || 0),
            shares: 0,
            replies: Number(media.comments_count || 0),
            views: 0,
            sentiment: null,
            language: null,
          });

          const cq = new URLSearchParams({
            fields: "id,text,timestamp,username,like_count",
            limit: "20",
            access_token: parent.access_token,
          });
          const cr = await fetch(
            `https://graph.facebook.com/v24.0/${media.id}/comments?${cq}`,
            { cache: "no-store" }
          );
          if (!cr.ok) continue;
          const cj = await cr.json();

          for (const c of cj?.data || []) {
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
      }
    }
  }

  return { imported, note: "Assigned Meta assets synced" };
}

export async function collectConnectedPlatforms(projectId: string, userId: string) {
  const db = createAdminClient();
  const { data: accounts, error } = await db
    .from("social_accounts")
    .select("id,platform,handle,external_id")
    .eq("project_id", projectId)
    .eq("enabled", true);

  if (error) throw error;
  const list = (accounts || []) as Account[];

  const details: any = {};
  let imported = 0;

  try {
    const meta = await collectAssignedMeta(db, projectId, userId, list);
    imported += meta.imported;
    details.meta_assigned = meta;
  } catch (e: any) {
    details.meta_assigned = { imported: 0, note: String(e?.message || e) };
  }

  const tt = list.find((a) => a.platform === "tiktok");
  if (tt) {
    const r = await collectTikTok(db, projectId, userId, tt);
    imported += r.imported;
    details.tiktok = r;
  }

  const th = list.find((a) => a.platform === "threads");
  if (th) {
    const r = await collectThreads(db, projectId, userId, th);
    imported += r.imported;
    details.threads = r;
  }

  return { imported, details };
}
