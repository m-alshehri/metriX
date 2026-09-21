import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { drainJobs } from "@/lib/worker";
export const maxDuration = 300;
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params,
    db = await createClient(),
    {
      data: { user },
    } = await db.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: project } = await db
    .from("projects")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!project)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { data, error } = await db
    .from("pipeline_jobs")
    .select("status,state,error,next_retry_at")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error)
    return NextResponse.json({ error: "Could not load job" }, { status: 500 });
  return NextResponse.json(
    { job: data },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const result = await GET(request, context);
  if (!result.ok) return result;
  const { id } = await context.params;
  after(() => drainJobs(id));
  return NextResponse.json({ ok: true });
}
