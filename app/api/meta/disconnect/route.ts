import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
export async function POST(){
 const s=createClient();const {data:{user}}=await s.auth.getUser();
 if(!user)return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
 const db=createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SECRET_KEY!,{auth:{persistSession:false}});
 const {error}=await db.rpc("delete_meta_token",{p_user_id:user.id});
 if(error)return NextResponse.json({ok:false,error:error.message},{status:500});
 return NextResponse.json({ok:true});
}
