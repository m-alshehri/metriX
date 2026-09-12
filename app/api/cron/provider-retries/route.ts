import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { runProjectPipeline } from "@/lib/pipeline";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createAdminClient();
  const { data: jobs } = await db.from("provider_jobs").select("project_id,user_id").eq("status","processing").lte("next_retry_at",new Date().toISOString()).limit(20);
  const unique = Array.from(new Map((jobs||[]).map((x:any)=>[x.project_id,x])).values()) as any[];
  const results:any[]=[];
  for(const x of unique){
    try{ results.push({project_id:x.project_id,ok:true,...await runProjectPipeline(x.project_id,x.user_id)}); }
    catch(e:any){ results.push({project_id:x.project_id,ok:false,error:String(e?.message||e)}); }
  }
  return NextResponse.json({ok:true,retried:results.length,projects:results});
}
