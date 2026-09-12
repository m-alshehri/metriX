import "server-only";
import { createAdminClient } from "@/lib/supabase-admin";
import { collectFromEnsembleData, type SocialAccount } from "@/lib/ensembledata";
import { collectFacebook, collectLinkedIn, collectGoogleMapsReviews, resumeBrightDataSnapshot } from "@/lib/brightdata";
import { authorSignals, contentHash, detectLanguageHeuristic, extractTextMetadata, inferMedia, recoverContent } from "@/lib/mention-utils";

function outputText(payload: any) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  for (const o of payload?.output || []) for (const c of o?.content || []) if (typeof c?.text === "string") return c.text;
  return "";
}
const now = () => new Date().toISOString();
const num = (v:any) => Number(v || 0) || 0;
const providerFor = (p:string) => ["facebook","linkedin","google_maps"].includes(p) ? "Bright Data" : "EnsembleData";

async function usage(db:any, projectId:string, userId:string, eventType:string, quantity=1, provider?:string, metadata:any={}) {
  await db.from("metrix_usage_events").insert({ project_id:projectId, user_id:userId, event_type:eventType, quantity, provider:provider||null, metadata });
}

async function syncEvent(db:any, payload:any) { await db.from("sync_events").insert(payload); }

async function markAccount(db:any, account:any, status:string, error?:string|null, externalId?:string|null, imported=0) {
  const success=status==="success";
  const patch:any={ last_synced_at:now(), last_sync_status:status, last_sync_error:error||null, updated_at:now(), provider:providerFor(String(account.platform||"").toLowerCase()) };
  if(externalId) patch.external_id=externalId;
  if(success){ patch.last_successful_sync=now(); patch.consecutive_failures=0; patch.next_retry_at=null; patch.records_imported=num(account.records_imported)+imported; }
  else { const failures=num(account.consecutive_failures)+1; patch.consecutive_failures=failures; patch.next_retry_at=new Date(Date.now()+Math.min(6*60, Math.pow(2,Math.min(failures,5))*10)*60_000).toISOString(); }
  await db.from("social_accounts").update(patch).eq("id",account.id);
}

function pendingSnapshotId(message:string) {
  const m=String(message).match(/snapshot\s+([^\s.]+).*processing/i); return m?.[1]||null;
}

async function collectAccount(db:any, account:any) {
  const p=String(account.platform||"").toLowerCase();
  if(["facebook","linkedin","google_maps"].includes(p)){
    const {data:job}=await db.from("provider_jobs").select("*").eq("social_account_id",account.id).eq("status","processing").order("created_at",{ascending:false}).limit(1).maybeSingle();
    if(job?.external_job_id){
      try{
        const result=await resumeBrightDataSnapshot(job.external_job_id,p,account.handle);
        await db.from("provider_jobs").update({status:"completed",completed_at:now(),updated_at:now(),attempts:num(job.attempts)+1,last_error:null}).eq("id",job.id);
        return result;
      }catch(e:any){
        const msg=String(e?.message||e);
        await db.from("provider_jobs").update({attempts:num(job.attempts)+1,last_error:msg,next_retry_at:new Date(Date.now()+30*60_000).toISOString(),updated_at:now()}).eq("id",job.id);
        throw e;
      }
    }
  }
  if(p==="facebook") return collectFacebook(account.handle);
  if(p==="linkedin") return collectLinkedIn(account.handle);
  if(p==="google_maps") return collectGoogleMapsReviews(account.handle);
  return collectFromEnsembleData(account as SocialAccount);
}

async function persistProviderJob(db:any, projectId:string,userId:string,account:any,message:string){
  const snapshotId=pendingSnapshotId(message); if(!snapshotId) return;
  await db.from("provider_jobs").upsert({ project_id:projectId,user_id:userId,social_account_id:account.id,provider:"Bright Data",platform:account.platform,external_job_id:snapshotId,status:"processing",next_retry_at:new Date(Date.now()+10*60_000).toISOString(),last_error:message,updated_at:now() },{onConflict:"provider,external_job_id"});
}

async function upsertMention(db:any, projectId:string,userId:string,account:any,m:any){
  const raw=m.raw_data||null;
  const content=recoverContent(raw, String(m.content||"")).trim();
  const meta=extractTextMetadata(content);
  const media=inferMedia(raw||{});
  const hash=contentHash(m.platform,content,m.author_username);
  const lang=detectLanguageHeuristic(content);
  const quality=/^\[(Instagram|Threads|TikTok|YouTube|Facebook|LinkedIn|Reddit).*\]$/i.test(content) ? "placeholder" : content.length<2 ? "incomplete" : "ok";
  const engagement=num(m.likes)+num(m.shares)+num(m.replies);
  const ageHours=Math.max(1,(Date.now()-new Date(m.published_at||Date.now()).getTime())/3600000);
  const virality=Math.round((engagement/Math.sqrt(ageHours))*100)/100;
  const payload:any={ user_id:userId,project_id:projectId,social_account_id:account.id,keyword_id:null,platform:m.platform,external_id:m.external_id,author_name:m.author_name,author_username:m.author_username,content,post_url:m.post_url,published_at:m.published_at,likes:num(m.likes),shares:num(m.shares),replies:num(m.replies),views:num(m.views),raw_data:raw,media_type:m.media_type||media.mediaType,media_url:m.media_url||media.mediaUrl,thumbnail_url:m.thumbnail_url||media.thumbnailUrl,media_count:media.mediaCount,media_duration_seconds:media.duration,location:authorSignals(raw||{}).location,hashtags:meta.hashtags,mentioned_users:meta.mentionedUsers,outbound_urls:meta.outboundUrls,outbound_domains:meta.outboundDomains,content_hash:hash,detected_language:lang,last_seen_at:now(),updated_at:now(),virality_score:virality,quality_status:quality };
  const {data:existing}=await db.from("mentions").select("id,sentiment,first_seen_at").eq("project_id",projectId).eq("external_id",m.external_id).maybeSingle();
  let id:string; let inserted=0,updated=0;
  if(existing?.id){ id=existing.id; const {error}=await db.from("mentions").update(payload).eq("id",id); if(error) throw error; updated=1; }
  else {
    const {data,error}=await db.from("mentions").insert({...payload, sentiment:null, language:lang, first_seen_at:now()}).select("id").single();
    if(error){ if(String(error.code)==="23505") return {inserted:0,updated:0}; throw error; }
    id=data.id; inserted=1;
  }
  await db.from("mention_metrics_history").insert({mention_id:id,project_id:projectId,user_id:userId,likes:num(m.likes),shares:num(m.shares),replies:num(m.replies),views:num(m.views),captured_at:now()});
  const sig=authorSignals(raw||{});
  if(m.author_username && (sig.followers!==null || sig.following!==null || sig.verified!==null)){
    const influence=(num(sig.followers)*0.6)+(engagement*0.4);
    await db.from("author_snapshots").insert({project_id:projectId,user_id:userId,social_account_id:account.id,platform:m.platform,author_username:m.author_username,author_name:m.author_name,followers:sig.followers,following:sig.following,verified:sig.verified,biography:sig.biography,account_category:sig.category,location:sig.location,influence_score:influence,raw_data:raw,captured_at:now()});
  }
  return {inserted,updated,id};
}

async function analyzeEnrichment(db:any,projectId:string,userId:string){
  const key=process.env.OPENAI_API_KEY; if(!key) return 0;
  let analyzed=0;
  for(let batch=0;batch<5;batch++){
    const {data:rows}=await db.from("mentions").select("id,content,detected_language").eq("project_id",projectId).is("sentiment",null).not("content","is",null).neq("quality_status","incomplete").limit(50);
    if(!rows?.length) break;
    const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-5.6-luna",store:false,input:"Analyze each social-media item. Handle Arabic, Saudi/Gulf dialect, English, code-switching, emoji and sarcasm. Return sentiment, confidence 0-1, language (ar/en/mixed/other), dominant emotion, emotion confidence, and up to 3 concise topical labels. Return exactly one result per id.\n"+JSON.stringify(rows),text:{format:{type:"json_schema",name:"metrix_enrichment",strict:true,schema:{type:"object",additionalProperties:false,required:["items"],properties:{items:{type:"array",items:{type:"object",additionalProperties:false,required:["id","sentiment","confidence","language","emotion","emotion_confidence","topics"],properties:{id:{type:"string"},sentiment:{type:"string",enum:["positive","neutral","negative"]},confidence:{type:"number"},language:{type:"string",enum:["ar","en","mixed","other"]},emotion:{type:"string",enum:["joy","anger","sadness","fear","surprise","disgust","neutral"]},emotion_confidence:{type:"number"},topics:{type:"array",items:{type:"string"}}}}}}}}}}) });
    if(!r.ok){console.error("AI enrichment",await r.text());break;}
    let parsed:any={items:[]}; try{parsed=JSON.parse(outputText(await r.json())||'{"items":[]}')}catch{}
    for(const x of parsed.items||[]){
      const {error}=await db.from("mentions").update({sentiment:x.sentiment,sentiment_confidence:Math.max(0,Math.min(1,num(x.confidence))),emotion:x.emotion,emotion_confidence:Math.max(0,Math.min(1,num(x.emotion_confidence))),language:x.language,detected_language:x.language,updated_at:now()}).eq("project_id",projectId).eq("id",x.id);
      if(!error){ analyzed++; for(const topic of (x.topics||[]).slice(0,3)){ const clean=String(topic).trim().slice(0,80); if(clean) await db.from("mention_topics").upsert({mention_id:x.id,project_id:projectId,user_id:userId,topic:clean,score:1,last_seen_at:now()},{onConflict:"mention_id,topic"}); }}
    }
  }
  if(analyzed) await usage(db,projectId,userId,"ai_enrichment",analyzed,"OpenAI");
  return analyzed;
}

async function refreshInsights(db:any,projectId:string,userId:string){
  const key=process.env.OPENAI_API_KEY;if(!key)return;
  const {data:mentions}=await db.from("mentions").select("platform,content,sentiment,emotion,likes,shares,replies,views,published_at").eq("project_id",projectId).order("published_at",{ascending:false}).limit(150);
  if(!mentions?.length)return;
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-5.6-luna",store:false,input:"You are metriX social intelligence. Produce evidence-based executive summary, top topics, positive drivers, negative drivers, risks, opportunities and recommendations. Never invent missing facts.\n"+JSON.stringify(mentions),text:{format:{type:"json_schema",name:"project_insights",strict:true,schema:{type:"object",additionalProperties:false,required:["executive_summary","top_topics","positive_drivers","negative_drivers","risks","opportunities","recommendations"],properties:{executive_summary:{type:"string"},top_topics:{type:"array",items:{type:"string"}},positive_drivers:{type:"array",items:{type:"string"}},negative_drivers:{type:"array",items:{type:"string"}},risks:{type:"array",items:{type:"string"}},opportunities:{type:"array",items:{type:"string"}},recommendations:{type:"array",items:{type:"string"}}}}}}})});
  if(!r.ok)return; let parsed:any;try{parsed=JSON.parse(outputText(await r.json())||"{}")}catch{return}
  const payload={...parsed,mentions_analyzed:mentions.length,generated_at:now()};
  const {data:existing}=await db.from("project_insights").select("id").eq("project_id",projectId).maybeSingle();
  if(existing?.id) await db.from("project_insights").update({insights:payload,updated_at:now()}).eq("id",existing.id); else await db.from("project_insights").insert({project_id:projectId,user_id:userId,insights:payload,created_at:now(),updated_at:now()});
  await usage(db,projectId,userId,"ai_project_insight",1,"OpenAI");
}

async function recordDailyMetrics(db:any,projectId:string,userId:string){
  const start=new Date();start.setUTCHours(0,0,0,0); const date=start.toISOString().slice(0,10);
  const {data:rows}=await db.from("mentions").select("sentiment,likes,shares,replies,views").eq("project_id",projectId).gte("published_at",start.toISOString());
  const a=rows||[]; const payload={project_id:projectId,user_id:userId,metric_date:date,mentions:a.length,engagement:a.reduce((s:any,m:any)=>s+num(m.likes)+num(m.shares)+num(m.replies),0),views:a.reduce((s:any,m:any)=>s+num(m.views),0),positive:a.filter((m:any)=>m.sentiment==="positive").length,neutral:a.filter((m:any)=>m.sentiment==="neutral").length,negative:a.filter((m:any)=>m.sentiment==="negative").length};
  await db.from("project_daily_metrics").upsert(payload,{onConflict:"project_id,metric_date"}); return payload;
}

async function createAlerts(db:any,projectId:string,userId:string){
  const {data:settings}=await db.from("project_settings").select("negative_threshold,anomaly_alerts_enabled").eq("project_id",projectId).maybeSingle();
  const threshold=num(settings?.negative_threshold)||30;
  const {data:recent}=await db.from("mentions").select("id,platform,content,sentiment,likes,shares,replies,views,published_at,virality_score").eq("project_id",projectId).gte("published_at",new Date(Date.now()-24*3600000).toISOString()).order("published_at",{ascending:false}).limit(500);
  const r=recent||[]; const analyzed=r.filter((m:any)=>m.sentiment); const neg=analyzed.filter((m:any)=>m.sentiment==="negative"); const negPct=analyzed.length?neg.length/analyzed.length*100:0; let alerts=0;
  async function add(key:string,severity:string,title:string,description:string,metadata:any){ const {error}=await db.from("project_alerts").insert({project_id:projectId,user_id:userId,severity,title,description,metadata,dedupe_key:key,created_at:now()}); if(!error)alerts++; }
  if(analyzed.length>=10&&negPct>=threshold) await add(`negative:${new Date().toISOString().slice(0,10)}`,negPct>=50?"high":"medium","Negative sentiment threshold reached",`${Math.round(negPct)}% of the latest analyzed items are negative.`,{negative_percentage:negPct,analyzed:analyzed.length});
  const viral=[...r].sort((a:any,b:any)=>num(b.virality_score)-num(a.virality_score)).filter((m:any)=>num(m.virality_score)>=20).slice(0,3);
  for(const m of viral) await add(`viral:${m.id}`,m.sentiment==="negative"?"high":"medium",`Fast-growing ${m.platform} content`,String(m.content||"").slice(0,500),{mention_id:m.id,virality_score:m.virality_score,sentiment:m.sentiment});
  if(settings?.anomaly_alerts_enabled!==false){
    const prevStart=new Date(Date.now()-8*24*3600000).toISOString(), prevEnd=new Date(Date.now()-24*3600000).toISOString();
    const {count:priorCount}=await db.from("mentions").select("id",{count:"exact",head:true}).eq("project_id",projectId).gte("published_at",prevStart).lt("published_at",prevEnd);
    const baseline=(num(priorCount)/7)||0; const spike=baseline?((r.length-baseline)/baseline)*100:0;
    if(baseline>=2&&spike>=80) await add(`spike:${new Date().toISOString().slice(0,10)}`,spike>=180?"high":"medium",negPct>=threshold?"Conversation spike + negative sentiment shift":"Conversation spike detected",`Mentions are ${Math.round(spike)}% above the previous 7-day daily baseline.${negPct>=threshold?` Negative sentiment is ${Math.round(negPct)}%.`:""}`,{today:r.length,daily_baseline:baseline,spike_percentage:spike,negative_percentage:negPct});
  }
  return alerts;
}

async function dailySummary(db:any,projectId:string,userId:string,metrics:any){
  const {data:settings}=await db.from("project_settings").select("daily_summary_enabled").eq("project_id",projectId).maybeSingle(); if(settings?.daily_summary_enabled===false)return;
  const key=process.env.OPENAI_API_KEY;if(!key)return;
  const start=new Date(Date.now()-24*3600000).toISOString();
  const {data:mentions}=await db.from("mentions").select("platform,content,sentiment,emotion,likes,shares,replies,views,published_at").eq("project_id",projectId).gte("published_at",start).order("published_at",{ascending:false}).limit(120);
  if(!mentions?.length)return;
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-5.6-luna",store:false,input:"Create a concise daily executive social-intelligence brief. Use only the supplied evidence.\nMetrics:"+JSON.stringify(metrics)+"\nItems:"+JSON.stringify(mentions),text:{format:{type:"json_schema",name:"daily_summary",strict:true,schema:{type:"object",additionalProperties:false,required:["executive_summary","highlights","risks","opportunities","recommendations"],properties:{executive_summary:{type:"string"},highlights:{type:"array",items:{type:"string"}},risks:{type:"array",items:{type:"string"}},opportunities:{type:"array",items:{type:"string"}},recommendations:{type:"array",items:{type:"string"}}}}}}})});
  if(!r.ok)return;let x:any;try{x=JSON.parse(outputText(await r.json())||"{}")}catch{return}
  await db.from("daily_project_summaries").upsert({project_id:projectId,user_id:userId,summary_date:new Date().toISOString().slice(0,10),executive_summary:x.executive_summary||"",highlights:x.highlights||[],risks:x.risks||[],opportunities:x.opportunities||[],recommendations:x.recommendations||[],metrics},{onConflict:"project_id,summary_date"});
  await usage(db,projectId,userId,"ai_daily_summary",1,"OpenAI");
}

async function applyRetention(db:any,projectId:string){ const {data:s}=await db.from("project_settings").select("retention_days").eq("project_id",projectId).maybeSingle(); await db.rpc("metrix_apply_retention",{p_project_id:projectId,p_days:num(s?.retention_days)||365}); }

export async function runProjectPipeline(projectId:string,userId:string){
  const db=createAdminClient(); const started=Date.now();
  const {data:run}=await db.from("pipeline_runs").insert({project_id:projectId,user_id:userId,status:"running",started_at:now(),details:{mode:"account_based",version:"v5"}}).select("id").single();
  let imported=0,updated=0,analyzed=0,alerts=0; const details:Record<string,any>={};
  try{
    const {data:accounts,error}=await db.from("social_accounts").select("*").eq("project_id",projectId).eq("user_id",userId).eq("enabled",true); if(error)throw error;
    for(const account of accounts||[]){ const p=String(account.platform||"").toLowerCase(),provider=providerFor(p),t0=Date.now();
      try{
        const result=await collectAccount(db,account); let ins=0,upd=0;
        for(const m of result.mentions||[]){ const x=await upsertMention(db,projectId,userId,account,m); ins+=x.inserted;upd+=x.updated; }
        imported+=ins;updated+=upd; await markAccount(db,account,"success",null,result.externalId||null,ins);
        await syncEvent(db,{project_id:projectId,user_id:userId,social_account_id:account.id,platform:account.platform,provider,status:"success",fetched:result.mentions?.length||0,inserted:ins,updated:upd,duration_ms:Date.now()-t0});
        await usage(db,projectId,userId,"provider_records",result.mentions?.length||0,provider,{platform:p});
        details[p]={imported:ins,updated:upd,fetched:result.mentions?.length||0,status:"success",provider};
      }catch(e:any){ const message=String(e?.message||e); await persistProviderJob(db,projectId,userId,account,message); await markAccount(db,account,"failed",message); await syncEvent(db,{project_id:projectId,user_id:userId,social_account_id:account.id,platform:account.platform,provider,status:"failed",error:message,duration_ms:Date.now()-t0}); details[p]={imported:0,updated:0,status:"failed",error:message,provider}; }
    }
    analyzed=await analyzeEnrichment(db,projectId,userId); await refreshInsights(db,projectId,userId); const metrics=await recordDailyMetrics(db,projectId,userId); alerts=await createAlerts(db,projectId,userId); await dailySummary(db,projectId,userId,metrics); await applyRetention(db,projectId);
    if(run?.id) await db.from("pipeline_runs").update({status:"success",finished_at:now(),imported,analyzed,alerts,details:{version:"v5",updated,duration_ms:Date.now()-started,platforms:details}}).eq("id",run.id);
    return {imported,updated,analyzed,alerts,details};
  }catch(e:any){ if(run?.id) await db.from("pipeline_runs").update({status:"failed",finished_at:now(),imported,analyzed,alerts,details:{version:"v5",updated,error:String(e?.message||e),platforms:details}}).eq("id",run.id); throw e; }
}
