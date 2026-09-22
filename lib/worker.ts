import "server-only";
import { workOne } from "@/lib/jobs";
/** Stop claiming before the function deadline. In-flight stages get a six-minute lease. */
export async function drainJobs(projectId?: string, budgetMs = 200_000) {
  const start = Date.now();
  let processed = 0;
  while (Date.now() - start < budgetMs) {
    const result = await workOne(projectId);
    if (!result.processed) break;
    processed++;
    if ("failed" in result && result.failed) break;
  }
  return { processed };
}
