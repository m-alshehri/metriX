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

const API = "https://api.brightdata.com/datasets/v3/scrape";

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
      const value = Number(String(v).replace(/,/g, ""));
      if (Number.isFinite(value)) return value;
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

function fbUrl(value: string) {
  const v = String(value || "").trim();
  if (/^https?:\/\//i.test(v)) return v;

  return `https://www.facebook.com/${v
    .replace(/^@/, "")
    .replace(/^facebook\.com\//i, "")}`;
}

function liUrl(value: string) {
  let v = String(value || "").trim();
  if (/^https?:\/\//i.test(v)) return v;

  v = v
    .replace(/^@/, "")
    .replace(/^linkedin\.com\//i, "");

  return v.startsWith("company/") || v.startsWith("in/")
    ? `https://www.linkedin.com/${v}`
    : `https://www.linkedin.com/company/${v}`;
}

async function scrape(
  datasetId: string,
  input: Record<string, any>[],
  extraQuery?: Record<string, string>
) {
  const token = process.env.BRIGHTDATA_API_TOKEN;

  if (!token) {
    throw new Error("BRIGHTDATA_API_TOKEN is missing");
  }

  const url = new URL(API);
  url.searchParams.set("dataset_id", datasetId);
  url.searchParams.set("include_errors", "true");
  url.searchParams.set("format", "json");

  for (const [key, value] of Object.entries(extraQuery || {})) {
    url.searchParams.set(key, value);
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

  const text = await response.text();
  let payload: any;

  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(
      `Bright Data returned non-JSON (${response.status}): ${text.slice(0, 200)}`
    );
  }

  if (!response.ok) {
    throw new Error(
      s(
        payload?.message,
        payload?.error,
        payload?.errors?.[0]?.message,
        `Bright Data ${response.status}`
      )
    );
  }

  if (payload?.error) {
    throw new Error(
      s(payload.error, payload.message) || "Bright Data error"
    );
  }

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;

  return [];
}

export async function collectFacebook(target: string) {
  const rows = await scrape(
    DATASETS.facebook,
    [{ url: fbUrl(target) }]
  );

  const mentions = rows
    .filter((x: any) => x && !x.error)
    .map(
      (x: any): BrightMention => ({
        platform: "Facebook",
        external_id: `fb:${s(
          x.post_id,
          x.shortcode,
          x.id,
          x.url
        )}`,
        author_name:
          s(
            x.page_name,
            x.user_name,
            x.user_username_raw,
            x.profile_handle
          ) || null,
        author_username:
          s(x.profile_handle, x.user_username_raw) || null,
        content:
          s(x.content, x.text, x.description) ||
          "[Facebook post]",
        post_url: s(x.url) || null,
        published_at: iso(
          x.date_posted,
          x.created_at,
          x.timestamp
        ),
        likes: n(
          x.likes,
          x.num_likes_type?.num
        ),
        shares: n(
          x.num_shares,
          x.shares
        ),
        replies: n(
          x.num_comments,
          x.comments
        ),
        views: n(
          x.video_view_count,
          x.play_count,
          x.views
        ),
      })
    );

  return {
    externalId: null,
    mentions,
  };
}

export async function collectLinkedIn(target: string) {
  const url = liUrl(target);
  const isProfile = /linkedin\.com\/in\//i.test(url);

  const rows = await scrape(
    DATASETS.linkedin,
    [
      {
        url,
        only_authored_posts: true,
      },
    ],
    {
      type: "discover_new",
      discover_by: isProfile
        ? "profile_url"
        : "company_url",
    }
  );

  const mentions = rows
    .filter((x: any) => x && !x.error)
    .map(
      (x: any): BrightMention => ({
        platform: "LinkedIn",
        external_id: `li:${s(
          x.id,
          x.post_id,
          x.activity_id,
          x.url
        )}`,
        author_name:
          s(
            x.user_name,
            x.author_name,
            x.name,
            x.headline
          ) || null,
        author_username:
          s(
            x.user_url,
            x.use_url,
            x.author_url
          ) || null,
        content:
          s(
            x.post_text,
            x.text,
            x.description,
            x.title,
            x.headline
          ) || "[LinkedIn post]",
        post_url: s(x.url) || null,
        published_at: iso(
          x.date_posted,
          x.published_at,
          x.timestamp
        ),
        likes: n(
          x.num_likes,
          x.likes
        ),
        shares: n(
          x.num_reposts,
          x.num_shares,
          x.shares
        ),
        replies: n(
          x.num_comments,
          x.comments
        ),
        views: n(
          x.views,
          x.impressions
        ),
      })
    );

  return {
    externalId: null,
    mentions,
  };
}

export async function collectGoogleMapsReviews(target: string) {
  const url = String(target || "").trim();

  if (!/^https?:\/\//i.test(url)) {
    throw new Error(
      "Google Maps requires a full public place URL"
    );
  }

  const rows = await scrape(
    DATASETS.googleMaps,
    [
      {
        url,
        days_limit: 90,
        sort_by: "Newest",
      },
    ]
  );

  const mentions = rows
    .filter((x: any) => x && !x.error)
    .map((x: any): BrightMention => {
      const rating = n(
        x.rating,
        x.review_rating,
        x.stars
      );

      const text =
        s(
          x.review_text,
          x.text,
          x.review,
          x.comment
        ) ||
        (rating
          ? `${rating}/5 Google Maps rating`
          : "[Google Maps review]");

      return {
        platform: "Google Maps",
        external_id: `gm:${s(
          x.review_id,
          x.id,
          `${x.reviewer_name || "reviewer"}:${
            x.timestamp || x.review_date || ""
          }`
        )}`,
        author_name:
          s(
            x.reviewer_name,
            x.author_name,
            x.name
          ) || null,
        author_username:
          s(
            x.reviewer_url,
            x.author_url
          ) || null,
        content: rating
          ? `[Rating: ${rating}/5] ${text}`
          : text,
        post_url:
          s(
            x.url,
            x.review_url
          ) || url,
        published_at: iso(
          x.review_date,
          x.date,
          x.timestamp,
          x.date_posted
        ),
        likes: n(
          x.review_likes,
          x.likes
        ),
        shares: 0,
        replies: x.owner_answer
          ? 1
          : n(x.replies),
        views: 0,
      };
    });

  return {
    externalId: null,
    mentions,
  };
}
