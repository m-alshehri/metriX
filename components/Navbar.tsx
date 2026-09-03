import Link from "next/link";
import { Locale } from "@/lib/i18n";
export default function Navbar({locale,t}:{locale:Locale;t:any}) {
  const other=locale==="en"?"ar":"en";
  return <header className="sticky top-0 z-50 border-b border-black/5 bg-white/90 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
    <Link href={`/${locale}`} className="text-2xl font-black tracking-tight text-metrix-900">metriX</Link>
    <nav className="hidden items-center gap-7 text-sm font-semibold text-zinc-700 md:flex"><a href="#features">{t.nav.features}</a><a href="#how">{t.nav.how}</a><a href="#insights">{t.nav.insights}</a><a href="#pricing">{t.nav.pricing}</a></nav>
    <div className="flex items-center gap-2"><Link href={`/${other}`} className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-bold">{t.nav.language}</Link><Link href={`/${locale}/login`} className="rounded-full px-4 py-2 text-sm font-bold text-metrix-900">{t.nav.login}</Link><Link href={`/${locale}/signup`} className="rounded-full bg-metrix-900 px-5 py-2.5 text-sm font-bold text-white">{t.nav.start}</Link></div>
  </div></header>;
}
