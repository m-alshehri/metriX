export default function MetricCard({label,value,change}:{label:string;value:string;change?:string}){
  return <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
    <div className="text-base text-zinc-500">{label}</div>
    <div className="mt-2 text-4xl font-extrabold text-[#330033]">{value}</div>
    {change&&<div className="mt-2 text-base font-semibold text-emerald-600">{change}</div>}
  </div>;
}
