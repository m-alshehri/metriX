"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isLocale } from "@/lib/i18n";

type XUser = {
  id: string;
  name?: string;
  username?: string;
};

type XPost = {
  id: string;
  text?: string;
  author_id?: string;
  created_at?: string;
  lang?: string;
  public_metrics?: {
    like_count?: number;
    reply_count?: number;
    repost_count?: number;
    quote_count?: number;
    impression_count?: number;
  };
};

type XResponse = {
  data?: XPost[];
  includes?: {
    users?: XUser[];
  };
  errors?: Array<{
    title?: string;
    detail?: string;
    status?: number;
  }>;
};

function safeLocale(value: FormDataEntryValue | null) {
  const locale = typeof value === "string" ? value : "en";
  return isLocale(locale) ? locale : "en";
}

function buildQuery(keyword: string) {
  const clean = keyword.trim().replace(/"/g, '\\"');

  // Exact phrase for multi-word keywords; hashtags/operators can be used directly.
  const term =
    clean.includes(" ") && !clean.startsWith("#")
      ? `"${clean}"`
      : clean;

  // Exclude reposts for cleaner monitoring and lower API usage.
  return `${term} -is:retweet`;
}

export async function syncFromX(formData: FormData) {
  const locale = safeLocale(formData.get("locale"));
  const projectId = String(formData.get("project_id") ?? "");

  if (!projectId) {
    redirect(`/${locale}/dashboard`);
  }

  const bearerToken = process.env.X_BEARER_TOKEN;
  if (!bearerToken) {
    redirect(`/${locale}/projects/${projectId}?xerror=missing-token`);
  }

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // RLS ensures this only returns a project owned by the signed-in user.
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .single();

  if (!project) {
    redirect(`/${locale}/dashboard`);
  }

  const { data: keywords, error: keywordsError } = await supabase
    .from("keywords")
    .select("id, keyword")
    .eq("project_id", projectId);

  if (keywordsError || !keywords || keywords.length === 0) {
    redirect(`/${locale}/projects/${projectId}?xerror=no-keywords`);
  }

  let imported = 0;
  let duplicates = 0;
  let apiFailures = 0;

  for (const keyword of keywords) {
    const params = new URLSearchParams({
      query: buildQuery(keyword.keyword),
      max_results: "10",
      "post.fields": "created_at,lang,public_metrics,author_id",
      expansions: "author_id",
      "user.fields": "name,username",
    });

    const response = await fetch(
      `https://api.x.com/2/tweets/search/recent?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      apiFailures += 1;

      // Stop early for authentication, access, rate limit, or credit issues.
      if ([401, 402, 403, 429].includes(response.status)) {
        redirect(
          `/${locale}/projects/${projectId}?xerror=x-api-${response.status}`
        );
      }

      continue;
    }

    const payload = (await response.json()) as XResponse;
    const posts = payload.data ?? [];
    const users = payload.includes?.users ?? [];

    const usersById = new Map(users.map((xUser) => [xUser.id, xUser]));

    for (const post of posts) {
      const author = post.author_id
        ? usersById.get(post.author_id)
        : undefined;

      const metrics = post.public_metrics ?? {};
      const shares =
        (metrics.repost_count ?? 0) + (metrics.quote_count ?? 0);

      const username = author?.username ?? null;
      const postUrl = username
        ? `https://x.com/${username}/status/${post.id}`
        : `https://x.com/i/web/status/${post.id}`;

      const { error: insertError } = await supabase.from("mentions").insert({
        user_id: user.id,
        project_id: projectId,
        keyword_id: keyword.id,
        platform: "X",
        external_id: post.id,
        author_name: author?.name ?? null,
        author_username: username,
        content: post.text ?? null,
        post_url: postUrl,
        published_at: post.created_at ?? new Date().toISOString(),
        likes: metrics.like_count ?? 0,
        shares,
        replies: metrics.reply_count ?? 0,
        views: metrics.impression_count ?? 0,
        sentiment: null,
        language: post.lang ?? null,
      });

      if (!insertError) {
        imported += 1;
      } else if (insertError.code === "23505") {
        // Already imported from X during a previous sync.
        duplicates += 1;
      }
    }
  }

  revalidatePath(`/${locale}/projects/${projectId}`);
  revalidatePath(`/${locale}/dashboard`);

  redirect(
    `/${locale}/projects/${projectId}?xsync=done&imported=${imported}&duplicates=${duplicates}&failures=${apiFailures}`
  );
}
