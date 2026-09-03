import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { runProjectPipeline } from "@/lib/pipeline";

export const maxDuration = 60;
export async function GET(req: NextRequest) {
  const secret=process.env.CRON_SECRET;
  if(!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({error:"Unauthorized"},{status:401});
  const db=createAdminClient();
  const {data:projects,error}=await db.from("projects").select("id,user_id");
  if(error) return NextResponse.json({error:error.message},{status:500});
  const results=[];
  for(const p of projects||[]) {
    const {data:s}=await db.from("project_settings").select("automation_enabled").eq("project_id",p.id).maybeSingle();
    if(s && !s.automation_enabled) continue;
    try { results.push({project_id:p.id,ok:true,...await runProjectPipeline(p.id,p.user_id)}); }
    catch(e:any){results.push({project_id:p.id,ok:false,error:String(e?.message||e)});}
  }
  return NextResponse.json({ok:true,projects:results});
}
