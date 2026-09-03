"use server";
import {redirect} from "next/navigation"; import {revalidatePath} from "next/cache"; import {createClient} from "@/lib/supabase/server"; import {isLocale} from "@/lib/i18n";
function safeLocale(v:FormDataEntryValue|null){const l=typeof v==="string"?v:"en";return isLocale(l)?l:"en";}
export async function createProject(formData:FormData){
 const locale=safeLocale(formData.get("locale")),name=String(formData.get("name")??"").trim(),description=String(formData.get("description")??"").trim();
 const supabase=createClient(),{data:{user}}=await supabase.auth.getUser(); if(!user)redirect(`/${locale}/login`);
 const {error}=await supabase.from("projects").insert({user_id:user.id,name,description:description||null}); if(error)redirect(`/${locale}/projects/new?error=create`);
 revalidatePath(`/${locale}/dashboard`);redirect(`/${locale}/dashboard?message=project-created`);
}
export async function addKeyword(formData:FormData){
 const locale=safeLocale(formData.get("locale")),projectId=String(formData.get("project_id")??""),keyword=String(formData.get("keyword")??"").trim();
 const supabase=createClient(),{data:{user}}=await supabase.auth.getUser(); if(!user)redirect(`/${locale}/login`);
 const {error}=await supabase.from("keywords").insert({project_id:projectId,user_id:user.id,keyword});
 if(error)redirect(`/${locale}/projects/${projectId}?error=${(error as any).code==="23505"?"duplicate":"keyword"}`);
 revalidatePath(`/${locale}/projects/${projectId}`);redirect(`/${locale}/projects/${projectId}?message=keyword-created`);
}
export async function deleteKeyword(formData:FormData){
 const locale=safeLocale(formData.get("locale")),projectId=String(formData.get("project_id")??""),keywordId=String(formData.get("keyword_id")??"");
 const supabase=createClient(); const {error}=await supabase.from("keywords").delete().eq("id",keywordId); if(error)redirect(`/${locale}/projects/${projectId}?error=keyword`);
 revalidatePath(`/${locale}/projects/${projectId}`);redirect(`/${locale}/projects/${projectId}?message=keyword-deleted`);
}
export async function addTestMention(formData:FormData){
 const locale=safeLocale(formData.get("locale")),projectId=String(formData.get("project_id")??""),keywordId=String(formData.get("keyword_id")??"")||null;
 const platform=String(formData.get("platform")??"X"),author_name=String(formData.get("author_name")??"").trim(),author_username=String(formData.get("author_username")??"").trim();
 const content=String(formData.get("content")??"").trim(),post_url=String(formData.get("post_url")??"").trim(),sentiment=String(formData.get("sentiment")??"neutral");
 const publishedRaw=String(formData.get("published_at")??"").trim();
 const likes=Number(formData.get("likes")??0)||0,shares=Number(formData.get("shares")??0)||0,replies=Number(formData.get("replies")??0)||0,views=Number(formData.get("views")??0)||0;
 const supabase=createClient(),{data:{user}}=await supabase.auth.getUser(); if(!user)redirect(`/${locale}/login`);
 const {error}=await supabase.from("mentions").insert({
   user_id:user.id,project_id:projectId,keyword_id:keywordId,platform,
   author_name:author_name||null,author_username:author_username||null,content:content||null,post_url:post_url||null,
   published_at:publishedRaw?new Date(publishedRaw).toISOString():new Date().toISOString(),
   likes,shares,replies,views,sentiment,language:locale
 });
 if(error)redirect(`/${locale}/projects/${projectId}?error=mention`);
 revalidatePath(`/${locale}/projects/${projectId}`); revalidatePath(`/${locale}/dashboard`);
 redirect(`/${locale}/projects/${projectId}?message=mention-created`);
}
