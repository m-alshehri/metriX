import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
export const dynamic="force-dynamic";
const admin=()=>createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SECRET_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
export async function GET(){
 const s=createClient(); const {data:{user}}=await s.auth.getUser();
 if(!user)return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
 const db=admin(); const {data:c,error}=await db.from("meta_connections").select("id,meta_user_id,status,connected_at,token_expires_at").eq("user_id",user.id).maybeSingle();
 if(error)return NextResponse.json({ok:false,error:error.message},{status:500});
 if(!c)return NextResponse.json({ok:true,connected:false,assets:[]});
 const {data:assets,error:ae}=await db.from("meta_assets").select("asset_type,external_id,name,username,parent_external_id,selected").eq("user_id",user.id).order("asset_type");
 if(ae)return NextResponse.json({ok:false,error:ae.message},{status:500});
 return NextResponse.json({ok:true,connected:c.status==="connected",connection:c,assets:assets||[]});
}
export async function POST(req:Request){
 const s=createClient(); const {data:{user}}=await s.auth.getUser();
 if(!user)return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
 let b:any; try{b=await req.json()}catch{return NextResponse.json({ok:false,error:"Invalid request"},{status:400})}
 const token=String(b?.accessToken||"").trim(), expiresIn=Number(b?.expiresIn||0);
 if(!token)return NextResponse.json({ok:false,error:"Missing Meta access token"},{status:400});
 const u=new URL("https://graph.facebook.com/me/accounts"); u.searchParams.set("fields","id,name,instagram_business_account{id,username,name}");u.searchParams.set("limit","100");
 const gr=await fetch(u.toString(),{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});const p=await gr.json();
 if(!gr.ok)return NextResponse.json({ok:false,error:p?.error?.message||`Meta Graph API failed (${gr.status})`},{status:gr.status});
 const mu=new URL("https://graph.facebook.com/me");mu.searchParams.set("fields","id");
 const mr=await fetch(mu.toString(),{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});const me=mr.ok?await mr.json():{};
 const db=admin(), exp=expiresIn>0?new Date(Date.now()+expiresIn*1000).toISOString():null;
 const {error:te}=await db.rpc("store_meta_token",{p_user_id:user.id,p_access_token:token,p_meta_user_id:me?.id?String(me.id):null,p_expires_at:exp});
 if(te)return NextResponse.json({ok:false,error:`Secure token storage failed: ${te.message}`},{status:500});
 const {data:c,error:ce}=await db.from("meta_connections").select("id").eq("user_id",user.id).single();
 if(ce||!c)return NextResponse.json({ok:false,error:ce?.message||"Connection record missing"},{status:500});
 await db.from("meta_assets").delete().eq("user_id",user.id);
 const assets:any[]=[];
 for(const page of Array.isArray(p?.data)?p.data:[]){
  assets.push({connection_id:c.id,user_id:user.id,asset_type:"facebook_page",external_id:String(page.id),name:String(page.name||page.id),selected:true});
  if(page.instagram_business_account?.id)assets.push({connection_id:c.id,user_id:user.id,asset_type:"instagram_account",external_id:String(page.instagram_business_account.id),name:page.instagram_business_account.name||null,username:page.instagram_business_account.username||null,parent_external_id:String(page.id),selected:true});
 }
 if(assets.length){const {error:e}=await db.from("meta_assets").insert(assets);if(e)return NextResponse.json({ok:false,error:e.message},{status:500})}
 return NextResponse.json({ok:true,connected:true,assets});
}
