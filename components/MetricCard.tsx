export default function MetricCard({label,value,change}:{label:string;value:string;change?:string}){
  return <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
    <div className="text-sm text-zinc-500">{label}</div>
    <div className="mt-2 text-3xl font-black text-zinc-900">{value}</div>
    {change&&<div className="mt-2 text-sm font-bold text-emerald-600">{change}</div>}
  </div>;
}
