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
  raw_data?: any;
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
    v = v.startsWith("company/") || v.startsWith("in/")
      ? `https://www.linkedin.com/${v}`
      : `https://www.linkedin.com/company/${v}`;
  }

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

  throw new Error("Use a canonical LinkedIn company or profile URL");
}

function explain(status: number, raw: string) {
  if (/customer is not active/i.test(raw)) {
    return new Error(
      "Bright Data account is not active. Activate Web Scraper API/billing in Bright Data."
    );
  }

  if (/invalid input/i.test(raw)) {
    return new Error(
      "Bright Data rejected the target URL/input. Check the saved URL and try again."
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

async function getSnapshot(token: string, snapshotId: string) {
  // Poll briefly; metriX persists the snapshot id and resumes it on later retry runs so Vercel has more time to receive Bright Data jobs.
  for (let attempt = 0; attempt < 3; attempt++) {
    const progress = await fetch(
      `${API}/progress/${encodeURIComponent(snapshotId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      }
    );

    const { payload, text } = await parseResponse(progress);

    if (!progress.ok) {
      throw explain(progress.status, text);
    }

    const status = String(payload?.status || "").toLowerCase();

    if (status === "ready") {
      const result = await fetch(
        `${API}/snapshot/${encodeURIComponent(snapshotId)}?format=json`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const parsed = await parseResponse(result);

      if (!result.ok) {
        throw explain(result.status, parsed.text);
      }

      if (Array.isArray(parsed.payload)) return parsed.payload;
      if (Array.isArray(parsed.payload?.data)) return parsed.payload.data;

      return [];
    }

    if (status === "failed") {
      throw new Error(`Bright Data snapshot ${snapshotId} failed`);
    }

    await sleep(2000);
  }

  throw new Error(
    `Bright Data is still processing snapshot ${snapshotId}. Run Full Pipeline again shortly.`
  );
}

async function scrape(
  datasetId: string,
  input: Record<string, any>[]
) {
  const token = process.env.BRIGHTDATA_API_TOKEN;
  if (!token) throw new Error("BRIGHTDATA_API_TOKEN is missing");

  const url = new URL(`${API}/scrape`);
  url.searchParams.set("dataset_id", datasetId);
  url.searchParams.set("include_errors", "true");

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input }),
    cache: "no-store",
  });

  const { payload, text } = await parseResponse(response);

  if (!response.ok) {
    throw explain(response.status, text);
  }

  if (Array.isArray(payload)) return payload;

  const snapshotId = s(
    payload?.snapshot_id,
    payload?.id,
    payload?.snapshot?.id
  );

  if (snapshotId) {
    return await getSnapshot(token, snapshotId);
  }

  if (payload?.error) {
    throw explain(response.status, s(payload.error, payload.message));
  }

  if (Array.isArray(payload?.data)) return payload.data;

  return [];
}

export async function collectFacebook(target: string) {
  const url = canonicalFacebook(target);

  // Bright Data's Facebook Page Posts dataset expects only the page URL.
  const rows = await scrape(
    DATASETS.facebook,
    [{ url }]
  );

  const mentions: BrightMention[] = rows
    .filter((x: any) => x && !x.error)
    .map((x: any) => {
      const id = s(
        x.post_id,
        x.shortcode,
        x.id,
        x.url
      );

      return {
        platform: "Facebook",
        external_id: `fb:${id}`,
        author_name:
          s(
            x.page_name,
            x.user_name,
            x.user_username_raw,
            x.profile_handle
          ) || null,
        author_username:
          s(
            x.profile_handle,
            x.user_username_raw
          ) || null,
        content:
          s(
            x.content,
            x.text,
            x.description
          ) || "[Facebook post]",
        post_url: s(x.url) || null,
        published_at: iso(
          x.date_posted,
          x.created_at,
          x.timestamp
        ),
        likes: n(
          x.likes,
          x.num_likes_type?.num,
          x.reactions
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
        raw_data: x,
      };
    })
    .filter((x: BrightMention) => x.external_id !== "fb:");

  return {
    externalId: null,
    mentions,
  };
}

export async function collectLinkedIn(target: string) {
  const url = canonicalLinkedIn(target);

  // IMPORTANT:
  // Bright Data's current Discover Posts by Company/Profile URL API expects
  // an input object with URL (+ optional dates). Do not send
  // only_authored_posts/type/discover_by; those caused "Invalid input".
  const rows = await scrape(
    DATASETS.linkedin,
    [{ url }]
  );

  const mentions: BrightMention[] = rows
    .filter((x: any) => x && !x.error)
    .map((x: any) => {
      const id = s(
        x.id,
        x.post_id,
        x.activity_id,
        x.url
      );

      return {
        platform: "LinkedIn",
        external_id: `li:${id}`,
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
        raw_data: x,
      };
    })
    .filter((x: BrightMention) => x.external_id !== "li:");

  return {
    externalId: null,
    mentions,
  };
}

export async function collectGoogleMapsReviews(target: string) {
  const url = String(target || "").trim();

  if (!/^https?:\/\//i.test(url)) {
    throw new Error(
      "Google Maps requires a full public Google Maps place URL"
    );
  }

  // Keep the request body minimal so Bright Data validates it reliably.
  const rows = await scrape(
    DATASETS.googleMaps,
    [{ url }]
  );

  const mentions: BrightMention[] = rows
    .filter((x: any) => x && !x.error)
    .map((x: any) => {
      const rating = n(
        x.rating,
        x.review_rating,
        x.stars
      );

      const id = s(
        x.review_id,
        x.id,
        x.review_url,
        `${x.reviewer_name || "reviewer"}:${x.timestamp || x.review_date || ""}`
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
        external_id: `gm:${id}`,
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
            x.review_url,
            x.url
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
        replies:
          x.owner_answer
            ? 1
            : n(x.replies),
        views: 0,
        raw_data: x,
      };
    })
    .filter((x: BrightMention) => x.external_id !== "gm:");

  return {
    externalId: null,
    mentions,
  };
}

// Resume a previously-created Bright Data snapshot instead of starting a new job.
// This is used by metriX provider_jobs persistence.
export async function resumeBrightDataSnapshot(snapshotId: string, platform: string, target: string) {
  const token = process.env.BRIGHTDATA_API_TOKEN;
  if (!token) throw new Error("BRIGHTDATA_API_TOKEN is missing");
  const rows = await getSnapshot(token, snapshotId);
  const p = String(platform || "").toLowerCase();

  if (p === "facebook") {
    const mentions: BrightMention[] = rows.filter((x:any)=>x && !x.error).map((x:any) => {
      const id=s(x.post_id,x.shortcode,x.id,x.url); return {
        platform:"Facebook", external_id:`fb:${id}`,
        author_name:s(x.page_name,x.user_name,x.user_username_raw,x.profile_handle)||null,
        author_username:s(x.profile_handle,x.user_username_raw)||null,
        content:s(x.content,x.text,x.description)||"[Facebook post]", post_url:s(x.url)||null,
        published_at:iso(x.date_posted,x.created_at,x.timestamp),
        likes:n(x.likes,x.num_likes_type?.num,x.reactions), shares:n(x.num_shares,x.shares),
        replies:n(x.num_comments,x.comments), views:n(x.video_view_count,x.play_count,x.views), raw_data:x
      };
    }).filter((x:BrightMention)=>x.external_id!=="fb:");
    return { externalId:null, mentions };
  }

  if (p === "linkedin") {
    const mentions: BrightMention[] = rows.filter((x:any)=>x && !x.error).map((x:any) => {
      const id=s(x.id,x.post_id,x.activity_id,x.url); return {
        platform:"LinkedIn", external_id:`li:${id}`,
        author_name:s(x.user_name,x.author_name,x.name,x.headline)||null,
        author_username:s(x.user_url,x.use_url,x.author_url)||null,
        content:s(x.post_text,x.text,x.description,x.title,x.headline)||"[LinkedIn post]", post_url:s(x.url)||null,
        published_at:iso(x.date_posted,x.published_at,x.timestamp), likes:n(x.num_likes,x.likes),
        shares:n(x.num_reposts,x.num_shares,x.shares), replies:n(x.num_comments,x.comments),
        views:n(x.views,x.impressions), raw_data:x
      };
    }).filter((x:BrightMention)=>x.external_id!=="li:");
    return { externalId:null, mentions };
  }

  if (p === "google_maps") {
    const url=String(target||"").trim();
    const mentions: BrightMention[] = rows.filter((x:any)=>x && !x.error).map((x:any) => {
      const rating=n(x.rating,x.review_rating,x.stars);
      const id=s(x.review_id,x.id,x.review_url,`${x.reviewer_name||"reviewer"}:${x.timestamp||x.review_date||""}`);
      const text=s(x.review_text,x.text,x.review,x.comment)||(rating?`${rating}/5 Google Maps rating`:"[Google Maps review]");
      return { platform:"Google Maps", external_id:`gm:${id}`, author_name:s(x.reviewer_name,x.author_name,x.name)||null,
        author_username:s(x.reviewer_url,x.author_url)||null, content:rating?`[Rating: ${rating}/5] ${text}`:text,
        post_url:s(x.review_url,x.url)||url, published_at:iso(x.review_date,x.date,x.timestamp,x.date_posted),
        likes:n(x.review_likes,x.likes), shares:0, replies:x.owner_answer?1:n(x.replies), views:0, raw_data:x };
    }).filter((x:BrightMention)=>x.external_id!=="gm:");
    return { externalId:null, mentions };
  }

  throw new Error(`Unsupported Bright Data resume platform: ${platform}`);
}
