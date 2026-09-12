import "server-only";
import { runProjectPipeline } from "@/lib/pipeline";
import { collectConnectedPlatforms } from "@/lib/oauth-platforms";
import { createAdminClient } from "@/lib/supabase-admin";

function extractText(payload: any): string {
  if (typeof payload?.output_text === "string") return payload.output_text;
  for (const o of payload?.output || []) {
    for (const c of o?.content || []) {
      if (typeof c?.text === "string") return c.text;
    }
  }
  return "";
}

async function analyzePending(projectId: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return 0;
  const db = createAdminClient();
  let analyzed = 0;

  for (let batch = 0; batch < 3; batch++) {
    const { data: pending } = await db
      .from("mentions")
      .select("id,content")
      .eq("project_id", projectId)
      .is("sentiment", null)
      .not("content", "is", null)
      .limit(50);

    if (!pending?.length) break;

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        store: false,
        input:
          "Classify each item as positive, neutral, or negative. Handle Arabic, Saudi/Gulf dialect, English and code-switching. Return exactly one item per id.\n" +
          JSON.stringify(pending),
        text: {
          format: {
            type: "json_schema",
            name: "sentiment",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["items"],
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["id", "sentiment"],
                    properties: {
                      id: { type: "string" },
                      sentiment: {
                        type: "string",
                        enum: ["positive", "neutral", "negative"],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    });

    if (!r.ok) break;
    const result = JSON.parse(extractText(await r.json()) || '{"items":[]}');

    for (const item of result.items || []) {
      const { error } = await db
        .from("mentions")
        .update({ sentiment: item.sentiment })
        .eq("project_id", projectId)
        .eq("id", item.id);
      if (!error) analyzed++;
    }
  }

  return analyzed;
}

export async function runFullProjectPipeline(projectId: string, userId: string) {
  const base = await runProjectPipeline(projectId, userId);
  const extra = await collectConnectedPlatforms(projectId, userId);
  const extraAnalyzed = extra.imported > 0 ? await analyzePending(projectId) : 0;

  const db = createAdminClient();

  // Keep the last successful pipeline row consistent with the six-platform result.
  const { data: last } = await db
    .from("pipeline_runs")
    .select("id,imported,analyzed,details")
    .eq("project_id", projectId)
    .eq("status", "success")
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (last?.id) {
    await db
      .from("pipeline_runs")
      .update({
        imported: Number(last.imported || 0) + extra.imported,
        analyzed: Number(last.analyzed || 0) + extraAnalyzed,
        details: {
          ...(last.details || {}),
          connected_platforms: extra.details,
        },
      })
      .eq("id", last.id);
  }

  return {
    ...base,
    imported: Number(base.imported || 0) + extra.imported,
    analyzed: Number(base.analyzed || 0) + extraAnalyzed,
    details: {
      ...(base.details || {}),
      connected_platforms: extra.details,
    },
  };
}
