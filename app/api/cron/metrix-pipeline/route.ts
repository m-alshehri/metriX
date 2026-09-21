import { NextRequest, NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { checked } from "@/lib/db-result";
import { drainJobs } from "@/lib/worker";
export const maxDuration = 300;
export async function GET(req: NextRequest) {
  if (
    !process.env.CRON_SECRET ||
    req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const queued = checked(
    await createAdminClient().rpc("metrix_enqueue_due", { p_recovery: false }),
  );
  after(() => drainJobs());
  return NextResponse.json({ queued });
}
