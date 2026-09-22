import "server-only";
import { reserveBrightDataTest } from "@/lib/brightdata-budget";

export type BrightMention = {
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
};

const API = "https://api.brightdata.com/datasets/v3";

export class BrightDataPendingError extends Error {
  snapshotId: string;
  constructor(snapshotId: string) {
    super(`Bright Data is still processing snapshot ${snapshotId}.`);
    this.name = "BrightDataPendingError";
    this.snapshotId = snapshotId;
  }
}

export function isBrightDataPending(
  error: any,
): error is BrightDataPendingError {
  return error instanceof BrightDataPendingError || Boolean(error?.snapshotId);
}

const DATASETS = {
  facebook: "gd_lkaxegm826bjpoo9m5",
  linkedin: "gd_lyy3tktm25m4avu764",
  googleMaps: "gd_luzfs1dn2oa0teb81",
};

function s(...values: any[]) {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return "";
}

function n(...values: any[]) {
  for (const v of values) {
    if (v === 0) return 0;
    if (v !== undefined && v !== null && v !== "") {
      const x = Number(String(v).replace(/,/g, ""));
      if (Number.isFinite(x)) return x;
    }
  }
  return 0;
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function canonicalFacebook(value: string) {
  let v = String(value || "").trim();
  if (!v) throw new Error("Facebook page URL or username is required");

  if (!/^https?:\/\//i.test(v)) {
    v = `https://www.facebook.com/${v.replace(/^@/, "").replace(/^facebook\.com\//i, "")}`;
  }

  const u = new URL(v);
  const parts = u.pathname.split("/").filter(Boolean);
  if (!parts[0]) throw new Error("Invalid Facebook page URL");

  return `https://www.facebook.com/${parts[0]}`;
}

function canonicalLinkedIn(value: string) {
  let v = String(value || "").trim();
  if (!v) throw new Error("LinkedIn company/profile URL is required");

  if (!/^https?:\/\//i.test(v)) {
    v = v.replace(/^@/, "").replace(/^linkedin\.com\//i, "");
    v =
      v.startsWith("company/") || v.startsWith("in/")
        ? `https://www.linkedin.com/${v}`
        : `https://www.linkedin.com/company/${v}`;
  }

  const u = new URL(v);
  const parts = u.pathname.split("/").filter(Boolean);

  const companyIndex = parts.indexOf("company");
  if (companyIndex >= 0 && parts[companyIndex + 1]) {
    return `https://www.linkedin.com/company/${parts[companyIndex + 1]}/`;
  }

  const profileIndex = parts.indexOf("in");
  if (profileIndex >= 0 && parts[profileIndex + 1]) {
    return `https://www.linkedin.com/in/${parts[profileIndex + 1]}/`;
  }

  throw new Error("Use a canonical LinkedIn company or profile URL");
}

function explain(status: number, raw: string) {
  if (/customer is not active/i.test(raw)) {
    return new Error(
      "Bright Data account is not active. Activate Web Scraper API/billing in Bright Data.",
    );
  }

  if (/invalid input/i.test(raw)) {
    const compact = String(raw || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 700);
    return new Error(
      `Bright Data rejected the target URL/input. Provider response: ${compact || "Invalid input"}`,
    );
  }

  return new Error(raw || `Bright Data ${status}`);
}

async function parseResponse(response: Response) {
  const text = await response.text();

  try {
    return {
      payload: JSON.parse(text),
      text,
    };
  } catch {
    return {
      payload: null,
      text,
    };
  }
}

async function parseSnapshotRows(response: Response) {
  const raw = await response.text();
  const trimmed = raw.trim();
  if (!trimmed) return [];

  try {
    const payload = JSON.parse(trimmed);
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.records)) return payload.records;
    if (Array.isArray(payload?.results)) return payload.results;
    if (payload && typeof payload === "object" && !payload.status)
      return [payload];
  } catch {}

  const rows: any[] = [];
  for (const line of trimmed.split(/\r?\n/)) {
    const value = line.trim();
    if (!value) continue;
    try {
      const item = JSON.parse(value);
      if (Array.isArray(item)) rows.push(...item);
      else if (Array.isArray(item?.data)) rows.push(...item.data);
      else if (Array.isArray(item?.records)) rows.push(...item.records);
      else if (item && typeof item === "object") rows.push(item);
    } catch {
      rows.push({
        error: "unparseable_snapshot_line",
        raw: value.slice(0, 2000),
      });
    }
  }
  return rows;
}

async function downloadSnapshotPart(
  token: string,
  snapshotId: string,
  part: number,
  batchSize: number,
) {
  const url = new URL(`${API}/snapshot/${encodeURIComponent(snapshotId)}`);
  url.searchParams.set("format", "jsonl");
  url.searchParams.set("batch_size", String(batchSize));
  url.searchParams.set("part", String(part));
  url.searchParams.set("compress", "false");
  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw explain(response.status, await response.text());
  return parseSnapshotRows(response);
}

async function getSnapshotPartCount(
  token: string,
  snapshotId: string,
  batchSize: number,
) {
  const url = new URL(
    `${API}/snapshot/${encodeURIComponent(snapshotId)}/parts`,
  );
  url.searchParams.set("format", "jsonl");
  url.searchParams.set("batch_size", String(batchSize));
  url.searchParams.set("compress", "false");
  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) return 1;
  const { payload } = await parseResponse(response);
  return Math.max(1, n(payload?.parts, payload?.total_parts, 1));
}

async function getSnapshot(token: string, snapshotId: string) {
  for (let attempt = 0; attempt < 1; attempt++) {
    const progress = await fetch(
      `${API}/progress/${encodeURIComponent(snapshotId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      },
    );
    const { payload, text } = await parseResponse(progress);
    if (!progress.ok) throw explain(progress.status, text);
    const status = String(payload?.status || "").toLowerCase();

    if (status === "ready") {
      const batchSize = 100;
      const parts = await getSnapshotPartCount(token, snapshotId, batchSize);
      const allRows: any[] = [];
      for (let part = 1; part <= Math.min(parts, 1); part++) {
        allRows.push(
          ...(await downloadSnapshotPart(token, snapshotId, part, batchSize)),
        );
      }
      return allRows;
    }
    if (status === "failed")
      throw new Error(`Bright Data snapshot ${snapshotId} failed`);
  }
  throw new BrightDataPendingError(snapshotId);
}

async function scrape(
  datasetId: string,
  input: Record<string, any>[],
  accountId: string,
) {
  const token = process.env.BRIGHTDATA_API_TOKEN;
  if (!token) throw new Error("BRIGHTDATA_API_TOKEN is missing");

  if (input.length !== 1)
    throw new Error("Bright Data tests require exactly one input");
  const platform =
    datasetId === DATASETS.googleMaps
      ? "google_maps"
      : datasetId === DATASETS.facebook
        ? "facebook"
        : "linkedin";
  await reserveBrightDataTest(platform, accountId);

  // Trigger asynchronously so a long-running scrape does not require a second
  // paid submission after our HTTP timeout. Limits are applied at the provider.
  const url = new URL(`${API}/trigger`);
  url.searchParams.set("dataset_id", datasetId);
  url.searchParams.set("include_errors", "true");
  url.searchParams.set("limit_per_input", "1");
  url.searchParams.set("limit_multiple_results", "1");
  if (datasetId === DATASETS.linkedin) {
    url.searchParams.set("type", "discover_new");
    url.searchParams.set(
      "discover_by",
      input[0].url.includes("/company/") ? "company_url" : "profile_url",
    );
  }

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input, limit_per_input: 1 }),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });

  const { payload, text } = await parseResponse(response);

  if (!response.ok) {
    throw explain(response.status, text);
  }

  if (Array.isArray(payload))
    return { rows: payload, snapshotId: null, sourceStatus: "ready" };

  const snapshotId = s(
    payload?.snapshot_id,
    payload?.id,
    payload?.snapshot?.id,
  );

  if (snapshotId) {
    throw new BrightDataPendingError(snapshotId);
  }

  if (payload?.error) {
    throw explain(response.status, s(payload.error, payload.message));
  }

  if (Array.isArray(payload?.data))
    return { rows: payload.data, snapshotId: null, sourceStatus: "ready" };

  return { rows: [], snapshotId: null, sourceStatus: "empty" };
}

function unwrapRows(rows: any[]) {
  const out: any[] = [];
  const visit = (value: any) => {
    if (!value) return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (typeof value !== "object") return;
    for (const key of [
      "data",
      "records",
      "results",
      "items",
      "reviews",
      "posts",
    ]) {
      if (Array.isArray(value[key])) {
        for (const item of value[key]) visit(item);
        return;
      }
    }
    out.push(value);
  };
  visit(rows);
  return out;
}

function fbMentions(inputRows: any[]) {
  const rows = unwrapRows(inputRows).slice(0, 100);
  const mentions: BrightMention[] = rows
    .filter((x: any) => x && !x.error)
    .map((x: any) => {
      const id = s(x.post_id, x.postId, x.shortcode, x.id, x.url, x.post_url);
      return {
        platform: "Facebook",
        external_id: `fb:${id}`,
        author_name:
          s(
            x.page_name,
            x.page_title,
            x.user_name,
            x.author_name,
            x.name,
            x.profile_name,
          ) || null,
        author_username:
          s(
            x.profile_handle,
            x.username,
            x.user_username_raw,
            x.author_username,
          ) || null,
        content:
          s(
            x.content,
            x.post_text,
            x.text,
            x.message,
            x.description,
            x.caption,
          ) || "[Facebook post]",
        post_url: s(x.url, x.post_url, x.postUrl) || null,
        published_at: iso(
          x.date_posted,
          x.posted_at,
          x.created_at,
          x.date,
          x.timestamp,
        ),
        likes: n(
          x.likes,
          x.likes_count,
          x.num_likes,
          x.num_likes_type?.num,
          x.reactions,
          x.reactions_count,
        ),
        shares: n(x.num_shares, x.shares, x.shares_count),
        replies: n(x.num_comments, x.comments, x.comments_count),
        views: n(x.video_view_count, x.video_views, x.play_count, x.views),
        raw_data: x,
      };
    })
    .filter((x: BrightMention) => x.external_id !== "fb:");
  return { rows, mentions };
}

function linkedInMentions(inputRows: any[]) {
  const rows = unwrapRows(inputRows).slice(0, 100);
  const mentions: BrightMention[] = rows
    .filter((x: any) => x && !x.error)
    .map((x: any) => {
      const id = s(x.id, x.post_id, x.activity_id, x.urn, x.url, x.post_url);
      return {
        platform: "LinkedIn",
        external_id: `li:${id}`,
        author_name:
          s(
            x.user_name,
            x.author_name,
            x.author?.name,
            x.name,
            x.company_name,
            x.headline,
          ) || null,
        author_username:
          s(x.user_url, x.author_url, x.author?.url, x.profile_url) || null,
        content:
          s(
            x.post_text,
            x.text,
            x.content,
            x.description,
            x.title,
            x.headline,
          ) || "[LinkedIn post]",
        post_url: s(x.url, x.post_url) || null,
        published_at: iso(
          x.date_posted,
          x.published_at,
          x.posted_at,
          x.created_at,
          x.timestamp,
        ),
        likes: n(x.num_likes, x.likes, x.likes_count),
        shares: n(
          x.num_reposts,
          x.reposts,
          x.num_shares,
          x.shares,
          x.shares_count,
        ),
        replies: n(x.num_comments, x.comments, x.comments_count),
        views: n(x.views, x.impressions),
        raw_data: x,
      };
    })
    .filter((x: BrightMention) => x.external_id !== "li:");
  return { rows, mentions };
}

function googleMapsMentions(inputRows: any[], fallbackUrl: string) {
  const rows = unwrapRows(inputRows).slice(0, 100);
  const mentions: BrightMention[] = rows
    .filter((x: any) => x && !x.error)
    .map((x: any) => {
      const rating = n(x.rating, x.review_rating, x.stars, x.review_stars);
      const id = s(
        x.review_id,
        x.reviewId,
        x.id,
        x.review_url,
        x.review_link,
        `${s(x.reviewer_name, x.author_name, x.user_name, "reviewer")}:${s(x.timestamp, x.review_date, x.date, x.published_at)}`,
      );
      const body = s(
        x.review_text,
        x.review,
        x.text,
        x.comment,
        x.description,
        x.content,
      );
      const content =
        body ||
        (rating ? `${rating}/5 Google Maps rating` : "[Google Maps review]");
      return {
        platform: "Google Maps",
        external_id: `gm:${id}`,
        author_name:
          s(x.reviewer_name, x.author_name, x.user_name, x.name) || null,
        author_username: s(x.reviewer_url, x.author_url, x.profile_url) || null,
        content: rating ? `[Rating: ${rating}/5] ${content}` : content,
        post_url: s(x.review_url, x.review_link, x.url) || fallbackUrl,
        published_at: iso(
          x.review_date,
          x.date,
          x.published_at,
          x.timestamp,
          x.date_posted,
        ),
        likes: n(x.review_likes, x.likes, x.likes_count, x.helpful_count),
        shares: 0,
        replies: x.owner_answer || x.owner_response ? 1 : n(x.replies),
        views: 0,
        raw_data: x,
      };
    })
    .filter((x: BrightMention) => x.external_id !== "gm:");
  return { rows, mentions };
}

export async function collectFacebook(target: string, accountId: string) {
  const url = canonicalFacebook(target);
  const collection = await scrape(
    DATASETS.facebook,
    [{ url, num_of_posts: 1 }],
    accountId,
  );
  const parsed = fbMentions(collection.rows);
  return {
    externalId: null,
    mentions: parsed.mentions,
    providerMeta: {
      requested: 1,
      returned: parsed.rows.length,
      normalized: parsed.mentions.length,
      failed: parsed.rows.filter((x: any) => x?.error).length,
      snapshotId: collection.snapshotId,
      rawSample: parsed.rows.slice(0, 3),
    },
  };
}

export async function collectLinkedIn(target: string, accountId: string) {
  const url = canonicalLinkedIn(target);
  const collection = await scrape(DATASETS.linkedin, [{ url }], accountId);
  const parsed = linkedInMentions(collection.rows);
  return {
    externalId: null,
    mentions: parsed.mentions,
    providerMeta: {
      requested: 1,
      returned: parsed.rows.length,
      normalized: parsed.mentions.length,
      failed: parsed.rows.filter((x: any) => x?.error).length,
      snapshotId: collection.snapshotId,
      rawSample: parsed.rows.slice(0, 3),
    },
  };
}

export async function collectGoogleMapsReviews(
  target: string,
  accountId: string,
) {
  const url = String(target || "").trim();
  if (!/^https?:\/\//i.test(url))
    throw new Error("Google Maps requires a full public Google Maps place URL");
  const collection = await scrape(DATASETS.googleMaps, [{ url }], accountId);
  const parsed = googleMapsMentions(collection.rows, url);
  return {
    externalId: null,
    mentions: parsed.mentions,
    providerMeta: {
      requested: 1,
      returned: parsed.rows.length,
      normalized: parsed.mentions.length,
      failed: parsed.rows.filter((x: any) => x?.error).length,
      snapshotId: collection.snapshotId,
      rawSample: parsed.rows.slice(0, 3),
    },
  };
}

// Resume a previously-created Bright Data snapshot instead of starting a new job.
// This is used by metriX provider_jobs persistence.
export async function resumeBrightDataSnapshot(
  snapshotId: string,
  platform: string,
  target: string,
) {
  const token = process.env.BRIGHTDATA_API_TOKEN;
  if (!token) throw new Error("BRIGHTDATA_API_TOKEN is missing");
  const downloaded = await getSnapshot(token, snapshotId);
  const p = String(platform || "").toLowerCase();
  let parsed: { rows: any[]; mentions: BrightMention[] };
  if (p === "facebook") parsed = fbMentions(downloaded);
  else if (p === "linkedin") parsed = linkedInMentions(downloaded);
  else if (p === "google_maps")
    parsed = googleMapsMentions(downloaded, String(target || "").trim());
  else throw new Error(`Unsupported Bright Data resume platform: ${platform}`);
  return {
    externalId: null,
    mentions: parsed.mentions,
    providerMeta: {
      requested: 0,
      returned: parsed.rows.length,
      normalized: parsed.mentions.length,
      failed: parsed.rows.filter((x: any) => x?.error).length,
      snapshotId,
      rawSample: parsed.rows.slice(0, 3),
    },
  };
}
