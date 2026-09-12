import "server-only";

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
};

const API = "https://api.brightdata.com/datasets/v3";

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
      const num = Number(String(v).replace(/,/g, ""));
      if (Number.isFinite(num)) return num;
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
  const p = u.pathname.split("/").filter(Boolean);
  if (!p[0]) throw new Error("Invalid Facebook page URL");
  return `https://www.facebook.com/${p[0]}`;
}

function canonicalLinkedIn(value: string) {
  let v = String(value || "").trim();
  if (!v) throw new Error("LinkedIn company/profile URL is required");
  if (!/^https?:\/\//i.test(v)) {
    v = v.replace(/^@/, "").replace(/^linkedin\.com\//i, "");
    v = v.startsWith("company/") || v.startsWith("in/")
      ? `https://www.linkedin.com/${v}`
      : `https://www.linkedin.com/company/${v}`;
  }

  const u = new URL(v);
  const p = u.pathname.split("/").filter(Boolean);
  const company = p.indexOf("company");
  if (company >= 0 && p[company + 1]) {
    return `https://www.linkedin.com/company/${p[company + 1]}`;
  }
  const profile = p.indexOf("in");
  if (profile >= 0 && p[profile + 1]) {
    return `https://www.linkedin.com/in/${p[profile + 1]}`;
  }
  throw new Error("Use a canonical LinkedIn company or profile URL");
}

function explainBrightDataError(status: number, raw: string) {
  if (/customer is not active/i.test(raw)) {
    return new Error(
      "Bright Data account is not active. Activate Web Scraper API/billing, then run the pipeline again."
    );
  }
  if (/invalid input/i.test(raw)) {
    return new Error(
      "Bright Data rejected the target URL. Use the canonical public page/profile/place URL."
    );
  }
  return new Error(raw || `Bright Data ${status}`);
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  try {
    return { payload: JSON.parse(text), text };
  } catch {
    return { payload: null, text };
  }
}

async function downloadSnapshot(token: string, snapshotId: string) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const progress = await fetch(`${API}/progress/${snapshotId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const { payload, text } = await readJsonResponse(progress);
    if (!progress.ok) throw explainBrightDataError(progress.status, text);

    const status = String(payload?.status || "").toLowerCase();
    if (status === "ready") {
      const result = await fetch(
        `${API}/snapshot/${snapshotId}?format=json`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }
      );

      const parsed = await readJsonResponse(result);
      if (!result.ok) throw explainBrightDataError(result.status, parsed.text);

      return Array.isArray(parsed.payload)
        ? parsed.payload
        : Array.isArray(parsed.payload?.data)
          ? parsed.payload.data
          : [];
    }

    if (status === "failed") {
      throw new Error(`Bright Data snapshot ${snapshotId} failed`);
    }

    await sleep(3000);
  }

  throw new Error(
    "Bright Data collection is still processing. Run the pipeline again shortly."
  );
}

async function scrape(
  datasetId: string,
  input: Record<string, any>[],
  extraQuery?: Record<string, string>
) {
  const token = process.env.BRIGHTDATA_API_TOKEN;
  if (!token) throw new Error("BRIGHTDATA_API_TOKEN is missing");

  const url = new URL(`${API}/scrape`);
  url.searchParams.set("dataset_id", datasetId);
  url.searchParams.set("include_errors", "true");
  url.searchParams.set("format", "json");

  for (const [k, v] of Object.entries(extraQuery || {})) {
    url.searchParams.set(k, v);
  }

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input }),
    cache: "no-store",
  });

  const { payload, text } = await readJsonResponse(response);

  if (response.status === 202) {
    const snapshotId = s(payload?.snapshot_id, payload?.id);
    if (!snapshotId) throw new Error("Bright Data returned 202 without snapshot_id");
    return await downloadSnapshot(token, snapshotId);
  }

  if (!response.ok) throw explainBrightDataError(response.status, text);

  if (payload?.error) {
    throw explainBrightDataError(response.status, s(payload.error, payload.message));
  }

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export async function collectFacebook(target: string) {
  const url = canonicalFacebook(target);
  const rows = await scrape(DATASETS.facebook, [{ url }]);

  const mentions: BrightMention[] = rows
    .filter((x: any) => x && !x.error)
    .map((x: any) => {
      const id = s(x.post_id, x.shortcode, x.id, x.url);
      return {
        platform: "Facebook",
        external_id: `fb:${id}`,
        author_name: s(x.page_name, x.user_name, x.user_username_raw, x.profile_handle) || null,
        author_username: s(x.profile_handle, x.user_username_raw) || null,
        content: s(x.content, x.text, x.description) || "[Facebook post]",
        post_url: s(x.url) || null,
        published_at: iso(x.date_posted, x.created_at, x.timestamp),
        likes: n(x.likes, x.num_likes_type?.num, x.reactions),
        shares: n(x.num_shares, x.shares),
        replies: n(x.num_comments, x.comments),
        views: n(x.video_view_count, x.play_count, x.views),
      };
    })
    .filter((x: BrightMention) => !!x.external_id && x.external_id !== "fb:");

  return { externalId: null, mentions };
}

export async function collectLinkedIn(target: string) {
  const url = canonicalLinkedIn(target);
  const isProfile = /linkedin\.com\/in\//i.test(url);

  const rows = await scrape(
    DATASETS.linkedin,
    [{ url, only_authored_posts: true }],
    {
      type: "discover_new",
      discover_by: isProfile ? "profile_url" : "company_url",
    }
  );

  const mentions: BrightMention[] = rows
    .filter((x: any) => x && !x.error)
    .map((x: any) => {
      const id = s(x.id, x.post_id, x.activity_id, x.url);
      return {
        platform: "LinkedIn",
        external_id: `li:${id}`,
        author_name: s(x.user_name, x.author_name, x.name, x.headline) || null,
        author_username: s(x.user_url, x.author_url) || null,
        content: s(x.post_text, x.text, x.description, x.title, x.headline) || "[LinkedIn post]",
        post_url: s(x.url) || null,
        published_at: iso(x.date_posted, x.published_at, x.timestamp),
        likes: n(x.num_likes, x.likes),
        shares: n(x.num_reposts, x.num_shares, x.shares),
        replies: n(x.num_comments, x.comments),
        views: n(x.views, x.impressions),
      };
    })
    .filter((x: BrightMention) => !!x.external_id && x.external_id !== "li:");

  return { externalId: null, mentions };
}

export async function collectGoogleMapsReviews(target: string) {
  const url = String(target || "").trim();
  if (!/^https?:\/\//i.test(url)) {
    throw new Error("Google Maps requires a full public Google Maps place URL");
  }

  const rows = await scrape(DATASETS.googleMaps, [
    { url, days_limit: 90, sort_by: "Newest" },
  ]);

  const mentions: BrightMention[] = rows
    .filter((x: any) => x && !x.error)
    .map((x: any) => {
      const rating = n(x.rating, x.review_rating, x.stars);
      const id = s(
        x.review_id,
        x.id,
        `${x.reviewer_name || "reviewer"}:${x.timestamp || x.review_date || ""}`
      );
      const text =
        s(x.review_text, x.text, x.review, x.comment) ||
        (rating ? `${rating}/5 Google Maps rating` : "[Google Maps review]");

      return {
        platform: "Google Maps",
        external_id: `gm:${id}`,
        author_name: s(x.reviewer_name, x.author_name, x.name) || null,
        author_username: s(x.reviewer_url, x.author_url) || null,
        content: rating ? `[Rating: ${rating}/5] ${text}` : text,
        post_url: s(x.review_url, x.url) || url,
        published_at: iso(x.review_date, x.date, x.timestamp, x.date_posted),
        likes: n(x.review_likes, x.likes),
        shares: 0,
        replies: x.owner_answer ? 1 : n(x.replies),
        views: 0,
      };
    })
    .filter((x: BrightMention) => !!x.external_id && x.external_id !== "gm:");

  return { externalId: null, mentions };
}
