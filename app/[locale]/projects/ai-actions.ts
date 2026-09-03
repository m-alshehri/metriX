"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isLocale } from "@/lib/i18n";

type SentimentLabel = "positive" | "neutral" | "negative";

type AnalysisItem = {
  id: string;
  sentiment: SentimentLabel;
};

type AnalysisResponse = {
  results: AnalysisItem[];
};

function safeLocale(value: FormDataEntryValue | null) {
  const locale = typeof value === "string" ? value : "en";
  return isLocale(locale) ? locale : "en";
}

export async function analyzeSentiment(formData: FormData) {
  const locale = safeLocale(formData.get("locale"));
  const projectId = String(formData.get("project_id") ?? "");

  if (!projectId) {
    redirect(`/${locale}/dashboard`);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    redirect(`/${locale}/projects/${projectId}?aierror=missing-key`);
  }

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // RLS ensures ownership.
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .single();

  if (!project) {
    redirect(`/${locale}/dashboard`);
  }

  const { data: pendingMentions, error: pendingError } = await supabase
    .from("mentions")
    .select("id, content, language")
    .eq("project_id", projectId)
    .is("sentiment", null)
    .not("content", "is", null)
    .limit(50);

  if (pendingError) {
    redirect(`/${locale}/projects/${projectId}?aierror=database`);
  }

  if (!pendingMentions || pendingMentions.length === 0) {
    redirect(`/${locale}/projects/${projectId}?aimessage=nothing-pending`);
  }

  const items = pendingMentions
    .map((m) => ({
      id: m.id,
      text: String(m.content ?? "").slice(0, 2000),
      language: m.language ?? "unknown",
    }))
    .filter((m) => m.text.trim().length > 0);

  if (items.length === 0) {
    redirect(`/${locale}/projects/${projectId}?aimessage=nothing-pending`);
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
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
              text:
                "You are a sentiment classification engine for social media monitoring. " +
                "Classify the sentiment expressed toward the subject being discussed, not merely the emotional tone of individual words. " +
                "Handle Arabic, Saudi/Gulf dialects, English, code-switching, sarcasm when reasonably clear, and informal social-media language. " +
                "Use only positive, neutral, or negative. " +
                "Return exactly one classification for every supplied id.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Classify these social media mentions:\n\n" +
                JSON.stringify(items),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "sentiment_batch",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              results: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    id: { type: "string" },
                    sentiment: {
                      type: "string",
                      enum: ["positive", "neutral", "negative"],
                    },
                  },
                  required: ["id", "sentiment"],
                },
              },
            },
            required: ["results"],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 401) {
      redirect(`/${locale}/projects/${projectId}?aierror=openai-401`);
    }
    if (status === 429) {
      redirect(`/${locale}/projects/${projectId}?aierror=openai-429`);
    }
    redirect(`/${locale}/projects/${projectId}?aierror=openai`);
  }

  const payload = await response.json();

  const outputText =
    payload.output_text ??
    payload.output
      ?.flatMap((item: any) => item.content ?? [])
      ?.find((item: any) => item.type === "output_text")
      ?.text;

  if (!outputText) {
    redirect(`/${locale}/projects/${projectId}?aierror=parse`);
  }

  let parsed: AnalysisResponse;

  try {
    parsed = JSON.parse(outputText) as AnalysisResponse;
  } catch {
    redirect(`/${locale}/projects/${projectId}?aierror=parse`);
  }

  const validIds = new Set(items.map((item) => item.id));
  const validResults = (parsed.results ?? []).filter(
    (result) =>
      validIds.has(result.id) &&
      ["positive", "neutral", "negative"].includes(result.sentiment)
  );

  let updated = 0;

  for (const result of validResults) {
    const { error } = await supabase
      .from("mentions")
      .update({ sentiment: result.sentiment })
      .eq("id", result.id)
      .eq("project_id", projectId)
      .is("sentiment", null);

    if (!error) {
      updated += 1;
    }
  }

  revalidatePath(`/${locale}/projects/${projectId}`);
  revalidatePath(`/${locale}/dashboard`);

  redirect(
    `/${locale}/projects/${projectId}?aimessage=completed&analyzed=${updated}`
  );
}
