"use server";

import {headers} from "next/headers";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {isLocale} from "@/lib/i18n";

function safeLocale(v:FormDataEntryValue|null){
  const l=typeof v==="string"?v:"en";
  return isLocale(l)?l:"en";
}

export async function signUp(formData:FormData){
  const locale=safeLocale(formData.get("locale")),name=String(formData.get("name")??"").trim(),email=String(formData.get("email")??"").trim(),password=String(formData.get("password")??"");
  if(!email||!password||password.length<6)redirect(`/${locale}/signup?error=invalid`);
  const supabase=createClient(),origin=headers().get("origin");
  const {error}=await supabase.auth.signUp({email,password,options:{data:{name},emailRedirectTo:`${origin}/auth/callback?next=/${locale}/dashboard`}});
  if(error)redirect(`/${locale}/signup?error=signup`);
  redirect(`/${locale}/login?message=check-email`);
}

export async function signIn(formData:FormData){
  const locale=safeLocale(formData.get("locale")),email=String(formData.get("email")??"").trim(),password=String(formData.get("password")??"");
  const supabase=createClient();
  const {error}=await supabase.auth.signInWithPassword({email,password});
  if(error)redirect(`/${locale}/login?error=invalid-login`);
  redirect(`/${locale}/dashboard`);
}

export async function requestPasswordReset(formData:FormData){
  const locale=safeLocale(formData.get("locale"));
  const email=String(formData.get("email")??"").trim();
  if(!email)redirect(`/${locale}/forgot-password?error=invalid-email`);
  const supabase=createClient();
  const origin=headers().get("origin") ?? "https://www.trymetrix.co";
  const redirectTo=`${origin}/auth/callback?next=/${locale}/reset-password`;
  const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo});
  if(error)redirect(`/${locale}/forgot-password?error=send-failed`);
  redirect(`/${locale}/forgot-password?message=check-email`);
}

export async function updatePassword(formData:FormData){
  const locale=safeLocale(formData.get("locale"));
  const password=String(formData.get("password")??"");
  const confirm=String(formData.get("confirmPassword")??"");
  if(password.length<6)redirect(`/${locale}/reset-password?error=short-password`);
  if(password!==confirm)redirect(`/${locale}/reset-password?error=mismatch`);
  const supabase=createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect(`/${locale}/forgot-password?error=expired`);
  const {error}=await supabase.auth.updateUser({password});
  if(error)redirect(`/${locale}/reset-password?error=update-failed`);
  await supabase.auth.signOut();
  redirect(`/${locale}/login?message=password-updated`);
}

export async function signOut(formData:FormData){
  const locale=safeLocale(formData.get("locale")),supabase=createClient();
  await supabase.auth.signOut();
  redirect(`/${locale}`);
}
