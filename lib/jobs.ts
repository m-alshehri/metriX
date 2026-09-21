import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";
import { checked } from "@/lib/db-result";

export type JobMode = "full" | "recover" | "enrich" | "insights";
export async function enqueueProject(
  projectId: string,
  userId: string,
  mode: JobMode,
  locale = "en",
) {
  const db = createAdminClient();
  return checked(
    await db.rpc("metrix_enqueue", {
      p_project: projectId,
      p_user: userId,
      p_mode: mode,
      p_locale: locale,
    }),
  );
}

/** Database leases and SKIP LOCKED serialize work across cron and user requests. */
export async function workOne(projectId?: string) {
  const db = createAdminClient();
  const jobs = checked(
    await db.rpc("metrix_claim_job", { p_project: projectId ?? null }),
  );
  const job = jobs?.[0];
  if (!job) return { processed: false };
  const { executeStage } = await import("@/lib/pipeline");
  try {
    const result = await executeStage(job);
    checked(
      await db.rpc("metrix_finish_job", {
        p_id: job.id,
        p_lease: job.lease_token,
        p_state: result.state,
        p_done: result.done,
        p_error: null,
      }),
    );
    return { processed: true, done: result.done };
  } catch (error) {
    console.error("Pipeline stage failed", {
      job: job.id,
      stage: job.state?.stage,
      error,
    });
    checked(
      await db
        .from("pipeline_runs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          details: {
            stage: job.state?.stage,
            error:
              "Stage failed; retry scheduled until attempts are exhausted.",
          },
        })
        .eq("id", job.id),
    );
    checked(
      await db.rpc("metrix_finish_job", {
        p_id: job.id,
        p_lease: job.lease_token,
        p_state: job.state,
        p_done: false,
        p_error: "Stage failed. Review server logs and retry.",
      }),
    );
    return { processed: true, failed: true };
  }
}
