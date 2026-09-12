import "server-only";
import { createHash } from "node:crypto";

export function contentHash(platform: string, content: string, author?: string | null) {
  return createHash("sha256")
    .update(`${String(platform).toLowerCase()}|${String(author || "").toLowerCase()}|${String(content || "").trim().toLowerCase()}`)
    .digest("hex");
}

export function extractTextMetadata(content: string) {
  const text = String(content || "");
  const hashtags = Array.from(new Set((text.match(/#[A-Za-z0-9_\u0600-\u06FF]+/g) || []).map((x) => x.slice(1).toLowerCase()))).slice(0, 50);
  const mentionedUsers = Array.from(new Set((text.match(/@[A-Za-z0-9_.-]+/g) || []).map((x) => x.slice(1).toLowerCase()))).slice(0, 50);
  const outboundUrls = Array.from(new Set(text.match(/https?:\/\/[^\s<>()]+/gi) || [])).slice(0, 25);
  const outboundDomains = Array.from(new Set(outboundUrls.map((u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } }).filter(Boolean)));
  return { hashtags, mentionedUsers, outboundUrls, outboundDomains };
}

export function detectLanguageHeuristic(content: string) {
  const text = String(content || "");
  const arabic = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  if (arabic && latin && Math.min(arabic, latin) / Math.max(arabic, latin) > 0.18) return "mixed";
  if (arabic > latin) return "ar";
  if (latin > 0) return "en";
  return "other";
}

export function inferMedia(raw: any) {
  const mediaUrl = firstString(
    raw?.media_url, raw?.video_url, raw?.image_url, raw?.display_url,
    raw?.thumbnail_url, raw?.cover, raw?.video?.play_addr?.url_list?.[0],
    raw?.image_versions2?.candidates?.[0]?.url
  );
  const thumbnailUrl = firstString(raw?.thumbnail_url, raw?.thumbnail, raw?.cover, raw?.image_url, raw?.display_url);
  const mediaType = raw?.video || raw?.video_url || raw?.play_count !== undefined ? "video" : mediaUrl ? "image" : null;
  const mediaCount = Array.isArray(raw?.carousel_media) ? raw.carousel_media.length : Array.isArray(raw?.media) ? raw.media.length : mediaUrl ? 1 : 0;
  const duration = numberOrNull(raw?.duration, raw?.video_duration, raw?.duration_seconds);
  return { mediaType, mediaUrl: mediaUrl || null, thumbnailUrl: thumbnailUrl || null, mediaCount, duration };
}

export function authorSignals(raw: any) {
  const user = raw?.author || raw?.user || raw?.owner || raw?.core?.user_results?.result?.legacy || {};
  return {
    followers: numberOrNull(user?.followers_count, user?.follower_count, user?.followers, user?.edge_followed_by?.count),
    following: numberOrNull(user?.following_count, user?.friends_count, user?.following, user?.edge_follow?.count),
    verified: typeof user?.verified === "boolean" ? user.verified : typeof user?.is_verified === "boolean" ? user.is_verified : null,
    biography: firstString(user?.biography, user?.bio, user?.description) || null,
    category: firstString(user?.category, user?.category_name, user?.account_type) || null,
    location: firstString(user?.location, user?.city, raw?.location?.name, raw?.place?.full_name) || null,
  };
}

function firstString(...values: any[]) {
  for (const v of values) if (typeof v === "string" && v.trim()) return v.trim();
  return "";
}
function numberOrNull(...values: any[]) {
  for (const v of values) {
    if (v === 0) return 0;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function recoverContent(raw: any, fallback: string) {
  const seen = new Set<any>();
  const keys = new Set(["full_text","caption_text","text","description","desc","title","selftext","body","content","post_text"]);
  function walk(v:any, depth=0):string {
    if (!v || depth > 5 || typeof v !== "object" || seen.has(v)) return ""; seen.add(v);
    for (const [k,val] of Object.entries(v)) { if (keys.has(k) && typeof val === "string" && val.trim().length > 2 && !/^https?:\/\//i.test(val.trim())) return val.trim(); }
    for (const val of Object.values(v)) { const x=walk(val,depth+1); if(x) return x; }
    return "";
  }
  const current=String(fallback||"").trim();
  if(current && !/^\[[^\]]+(post|video|review)[^\]]*\]$/i.test(current)) return current;
  return walk(raw) || current;
}
