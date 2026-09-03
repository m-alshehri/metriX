"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type InsightPayload = {
  executive_summary: string;
  top_topics: string[];
  positive_drivers: string[];
  negative_drivers: string[];
  risks: string[];
  opportunities: string[];
  recommendations: string[];
};

function safeLocale(value: FormDataEntryValue | null) {
  return value === "ar" ? "ar" : "en";
}

function safeProjectId(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

function extractOutputText(payload: any): string | null {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text;
  }

  const content = Array.isArray(payload?.output)
    ? payload.output.flatMap((item: any) =>
        Array.isArray(item?.content) ? item.content : []
      )
    : [];

  const outputItem = content.find(
    (item: any) =>
      item?.type === "output_text" && typeof item?.text === "string"
  );

  return outputItem?.text ?? null;
}

export async function generateProjectInsights(formData: FormData) {
  const locale = safeLocale(formData.get("locale"));
  const projectId = safeProjectId(formData.get("project_id"));

  if (!projectId) {
    redirect(`/${locale}/dashboard`);
  }

  if (!process.env.OPENAI_API_KEY) {
    redirect(`/${locale}/projects/${projectId}?insighterror=missing-openai-key`);
  }

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id,name,description")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (projectError || !project) {
    redirect(`/${locale}/dashboard`);
  }

  const { data: keywords } = await supabase
    .from("keywords")
    .select("id,keyword")
    .eq("project_id", projectId)
    .eq("user_id", user.id);

  const { data: mentions, error: mentionsError } = await supabase
    .from("mentions")
    .select(
      "id,keyword_id,platform,author_name,author_username,content,published_at,likes,shares,replies,views,sentiment,language"
    )
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .order("published_at", { ascending: false })
    .limit(100);

  if (mentionsError) {
    redirect(`/${locale}/projects/${projectId}?insighterror=database`);
  }

  const usableMentions = (mentions ?? []).filter(
    (mention) => typeof mention.content === "string" && mention.content.trim()
  );

  if (usableMentions.length === 0) {
    redirect(`/${locale}/projects/${projectId}?insighterror=no-mentions`);
  }

  const keywordMap = new Map(
    (keywords ?? []).map((keyword) => [keyword.id, keyword.keyword])
  );

  const compactMentions = usableMentions.map((mention) => ({
    id: mention.id,
    keyword: mention.keyword_id
      ? keywordMap.get(mention.keyword_id) ?? null
      : null,
    platform: mention.platform,
    author: mention.author_username || mention.author_name || null,
    content: mention.content.slice(0, 1200),
    published_at: mention.published_at,
    engagement:
      (mention.likes || 0) +
      (mention.shares || 0) +
      (mention.replies || 0),
    views: Number(mention.views || 0),
    sentiment: mention.sentiment,
    language: mention.language,
  }));

  const languageInstruction =
    locale === "ar"
      ? "Write all insight text in clear professional Arabic suitable for a Saudi business dashboard."
      : "Write all insight text in concise professional English suitable for an executive business dashboard.";

  const prompt = `
You are the AI insights engine for metriX, a social listening and analytics platform.

Analyze the supplied social-media mentions for the project "${project.name}".

${languageInstruction}

Important rules:
- Base every conclusion only on the supplied mentions.
- Do not invent facts, events, causes, organizations, or people.
- Treat sentiment labels as supporting signals, not unquestionable truth.
- When evidence is weak or ambiguous, say so.
- Distinguish between what users are discussing and what they feel about the monitored project/topic.
- Identify repeated themes rather than isolated one-off comments.
- Consider engagement when deciding what is important.
- Handle Arabic, Saudi/Gulf dialect, English, and code-switching.
- Keep each list item brief and decision-useful.
- Provide between 2 and 5 items for each list when evidence allows.
- If there is insufficient evidence for a category, return an empty array.
`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5.6-luna",
      store: false,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: prompt,
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify(
                {
                  project: {
                    name: project.name,
                    description: project.description,
                  },
                  keywords: keywords ?? [],
                  mentions: compactMentions,
                },
                null,
                2
              ),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "project_ai_insights",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              executive_summary: {
                type: "string",
              },
              top_topics: {
                type: "array",
                items: { type: "string" },
              },
              positive_drivers: {
                type: "array",
                items: { type: "string" },
              },
              negative_drivers: {
                type: "array",
                items: { type: "string" },
              },
              risks: {
                type: "array",
                items: { type: "string" },
              },
              opportunities: {
                type: "array",
                items: { type: "string" },
              },
              recommendations: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: [
              "executive_summary",
              "top_topics",
              "positive_drivers",
              "negative_drivers",
              "risks",
              "opportunities",
              "recommendations",
            ],
          },
        },
      },
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const code =
      typeof payload?.error?.code === "string" ? payload.error.code : "";

    if (response.status === 401) {
      redirect(`/${locale}/projects/${projectId}?insighterror=openai-401`);
    }

    if (response.status === 429) {
      if (code) {
        redirect(
          `/${locale}/projects/${projectId}?insighterror=openai-429&code=${encodeURIComponent(
            code
          )}`
        );
      }

      redirect(`/${locale}/projects/${projectId}?insighterror=openai-429`);
    }

    redirect(`/${locale}/projects/${projectId}?insighterror=openai-api`);
  }

  const outputText = extractOutputText(payload);

  if (!outputText) {
    redirect(`/${locale}/projects/${projectId}?insighterror=parse`);
  }

  let parsed: InsightPayload;

  try {
    parsed = JSON.parse(outputText) as InsightPayload;
  } catch {
    redirect(`/${locale}/projects/${projectId}?insighterror=parse`);
  }

  const { error: insertError } = await supabase
    .from("project_insights")
    .insert({
      user_id: user.id,
      project_id: projectId,
      executive_summary: parsed.executive_summary,
      top_topics: parsed.top_topics,
      positive_drivers: parsed.positive_drivers,
      negative_drivers: parsed.negative_drivers,
      risks: parsed.risks,
      opportunities: parsed.opportunities,
      recommendations: parsed.recommendations,
      mentions_analyzed: usableMentions.length,
    });

  if (insertError) {
    redirect(`/${locale}/projects/${projectId}?insighterror=database`);
  }

  revalidatePath(`/${locale}/projects/${projectId}`);
  redirect(`/${locale}/projects/${projectId}?insights=generated`);
}
