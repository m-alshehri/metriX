import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";

type XPost = { id:string;text?:string;author_id?:string;created_at?:string;lang?:string;public_metrics?:{like_count?:number;reply_count?:number;repost_count?:number;quote_count?:number;impression_count?:number} };
type XUser = {id:string;name?:string;username?:string};
function query(keyword:string) {
  const clean=keyword.trim().replace(/"/g,'\\"');
  return `${clean.includes(" ") && !clean.startsWith("#") ? `"${clean}"` : clean} -is:retweet`;
}
function extractText(payload:any):string {
  if (typeof payload?.output_text==="string") return payload.output_text;
  for (const o of payload?.output || []) for (const c of o?.content || []) if (typeof c?.text==="string") return c.text;
  return "";
}
async function openAI(input:string, schema:any) {
  const key=process.env.OPENAI_API_KEY;
  if(!key) throw new Error("OPENAI_API_KEY missing");
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({
    model:"gpt-5.6-luna",store:false,input,
    text:{format:{type:"json_schema",name:"result",strict:true,schema}}
  })});
  if(!r.ok) throw new Error(`OpenAI ${r.status}`);
  return JSON.parse(extractText(await r.json()));
}

async function collectYouTube(db:any, projectId:string, userId:string, keywords:any[]) {
  const key=process.env.YOUTUBE_API_KEY;
  if(!key) return 0;
  let imported=0;

  for (const k of keywords || []) {
    const searchParams=new URLSearchParams({
      part:"snippet", type:"video", q:k.keyword, maxResults:"10", order:"date", key
    });
    const sr=await fetch(`https://www.googleapis.com/youtube/v3/search?${searchParams}`,{cache:"no-store"});
    if(!sr.ok) {
      console.error("YouTube search failed", sr.status, await sr.text());
      continue;
    }
    const sj=await sr.json();
    const items=(sj.items||[]).filter((x:any)=>x?.id?.videoId);
    if(!items.length) continue;

    const ids=items.map((x:any)=>x.id.videoId).join(",");
    const videoParams=new URLSearchParams({part:"snippet,statistics",id:ids,key});
    const vr=await fetch(`https://www.googleapis.com/youtube/v3/videos?${videoParams}`,{cache:"no-store"});
    if(!vr.ok) {
      console.error("YouTube video details failed", vr.status, await vr.text());
      continue;
    }
    const vj=await vr.json();

    for (const v of vj.items || []) {
      const s=v.snippet||{}, st=v.statistics||{};
      const content=[s.title,s.description].filter(Boolean).join("\n\n");
      const {error}=await db.from("mentions").insert({
        user_id:userId,project_id:projectId,keyword_id:k.id,platform:"YouTube",
        external_id:v.id,author_name:s.channelTitle||null,author_username:s.channelId||null,
        content:content||null,post_url:`https://www.youtube.com/watch?v=${v.id}`,
        published_at:s.publishedAt||new Date().toISOString(),
        likes:Number(st.likeCount||0),shares:0,replies:Number(st.commentCount||0),
        views:Number(st.viewCount||0),sentiment:null,
        language:s.defaultLanguage||s.defaultAudioLanguage||null
      });
      if(!error){
        imported++;
        await db.from("usage_events").insert({user_id:userId,project_id:projectId,event_type:"mention_imported"});
      }
    }
  }
  return imported;
}

export async function runProjectPipeline(projectId:string,userId:string) {
  const db=createAdminClient();
  const run=(await db.from("pipeline_runs").insert({project_id:projectId,user_id:userId,status:"running"}).select("id").single()).data;
  let imported=0, analyzed=0, alerts=0;
  try {
    const {data:keywords}=await db.from("keywords").select("id,keyword").eq("project_id",projectId);
    const token=process.env.X_BEARER_TOKEN;
    if(token) for(const k of keywords||[]) {
      const p=new URLSearchParams({query:query(k.keyword),max_results:"10","post.fields":"created_at,lang,public_metrics,author_id",expansions:"author_id","user.fields":"name,username"});
      const r=await fetch(`https://api.x.com/2/tweets/search/recent?${p}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
      if(!r.ok) continue;
      const j=await r.json(); const users=new Map<string,XUser>((j.includes?.users||[]).map((u:XUser)=>[u.id,u]));
      for(const post of (j.data||[]) as XPost[]) {
        const u=post.author_id?users.get(post.author_id):undefined, m=post.public_metrics||{}, username=u?.username||null;
        const {error}=await db.from("mentions").insert({user_id:userId,project_id:projectId,keyword_id:k.id,platform:"X",external_id:post.id,author_name:u?.name||null,author_username:username,content:post.text||null,post_url:username?`https://x.com/${username}/status/${post.id}`:`https://x.com/i/web/status/${post.id}`,published_at:post.created_at||new Date().toISOString(),likes:m.like_count||0,shares:(m.repost_count||0)+(m.quote_count||0),replies:m.reply_count||0,views:m.impression_count||0,sentiment:null,language:post.lang||null});
        if(!error){imported++; await db.from("usage_events").insert({user_id:userId,project_id:projectId,event_type:"mention_imported"});}
      }
    }

    imported += await collectYouTube(db,projectId,userId,keywords||[]);

    const {data:pending}=await db.from("mentions").select("id,content").eq("project_id",projectId).is("sentiment",null).not("content","is",null).limit(50);
    if(pending?.length) {
      const result=await openAI(`Classify sentiment as positive, neutral, or negative. Handle Arabic, Saudi/Gulf dialect, English, code-switching and sarcasm. Return one item per id.\n${JSON.stringify(pending)}`,{
        type:"object",additionalProperties:false,required:["items"],properties:{items:{type:"array",items:{type:"object",additionalProperties:false,required:["id","sentiment"],properties:{id:{type:"string"},sentiment:{type:"string",enum:["positive","neutral","negative"]}}}}}
      });
      for(const x of result.items||[]) { const {error}=await db.from("mentions").update({sentiment:x.sentiment}).eq("id",x.id).eq("project_id",projectId); if(!error) analyzed++; }
    }
    const {data:ms}=await db.from("mentions").select("id,keyword_id,content,published_at,likes,shares,replies,views,sentiment,language").eq("project_id",projectId).order("published_at",{ascending:false}).limit(100);
    const rows=ms||[], analyzedRows=rows.filter((m:any)=>["positive","neutral","negative"].includes(m.sentiment)), neg=analyzedRows.filter((m:any)=>m.sentiment==="negative").length;
    const {data:settings}=await db.from("project_settings").select("*").eq("project_id",projectId).maybeSingle();
    const threshold=settings?.negative_threshold||40;
    await db.from("project_alerts").update({is_active:false}).eq("project_id",projectId).eq("is_active",true);
    if(analyzedRows.length>=5 && neg/analyzedRows.length*100>=threshold) {
      const pct=Math.round(neg/analyzedRows.length*100); const severity=pct>=70?"critical":pct>=55?"high":"medium";
      const inserted=(await db.from("project_alerts").insert({user_id:userId,project_id:projectId,alert_type:"negative_sentiment",severity,title:"Elevated negative sentiment",description:`Negative mentions are ${pct}% of analyzed mentions.`,metadata:{percent:pct},is_active:true}).select("id,severity,title,description").single()).data;
      if(inserted){alerts++; if(["high","critical"].includes(inserted.severity) && settings?.email_alerts_enabled && settings?.alert_email) await sendAlert(settings.alert_email,inserted.title,inserted.description,inserted.id);}
    }
    if(rows.length>=3) {
      const insights=await openAI(`You are metriX social intelligence. Using only supplied mentions, return concise evidence-grounded project intelligence. Do not invent causes or facts. Mentions:\n${JSON.stringify(rows.map((m:any)=>({content:(m.content||"").slice(0,1000),sentiment:m.sentiment,engagement:(m.likes||0)+(m.shares||0)+(m.replies||0),language:m.language})))}`,{
        type:"object",additionalProperties:false,required:["executive_summary","top_topics","positive_drivers","negative_drivers","risks","opportunities","recommendations"],properties:{
          executive_summary:{type:"string"},top_topics:{type:"array",items:{type:"string"}},positive_drivers:{type:"array",items:{type:"string"}},negative_drivers:{type:"array",items:{type:"string"}},risks:{type:"array",items:{type:"string"}},opportunities:{type:"array",items:{type:"string"}},recommendations:{type:"array",items:{type:"string"}}
        }
      });
      await db.from("project_insights").insert({user_id:userId,project_id:projectId,...insights,mentions_analyzed:rows.length});
    }
    if(run?.id) await db.from("pipeline_runs").update({status:"success",imported,analyzed,alerts,finished_at:new Date().toISOString(),details:{sources:["X","YouTube"]}}).eq("id",run.id);
    return {imported,analyzed,alerts};
  } catch(e:any) {
    if(run?.id) await db.from("pipeline_runs").update({status:"failed",imported,analyzed,alerts,details:{error:String(e?.message||e)},finished_at:new Date().toISOString()}).eq("id",run.id);
    throw e;
  }
}
async function sendAlert(to:string,title:string,description:string,id:string) {
  const key=process.env.RESEND_API_KEY, from=process.env.ALERT_FROM_EMAIL;
  if(!key||!from) return;
  await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json","Idempotency-Key":`metrix-alert/${id}`},body:JSON.stringify({from,to:[to],subject:`metriX alert: ${title}`,html:`<h2>${title}</h2><p>${description}</p><p>Open metriX to review the project.</p>`})});
}
