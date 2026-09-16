"use client";
import {ReactNode,useState} from "react";
import {BarChart3,Brain,MessageSquare,Radio, Bell} from "lucide-react";
type Tab={id:string;label:string;icon:any;content:ReactNode};
export default function DashboardTabs({tabs}:{tabs:{id:string;label:string;content:ReactNode}[]}){
 const [active,setActive]=useState(tabs[0]?.id||""); const icons:any={overview:BarChart3,intelligence:Brain,mentions:MessageSquare,sources:Radio,alerts:Bell};
 return <div className="mt-6 grid gap-5 lg:grid-cols-[210px_minmax(0,1fr)]"><aside className="h-fit rounded-[1.6rem] border bg-white p-3 shadow-sm lg:sticky lg:top-5"><nav className="space-y-1">{tabs.map(t=>{const I=icons[t.id]||BarChart3;return <button key={t.id} onClick={()=>setActive(t.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start text-base transition ${active===t.id?"bg-[#330033] text-white":"text-[#330033] hover:bg-zinc-50"}`}><I size={18}/><span>{t.label}</span></button>})}</nav></aside><div className="min-w-0">{tabs.map(t=><div key={t.id} className={active===t.id?"block":"hidden"}>{t.content}</div>)}</div></div>
}
