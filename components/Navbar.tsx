import Link from "next/link";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-2xl font-black tracking-tight text-metrix-900">
          metriX
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-semibold text-zinc-700 md:flex">
          <a href="#features" className="hover:text-metrix-900">المزايا</a>
          <a href="#how" className="hover:text-metrix-900">كيف يعمل؟</a>
          <a href="#insights" className="hover:text-metrix-900">التحليلات</a>
          <a href="#pricing" className="hover:text-metrix-900">الأسعار</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login" className="rounded-full px-4 py-2 text-sm font-bold text-metrix-900 hover:bg-metrix-50">
            تسجيل الدخول
          </Link>
          <Link href="/signup" className="rounded-full bg-metrix-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-metrix-800">
            ابدأ الآن
          </Link>
        </div>
      </div>
    </header>
  );
}
