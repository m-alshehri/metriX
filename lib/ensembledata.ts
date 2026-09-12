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
  raw_data?: any;
  media_type?: string | null;
  media_url?: string | null;
  thumbnail_url?: string | null;
};

function cleanHandle(value: string) {
  let v = String(value || "").trim();
  if (!v) return "";

  try {
    if (/^https?:\/\//i.test(v)) {
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
      const x = Number(String(v).replace(/,/g, ""));
      if (Number.isFinite(x)) return x;
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

function iso(...values: any[]) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;

    if (typeof value === "number" || /^\d+$/.test(String(value))) {
      const x = Number(value);
      const d = new Date(x > 100000000000 ? x : x * 1000);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }

    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }

  return new Date().toISOString();
}

function arraysDeep(value: any, out: any[][] = []): any[][] {
  if (!value || typeof value !== "object") return out;

  if (Array.isArray(value)) {
    if (value.length && value.some((x) => x && typeof x === "object")) out.push(value);
    for (const item of value) arraysDeep(item, out);
  } else {
    for (const child of Object.values(value)) arraysDeep(child, out);
  }

  return out;
}

function chooseItems(payload: any) {
  const preferred = [
    payload?.data?.data,
    payload?.data?.posts,
    payload?.data?.items,
    payload?.data?.videos,
    payload?.data?.tweets,
    payload?.posts,
    payload?.items,
    payload?.videos,
    payload?.tweets,
    payload?.results,
    Array.isArray(payload?.data) ? payload.data : null,
  ];

  for (const v of preferred) {
    if (Array.isArray(v) && v.length) return v;
  }

  const arrays = arraysDeep(payload);

  function score(arr: any[]) {
    if (!arr.length) return -1;
    const sample = arr.slice(0, 3);
    let points = 0;
    for (const item of sample) {
      const x = item?.node || item?.data || item;
      if (!x || typeof x !== "object") continue;
      if (x.id || x.pk || x.aweme_id || x.videoId || x.rest_id) points += 5;
      if (x.caption || x.text || x.title || x.desc || x.full_text || x.selftext) points += 4;
      if (x.like_count !== undefined || x.likes !== undefined || x.score !== undefined) points += 2;
      if (x.created_at || x.taken_at || x.timestamp || x.created_utc) points += 2;
    }
    return points;
  }

  arrays.sort((a, b) => score(b) - score(a) || b.length - a.length);
  return arrays[0] || [];
}

function deepFind(obj: any, keys: string[]): any {
  if (!obj || typeof obj !== "object") return undefined;

  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }

  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      const found = deepFind(value, keys);
      if (found !== undefined) return found;
    }
  }

  return undefined;
}

async function ed(
  path: string,
  params: Record<string, string | number | boolean | undefined>
) {
  const token = process.env.ENSEMBLEDATA_TOKEN;
  if (!token) throw new Error("ENSEMBLEDATA_TOKEN is missing");

  const url = new URL(ROOT + path);

  for (const [key, value] of Object.entries({ ...params, token })) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), { cache: "no-store" });
  const text = await response.text();

  let payload: any;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`EnsembleData returned non-JSON (${response.status})`);
  }

  if (!response.ok) {
    throw new Error(
      str(
        payload?.detail?.[0]?.msg,
        payload?.message,
        payload?.error?.message,
        payload?.error,
        `EnsembleData ${response.status}`
      )
    );
  }

  return payload;
}


function chooseInstagramPosts(payload: any) {
  const direct = [
    payload?.data,
    payload?.data?.data,
    payload?.data?.posts,
    payload?.data?.items,
    payload?.posts,
    payload?.items,
    payload?.feed_items,
  ];

  for (const v of direct) {
    if (
      Array.isArray(v) &&
      v.some((item: any) => {
        const x = item?.media || item?.node || item;
        return !!(x?.pk || x?.id || x?.code || x?.shortcode);
      })
    ) {
      return v.map((item: any) => item?.media || item?.node || item);
    }
  }

  const arrays = arraysDeep(payload);
  const candidates = arrays
    .map((arr) => ({
      arr,
      score: arr.reduce((total: number, item: any) => {
        const x = item?.media || item?.node || item;
        if (!x || typeof x !== "object") return total;
        let s = 0;
        if (x.pk || x.id || x.code || x.shortcode) s += 5;
        if (x.caption || x.caption_text || x.text) s += 4;
        if (x.like_count !== undefined || x.comment_count !== undefined) s += 2;
        if (x.taken_at || x.taken_at_timestamp || x.created_at) s += 2;
        return total + s;
      }, 0),
    }))
    .sort((a, b) => b.score - a.score);

  return (candidates[0]?.arr || []).map(
    (item: any) => item?.media || item?.node || item
  );
}

async function resolveTwitterId(handle: string) {
  const payload = await ed("/twitter/user/info", {
    name: cleanHandle(handle),
  });

  const id = deepFind(payload, ["rest_id", "id", "user_id"]);
  if (!id) throw new Error("Could not resolve X username");

  return String(id);
}

async function resolveInstagramId(
  handle: string,
  externalId?: string | null
) {
  if (externalId && /^\d+$/.test(externalId)) return externalId;

  const username = cleanHandle(handle);

  const attempts: Array<[string, Record<string, any>]> = [
    ["/instagram/user/info", { username }],
    ["/instagram/user/info", { name: username }],
    ["/instagram/user/search", { query: username }],
    ["/instagram/user/search", { name: username }],
  ];

  let lastError = "";

  for (const [path, params] of attempts) {
    try {
      const payload = await ed(path, params);
      const id = deepFind(payload, ["pk", "user_id", "id"]);
      if (id) return String(id);
    } catch (e: any) {
      lastError = String(e?.message || e);
    }
  }

  throw new Error(lastError || "Could not resolve Instagram username");
}

async function resolveThreadsId(handle: string) {
  const username = cleanHandle(handle);

  const payload = await ed("/threads/user/search", {
    name: username,
  });

  const candidates = chooseItems(payload);

  const exact = candidates.find((item: any) => {
    const node = item?.node || item;
    return cleanHandle(str(node?.username)).toLowerCase() === username.toLowerCase();
  });

  const selected = exact || candidates[0];
  const node = selected?.node || selected;

  const id = str(node?.pk, node?.id, node?.user_id);

  if (!id || !/^\d+$/.test(id)) {
    throw new Error("Could not resolve Threads username to a numeric user ID");
  }

  return id;
}

async function resolveYouTubeBrowseId(account: SocialAccount) {
  const raw = String(account.external_id || account.handle || "").trim();
  if (/^UC[\w-]{20,}$/.test(raw)) return raw;

  const handle = cleanHandle(account.handle);
  const key = process.env.YOUTUBE_API_KEY;

  if (!key) {
    throw new Error(
      "For YouTube, save a Channel ID or keep YOUTUBE_API_KEY for @handle resolution"
    );
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "id");
  url.searchParams.set("forHandle", handle);
  url.searchParams.set("key", key);

  const response = await fetch(url.toString(), { cache: "no-store" });
  const payload = await response.json();

  const id = payload?.items?.[0]?.id;
  if (!id) throw new Error("Could not resolve YouTube handle");

  return String(id);
}

function normalizeTwitter(
  item: any,
  handle: string
): NormalizedMention | null {
  const legacy = item?.legacy || item?.tweet?.legacy || item;

  const id = str(
    item?.rest_id,
    item?.id,
    item?.tweet?.rest_id,
    legacy?.id_str
  );

  const content = str(
    legacy?.full_text,
    legacy?.text,
    item?.text,
    item?.content
  );

  if (!id || !content) return null;

  const user =
    item?.core?.user_results?.result?.legacy ||
    item?.user ||
    item?.author ||
    {};

  const username = str(user?.screen_name, user?.username, handle);

  return {
    platform: "X",
    external_id: `x:${id}`,
    author_name: str(user?.name, username) || null,
    author_username: username || null,
    content,
    post_url: username ? `https://x.com/${username}/status/${id}` : null,
    published_at: iso(
      legacy?.created_at,
      item?.created_at,
      item?.timestamp
    ),
    likes: num(
      legacy?.favorite_count,
      item?.like_count,
      item?.likes
    ),
    shares: num(
      legacy?.retweet_count,
      item?.retweet_count,
      item?.shares
    ),
    replies: num(
      legacy?.reply_count,
      item?.reply_count,
      item?.replies
    ),
    views: num(
      item?.views?.count,
      legacy?.views,
      item?.view_count,
      item?.impressions
    ),
  };
}

function normalizeTikTok(
  item: any,
  handle: string
): NormalizedMention | null {
  const id = str(item?.aweme_id, item?.id, item?.video_id);
  if (!id) return null;

  const stats = item?.statistics || item?.stats || {};
  const author = item?.author || {};
  const username = str(
    author?.unique_id,
    author?.uniqueId,
    author?.username,
    handle
  );

  return {
    platform: "TikTok",
    external_id: `tt:${id}`,
    author_name: str(author?.nickname, author?.name, username) || null,
    author_username: username || null,
    content:
      str(item?.desc, item?.description, item?.text, item?.title) ||
      "[TikTok video]",
    post_url:
      str(item?.share_url, item?.shareUrl) ||
      (username
        ? `https://www.tiktok.com/@${username}/video/${id}`
        : null),
    published_at: iso(
      item?.create_time,
      item?.createTime,
      item?.timestamp
    ),
    likes: num(
      stats?.digg_count,
      stats?.like_count,
      item?.like_count
    ),
    shares: num(
      stats?.share_count,
      item?.share_count
    ),
    replies: num(
      stats?.comment_count,
      item?.comment_count
    ),
    views: num(
      stats?.play_count,
      stats?.view_count,
      item?.view_count
    ),
  };
}

function normalizeInstagram(
  item: any,
  handle: string
): NormalizedMention | null {
  const id = str(item?.pk, item?.id, item?.media_id);
  const code = str(item?.code, item?.shortcode);

  if (!id && !code) return null;

  const user = item?.user || item?.owner || {};
  const username = str(user?.username, handle);

  return {
    platform: "Instagram",
    external_id: `ig:${id || code}`,
    author_name: str(user?.full_name, user?.name, username) || null,
    author_username: username || null,
    content:
      str(
        item?.caption?.text,
        item?.caption_text,
        item?.caption,
        item?.text,
        item?.title
      ) || "[Instagram post]",
    post_url: code
      ? `https://www.instagram.com/p/${code}/`
      : str(item?.permalink) || null,
    published_at: iso(
      item?.taken_at,
      item?.taken_at_timestamp,
      item?.timestamp,
      item?.created_at
    ),
    likes: num(item?.like_count, item?.likes),
    shares: num(
      item?.reshare_count,
      item?.share_count,
      item?.shares
    ),
    replies: num(
      item?.comment_count,
      item?.comments_count,
      item?.replies
    ),
    views: num(
      item?.play_count,
      item?.view_count,
      item?.video_view_count
    ),
  };
}

function normalizeThreads(
  item: any,
  handle: string
): NormalizedMention | null {
  const node = item?.node || item;
  const id = str(node?.pk, node?.id, node?.post_id);

  const content = str(
    node?.caption?.text,
    node?.text_post_app_info?.link_preview_attachment?.display_url,
    node?.text,
    node?.caption,
    node?.description
  );

  if (!id) return null;

  const user = node?.user || node?.author || {};
  const username = str(user?.username, node?.username, handle);

  return {
    platform: "Threads",
    external_id: `threads:${id}`,
    author_name: str(user?.full_name, user?.name, username) || null,
    author_username: username || null,
    content: content || "[Threads post]",
    post_url: str(node?.permalink, node?.url) || null,
    published_at: iso(
      node?.taken_at,
      node?.timestamp,
      node?.created_at
    ),
    likes: num(node?.like_count, node?.likes),
    shares: num(
      node?.repost_count,
      node?.share_count,
      node?.shares
    ),
    replies: num(
      node?.reply_count,
      node?.comment_count,
      node?.replies
    ),
    views: num(
      node?.view_count,
      node?.views
    ),
  };
}

function normalizeYouTube(
  item: any,
  handle: string
): NormalizedMention | null {
  const id = str(item?.videoId, item?.video_id, item?.id);
  if (!id) return null;

  const title = str(
    item?.title?.runs?.[0]?.text,
    item?.title,
    item?.headline
  );

  const description = str(
    item?.description,
    item?.shortDescription,
    item?.descriptionSnippet?.runs?.[0]?.text
  );

  return {
    platform: "YouTube",
    external_id: `yt:${id}`,
    author_name: str(
      item?.channelTitle,
      item?.author,
      handle
    ) || null,
    author_username: handle || null,
    content:
      [title, description].filter(Boolean).join("\n\n") ||
      "[YouTube video]",
    post_url: `https://www.youtube.com/watch?v=${id}`,
    published_at: iso(
      item?.publishedAt,
      item?.publish_date,
      item?.timestamp
    ),
    likes: num(
      item?.likeCount,
      item?.like_count,
      item?.likes
    ),
    shares: num(
      item?.share_count,
      item?.shares
    ),
    replies: num(
      item?.commentCount,
      item?.comment_count,
      item?.comments
    ),
    views: num(
      item?.viewCount,
      item?.view_count,
      item?.views
    ),
  };
}

function normalizeReddit(
  item: any
): NormalizedMention | null {
  const x = item?.data && !item?.data?.posts ? item.data : item;

  const id = str(x?.id, x?.name);
  if (!id) return null;

  const title = str(x?.title);
  const body = str(x?.selftext, x?.body);

  const permalink = str(x?.permalink);

  return {
    platform: "Reddit",
    external_id: `reddit:${id}`,
    author_name: str(x?.author) || null,
    author_username: str(x?.author) || null,
    content:
      [title, body].filter(Boolean).join("\n\n") ||
      "[Reddit post]",
    post_url: permalink
      ? `https://www.reddit.com${permalink}`
      : str(x?.url) || null,
    published_at: iso(x?.created_utc, x?.created),
    likes: num(x?.score, x?.ups),
    shares: num(x?.num_crossposts),
    replies: num(x?.num_comments),
    views: num(x?.view_count),
  };
}

function normalizeSnapchat(
  item: any,
  handle: string
): NormalizedMention | null {
  const id = str(
    item?.id,
    item?.snap_id,
    item?.story_id,
    item?.content_id
  );

  const content = str(
    item?.description,
    item?.title,
    item?.text,
    item?.caption
  );

  if (!id || !content) return null;

  return {
    platform: "Snapchat",
    external_id: `snap:${id}`,
    author_name:
      str(item?.display_name, item?.name, handle) || null,
    author_username: handle || null,
    content,
    post_url:
      str(item?.url, item?.share_url, item?.permalink) || null,
    published_at: iso(
      item?.timestamp,
      item?.created_at,
      item?.create_time
    ),
    likes: num(item?.likes, item?.like_count),
    shares: num(item?.shares, item?.share_count),
    replies: num(item?.comments, item?.comment_count),
    views: num(item?.views, item?.view_count),
  };
}

function parseRedditTarget(value: string) {
  const raw = String(value || "").trim();

  const userMatch = raw.match(
    /(?:reddit\.com\/)?user\/([^/?#]+)/i
  );

  if (userMatch?.[1]) {
    return {
      type: "user" as const,
      value: userMatch[1],
    };
  }

  const subredditMatch = raw.match(
    /(?:reddit\.com\/)?r\/([^/?#]+)/i
  );

  if (subredditMatch?.[1]) {
    return {
      type: "subreddit" as const,
      value: subredditMatch[1],
    };
  }

  return {
    type: "subreddit" as const,
    value: raw
      .replace(/^@/, "")
      .replace(/^r\//i, "")
      .replace(/\/.*$/, ""),
  };
}

async function collectRedditUserPublic(username: string) {
  // EnsembleData has no documented Reddit user-posts endpoint.
  // Use its documented keyword search endpoint and filter by exact author.
  // "relevance" + "hour" are documented-valid values and avoid validation errors.
  const payload = await ed("/reddit/keyword/search", {
    name: username,
    sort: "relevance",
    period: "hour",
    cursor: "",
  });

  const items = chooseItems(payload);

  return items.filter((item: any) => {
    const x = item?.data || item;
    return str(x?.author).toLowerCase() === username.toLowerCase();
  });
}

function attachRaw<T extends NormalizedMention | null>(m: T, raw: any): T {
  if (!m) return m;
  (m as NormalizedMention).raw_data = raw;
  return m;
}

export async function collectFromEnsembleData(account: SocialAccount) {
  const platform = String(account.platform || "").toLowerCase();
  const handle = cleanHandle(account.handle);

  let payload: any;
  let items: any[] = [];
  let externalId: string | null = account.external_id || null;

  if (platform === "x") {
    externalId = await resolveTwitterId(handle);

    payload = await ed("/twitter/user/tweets", {
      id: externalId,
    });

    items = chooseItems(payload);

    return {
      externalId,
      mentions: items
        .map((x) => attachRaw(normalizeTwitter(x, handle), x))
        .filter(Boolean) as NormalizedMention[],
    };
  }

  if (platform === "tiktok") {
    payload = await ed("/tt/user/posts", {
      username: handle,
      depth: 1,
    });

    items = chooseItems(payload);

    return {
      externalId,
      mentions: items
        .map((x) => attachRaw(normalizeTikTok(x, handle), x))
        .filter(Boolean) as NormalizedMention[],
    };
  }

  if (platform === "threads") {
    externalId = await resolveThreadsId(handle);

    payload = await ed("/threads/user/posts", {
      id: externalId,
      chunk_size: 10,
    });

    items = chooseItems(payload);

    return {
      externalId,
      mentions: items
        .map((x) => attachRaw(normalizeThreads(x, handle), x))
        .filter(Boolean) as NormalizedMention[],
    };
  }

  if (platform === "instagram") {
    externalId = await resolveInstagramId(
      handle,
      externalId
    );

    payload = await ed("/instagram/user/posts", {
      user_id: externalId,
      depth: 1,
      chunk_size: 10,
      start_cursor: "",
      alternative_method: false,
    });

    items = chooseInstagramPosts(payload);

    return {
      externalId,
      mentions: items
        .map((x) => attachRaw(normalizeInstagram(x, handle), x))
        .filter(Boolean) as NormalizedMention[],
    };
  }

  if (platform === "youtube") {
    externalId = await resolveYouTubeBrowseId(account);

    payload = await ed("/youtube/channel/videos", {
      browseId: externalId,
      depth: 1,
    });

    items = chooseItems(payload);

    return {
      externalId,
      mentions: items
        .map((x) => attachRaw(normalizeYouTube(x, handle), x))
        .filter(Boolean) as NormalizedMention[],
    };
  }

  if (platform === "reddit") {
    const target = parseRedditTarget(account.handle);

    if (!target.value) {
      throw new Error(
        "Enter a Reddit subreddit (r/name) or user profile URL"
      );
    }

    if (target.type === "user") {
      items = await collectRedditUserPublic(target.value);

      return {
        externalId: `user:${target.value}`,
        mentions: items
          .map((x) => attachRaw(normalizeReddit(x), x))
          .filter(Boolean) as NormalizedMention[],
      };
    }

    payload = await ed("/reddit/subreddit/posts", {
      name: target.value,
      sort: "new",
      period: "hour",
      cursor: "",
    });

    items = chooseItems(payload);

    return {
      externalId: `subreddit:${target.value}`,
      mentions: items
        .map((x) => attachRaw(normalizeReddit(x), x))
        .filter(Boolean) as NormalizedMention[],
    };
  }

  if (platform === "snapchat") {
    payload = await ed("/snapchat/user/info", {
      name: handle,
    });

    items = chooseItems(payload);

    return {
      externalId,
      mentions: items
        .map((x) => attachRaw(normalizeSnapchat(x, handle), x))
        .filter(Boolean) as NormalizedMention[],
    };
  }

  throw new Error(
    `EnsembleData collector is not configured for ${platform}`
  );
}
