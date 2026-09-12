import "server-only";

const ROOT = "https://ensembledata.com/apis";

export type SocialAccount = {
  id: string;
  user_id: string;
  project_id: string;
  platform: string;
  handle: string;
  external_id?: string | null;
};

export type NormalizedMention = {
  platform: string;
  external_id: string;
  author_name: string | null;
  author_username: string | null;
  content: string;
  post_url: string | null;
  published_at: string;
  likes: number;
  shares: number;
  replies: number;
  views: number;
};

function cleanHandle(value: string) {
  let v = String(value || "").trim();
  if (!v) return "";
  try {
    if (v.startsWith("http://") || v.startsWith("https://")) {
      const u = new URL(v);
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.length) v = parts[parts.length - 1];
    }
  } catch {}
  return v.replace(/^@/, "").trim();
}

function num(...values: any[]) {
  for (const v of values) {
    if (v === 0) return 0;
    if (v !== undefined && v !== null && v !== "") {
      const n = Number(String(v).replace(/,/g, ""));
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

function str(...values: any[]) {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return "";
}

function iso(value: any) {
  if (!value) return new Date().toISOString();
  if (typeof value === "number" || /^\d+$/.test(String(value))) {
    const n = Number(value);
    const ms = n > 100000000000 ? n : n * 1000;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function firstArray(payload: any): any[] {
  const candidates = [
    payload?.data,
    payload?.data?.data,
    payload?.data?.items,
    payload?.data?.posts,
    payload?.data?.videos,
    payload?.data?.tweets,
    payload?.items,
    payload?.posts,
    payload?.videos,
    payload?.tweets,
    payload?.results,
  ];
  for (const c of candidates) if (Array.isArray(c)) return c;
  return [];
}

function deepFind(obj: any, keys: string[]): any {
  if (!obj || typeof obj !== "object") return undefined;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const found = deepFind(value, keys);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

async function ed(path: string, params: Record<string, string | number | boolean | undefined>) {
  const token = process.env.ENSEMBLEDATA_TOKEN;
  if (!token) throw new Error("ENSEMBLEDATA_TOKEN is missing");

  const url = new URL(ROOT + path);
  const all: Record<string, any> = { ...params, token };
  for (const [k, v] of Object.entries(all)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }

  const r = await fetch(url.toString(), { cache: "no-store" });
  let payload: any = null;
  try {
    payload = await r.json();
  } catch {
    throw new Error(`EnsembleData returned non-JSON (${r.status})`);
  }

  if (!r.ok) {
    throw new Error(
      str(payload?.message, payload?.error?.message, payload?.error, `EnsembleData ${r.status}`)
    );
  }
  return payload;
}

async function resolveTwitterId(handle: string) {
  const p = await ed("/twitter/user/info", { name: cleanHandle(handle) });
  const id = deepFind(p, ["rest_id", "id", "user_id"]);
  if (!id) throw new Error("Could not resolve X username");
  return String(id);
}

async function resolveInstagramId(handle: string, externalId?: string | null) {
  if (externalId && /^\d+$/.test(externalId)) return externalId;

  // EnsembleData has changed Instagram resolver shapes over time.
  // Try the username profile resolver first, then the search-style resolver.
  const username = cleanHandle(handle);
  const attempts: Array<[string, Record<string, any>]> = [
    ["/instagram/user/info", { username }],
    ["/instagram/user/info", { name: username }],
    ["/instagram/user/search", { query: username }],
    ["/instagram/user/search", { name: username }],
  ];

  let last = "";
  for (const [path, params] of attempts) {
    try {
      const p = await ed(path, params);
      const id = deepFind(p, ["pk", "user_id", "id"]);
      if (id) return String(id);
    } catch (e: any) {
      last = String(e?.message || e);
    }
  }
  throw new Error(last || "Could not resolve Instagram username");
}

async function resolveYouTubeBrowseId(account: SocialAccount) {
  const raw = String(account.external_id || account.handle || "").trim();
  if (/^UC[\w-]{20,}$/.test(raw)) return raw;

  const handle = cleanHandle(account.handle);
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    throw new Error("For YouTube, save a Channel ID (starts with UC) or keep YOUTUBE_API_KEY for handle resolution");
  }

  const u = new URL("https://www.googleapis.com/youtube/v3/channels");
  u.searchParams.set("part", "id");
  u.searchParams.set("forHandle", handle);
  u.searchParams.set("key", key);
  const r = await fetch(u.toString(), { cache: "no-store" });
  const j = await r.json();
  const id = j?.items?.[0]?.id;
  if (!id) throw new Error("Could not resolve YouTube handle");
  return String(id);
}

function normalizeTwitter(item: any, handle: string): NormalizedMention | null {
  const legacy = item?.legacy || item?.tweet?.legacy || item;
  const id = str(item?.rest_id, item?.id, item?.tweet?.rest_id, legacy?.id_str);
  const content = str(legacy?.full_text, legacy?.text, item?.text, item?.content);
  if (!id || !content) return null;

  const user = item?.core?.user_results?.result?.legacy || item?.user || item?.author || {};
  const username = str(user?.screen_name, user?.username, handle);
  return {
    platform: "X",
    external_id: `x:${id}`,
    author_name: str(user?.name, username) || null,
    author_username: username || null,
    content,
    post_url: username ? `https://x.com/${username}/status/${id}` : null,
    published_at: iso(legacy?.created_at || item?.created_at || item?.timestamp),
    likes: num(legacy?.favorite_count, item?.like_count, item?.likes),
    shares: num(legacy?.retweet_count, item?.retweet_count, item?.shares),
    replies: num(legacy?.reply_count, item?.reply_count, item?.replies),
    views: num(item?.views?.count, legacy?.views, item?.view_count, item?.impressions),
  };
}

function normalizeTikTok(item: any, handle: string): NormalizedMention | null {
  const id = str(item?.aweme_id, item?.id, item?.video_id);
  const content = str(item?.desc, item?.description, item?.text, item?.title) || "[TikTok video]";
  if (!id) return null;
  const stats = item?.statistics || item?.stats || {};
  const author = item?.author || {};
  const username = str(author?.unique_id, author?.uniqueId, author?.username, handle);
  return {
    platform: "TikTok",
    external_id: `tt:${id}`,
    author_name: str(author?.nickname, author?.name, username) || null,
    author_username: username || null,
    content,
    post_url: str(item?.share_url, item?.shareUrl) || (username ? `https://www.tiktok.com/@${username}/video/${id}` : null),
    published_at: iso(item?.create_time || item?.createTime || item?.timestamp),
    likes: num(stats?.digg_count, stats?.like_count, item?.like_count),
    shares: num(stats?.share_count, item?.share_count),
    replies: num(stats?.comment_count, item?.comment_count),
    views: num(stats?.play_count, stats?.view_count, item?.view_count),
  };
}

function normalizeInstagram(item: any, handle: string): NormalizedMention | null {
  const id = str(item?.pk, item?.id, item?.media_id);
  const code = str(item?.code, item?.shortcode);
  const caption =
    str(item?.caption?.text, item?.caption_text, item?.caption, item?.text, item?.title) ||
    "[Instagram post]";
  if (!id && !code) return null;
  const user = item?.user || item?.owner || {};
  const username = str(user?.username, handle);
  return {
    platform: "Instagram",
    external_id: `ig:${id || code}`,
    author_name: str(user?.full_name, user?.name, username) || null,
    author_username: username || null,
    content: caption,
    post_url: code ? `https://www.instagram.com/p/${code}/` : str(item?.permalink) || null,
    published_at: iso(item?.taken_at || item?.taken_at_timestamp || item?.timestamp || item?.created_at),
    likes: num(item?.like_count, item?.likes),
    shares: num(item?.reshare_count, item?.share_count, item?.shares),
    replies: num(item?.comment_count, item?.comments_count, item?.replies),
    views: num(item?.play_count, item?.view_count, item?.video_view_count),
  };
}

function normalizeThreads(item: any, handle: string): NormalizedMention | null {
  const id = str(item?.pk, item?.id, item?.post_id);
  const content = str(item?.caption?.text, item?.text, item?.caption, item?.description);
  if (!id || !content) return null;
  const user = item?.user || item?.author || {};
  const username = str(user?.username, item?.username, handle);
  return {
    platform: "Threads",
    external_id: `threads:${id}`,
    author_name: str(user?.full_name, user?.name, username) || null,
    author_username: username || null,
    content,
    post_url: str(item?.permalink, item?.url) || null,
    published_at: iso(item?.taken_at || item?.timestamp || item?.created_at),
    likes: num(item?.like_count, item?.likes),
    shares: num(item?.repost_count, item?.share_count, item?.shares),
    replies: num(item?.reply_count, item?.comment_count, item?.replies),
    views: num(item?.view_count, item?.views),
  };
}

function normalizeYouTube(item: any, handle: string): NormalizedMention | null {
  const id = str(item?.videoId, item?.video_id, item?.id);
  if (!id) return null;
  const title = str(item?.title?.runs?.[0]?.text, item?.title, item?.headline);
  const description = str(item?.description, item?.shortDescription, item?.descriptionSnippet?.runs?.[0]?.text);
  const content = [title, description].filter(Boolean).join("\n\n") || "[YouTube video]";
  return {
    platform: "YouTube",
    external_id: `yt:${id}`,
    author_name: str(item?.channelTitle, item?.author, handle) || null,
    author_username: handle || null,
    content,
    post_url: `https://www.youtube.com/watch?v=${id}`,
    published_at: iso(item?.publishedTimeText?.simpleText || item?.publishedAt || item?.publish_date || item?.timestamp),
    likes: num(item?.likeCount, item?.like_count, item?.likes),
    shares: num(item?.share_count, item?.shares),
    replies: num(item?.commentCount, item?.comment_count, item?.comments),
    views: num(item?.viewCount, item?.view_count, item?.views, item?.viewCountText?.simpleText),
  };
}

export async function collectFromEnsembleData(account: SocialAccount) {
  const platform = String(account.platform || "").toLowerCase();
  const handle = cleanHandle(account.handle);
  let payload: any;
  let items: any[] = [];
  let externalId: string | null = account.external_id || null;

  if (platform === "x") {
    const id = await resolveTwitterId(handle);
    externalId = id;
    payload = await ed("/twitter/user/tweets", { id });
    items = firstArray(payload);
    return { externalId, mentions: items.map((x) => normalizeTwitter(x, handle)).filter(Boolean) as NormalizedMention[] };
  }

  if (platform === "tiktok") {
    payload = await ed("/tt/user/posts", { username: handle, depth: 1 });
    items = firstArray(payload);
    return { externalId, mentions: items.map((x) => normalizeTikTok(x, handle)).filter(Boolean) as NormalizedMention[] };
  }

  if (platform === "threads") {
    payload = await ed("/threads/user/posts", { id: handle, chunk_size: 10 });
    items = firstArray(payload);
    return { externalId, mentions: items.map((x) => normalizeThreads(x, handle)).filter(Boolean) as NormalizedMention[] };
  }

  if (platform === "instagram") {
    const id = await resolveInstagramId(handle, externalId);
    externalId = id;
    payload = await ed("/instagram/user/posts", {
      user_id: id,
      depth: 1,
      chunk_size: 10,
      start_cursor: "",
      alternative_method: false,
    });
    items = firstArray(payload);
    return { externalId, mentions: items.map((x) => normalizeInstagram(x, handle)).filter(Boolean) as NormalizedMention[] };
  }

  if (platform === "youtube") {
    const browseId = await resolveYouTubeBrowseId(account);
    externalId = browseId;
    payload = await ed("/youtube/channel/videos", { browseId, depth: 1 });
    items = firstArray(payload);
    return { externalId, mentions: items.map((x) => normalizeYouTube(x, handle)).filter(Boolean) as NormalizedMention[] };
  }

  throw new Error(`EnsembleData collector is not configured for ${platform}`);
}
