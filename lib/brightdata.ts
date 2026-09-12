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

function facebookUrl(value: string) {
  let v = String(value || "").trim();
  if (!v) throw new Error("Facebook page URL or username is required");

  if (!/^https?:\/\//i.test(v)) {
    v = `https://www.facebook.com/${v.replace(/^@/, "").replace(/^facebook\.com\//i, "")}`;
  }

  try {
    const u = new URL(v);
    const parts = u.pathname.split("/").filter(Boolean);
    if (!parts.length) throw new Error("Invalid Facebook page URL");
    return `https://www.facebook.com/${parts[0]}`;
  } catch {
    throw new Error("Invalid Facebook page URL");
  }
}

function linkedinUrl(value: string) {
  let v = String(value || "").trim();
  if (!v) throw new Error("LinkedIn company/profile URL is required");

  if (!/^https?:\/\//i.test(v)) {
    v = v.replace(/^@/, "").replace(/^linkedin\.com\//i, "");
    if (v.startsWith("company/") || v.startsWith("in/")) {
      v = `https://www.linkedin.com/${v}`;
    } else {
      v = `https://www.linkedin.com/company/${v}`;
    }
  }

  try {
    const u = new URL(v);
    const parts = u.pathname.split("/").filter(Boolean);

    const companyIndex = parts.indexOf("company");
    if (companyIndex >= 0 && parts[companyIndex + 1]) {
      return `https://www.linkedin.com/company/${parts[companyIndex + 1]}`;
    }

    const profileIndex = parts.indexOf("in");
    if (profileIndex >= 0 && parts[profileIndex + 1]) {
      return `https://www.linkedin.com/in/${parts[profileIndex + 1]}`;
    }

    throw new Error("Use a LinkedIn company or profile URL");
  } catch {
    throw new Error("Invalid LinkedIn URL");
  }
}

function normalizeBrightDataError(status: number, text: string, payload?: any) {
  const raw = s(
    payload?.message,
    payload?.error?.message,
    payload?.error,
    payload?.errors?.[0]?.message,
    text
  );

  if (/customer is not active/i.test(raw)) {
    return new Error(
      "Bright Data account is not active. Activate Web Scraper API/billing in Bright Data, then run the pipeline again."
    );
  }

  if (/invalid input/i.test(raw)) {
    return new Error("Bright Data rejected the target URL. Check that it is a canonical public page/profile/place URL.");
  }

  return new Error(raw || `Bright Data ${status}`);
}

async function scrape(
  datasetId: string,
  input: Record<string, any>[],
  extraQuery?: Record<string, string>
) {
  const token = process.env.BRIGHTDATA_API_TOKEN;
  if (!token) throw new Error("BRIGHTDATA_API_TOKEN is missing");

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

  let payload: any = null;
  try {
    payload = JSON.parse(text);
  } catch {
    if (!response.ok) throw normalizeBrightDataError(response.status, text);
    throw new Error(`Bright Data returned non-JSON (${response.status})`);
  }

  if (!response.ok) throw normalizeBrightDataError(response.status, text, payload);

  if (payload?.error) {
    throw normalizeBrightDataError(response.status, text, payload);
  }

  return Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];
}

export async function collectFacebook(target: string) {
  const url = facebookUrl(target);

  const rows = await scrape(
    DATASETS.facebook,
    [{ url }]
  );

  const mentions = rows
    .filter((x: any) => x && !x.error)
    .map((x: any): BrightMention => {
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
  const url = linkedinUrl(target);
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
      discover_by: isProfile ? "profile_url" : "company_url",
    }
  );

  const mentions = rows
    .filter((x: any) => x && !x.error)
    .map((x: any): BrightMention => {
      const id = s(x.id, x.post_id, x.activity_id, x.url);
      return {
        platform: "LinkedIn",
        external_id: `li:${id}`,
        author_name: s(x.user_name, x.author_name, x.name, x.headline) || null,
        author_username: s(x.user_url, x.use_url, x.author_url) || null,
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
    throw new Error("Google Maps requires a full public place URL");
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
      const rating = n(x.rating, x.review_rating, x.stars);
      const id = s(
        x.review_id,
        x.id,
        `${x.reviewer_name || "reviewer"}:${x.timestamp || x.review_date || ""}`
      );

      const text =
        s(x.review_text, x.text, x.review, x.comment) ||
        (rating
          ? `${rating}/5 Google Maps rating`
          : "[Google Maps review]");

      return {
        platform: "Google Maps",
        external_id: `gm:${id}`,
        author_name: s(x.reviewer_name, x.author_name, x.name) || null,
        author_username: s(x.reviewer_url, x.author_url) || null,
        content: rating ? `[Rating: ${rating}/5] ${text}` : text,
        post_url: s(x.url, x.review_url) || url,
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
