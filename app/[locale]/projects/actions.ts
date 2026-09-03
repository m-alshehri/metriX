"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isLocale } from "@/lib/i18n";
function safeLocale(v:FormDataEntryValue|null){const l=typeof v==="string"?v:"en";return isLocale(l)?l:"en";}

export async function createProject(formData:FormData){
  const locale=safeLocale(formData.get("locale")),name=String(formData.get("name")??"").trim(),description=String(formData.get("description")??"").trim();
  if(!name) redirect(`/${locale}/projects/new?error=invalid`);
  const supabase=createClient(),{data:{user}}=await supabase.auth.getUser();
  if(!user) redirect(`/${locale}/login`);
  const {error}=await supabase.from("projects").insert({user_id:user.id,name,description:description||null});
  if(error) redirect(`/${locale}/projects/new?error=create`);
  revalidatePath(`/${locale}/dashboard`);
  redirect(`/${locale}/dashboard?message=project-created`);
}

export async function addKeyword(formData:FormData){
  const locale=safeLocale(formData.get("locale")),projectId=String(formData.get("project_id")??""),keyword=String(formData.get("keyword")??"").trim();
  if(!projectId||!keyword) redirect(`/${locale}/projects/${projectId}?error=keyword`);
  const supabase=createClient(),{data:{user}}=await supabase.auth.getUser();
  if(!user) redirect(`/${locale}/login`);
  const {error}=await supabase.from("keywords").insert({project_id:projectId,user_id:user.id,keyword});
  if(error){
    const duplicate=(error as any).code==="23505";
    redirect(`/${locale}/projects/${projectId}?error=${duplicate?"duplicate":"keyword"}`);
  }
  revalidatePath(`/${locale}/projects/${projectId}`);
  redirect(`/${locale}/projects/${projectId}?message=keyword-created`);
}

export async function deleteKeyword(formData:FormData){
  const locale=safeLocale(formData.get("locale")),projectId=String(formData.get("project_id")??""),keywordId=String(formData.get("keyword_id")??"");
  const supabase=createClient(),{data:{user}}=await supabase.auth.getUser();
  if(!user) redirect(`/${locale}/login`);
  const {error}=await supabase.from("keywords").delete().eq("id",keywordId);
  if(error) redirect(`/${locale}/projects/${projectId}?error=keyword`);
  revalidatePath(`/${locale}/projects/${projectId}`);
  redirect(`/${locale}/projects/${projectId}?message=keyword-deleted`);
}
