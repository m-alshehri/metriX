import { Tajawal } from "next/font/google";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["200", "300", "400", "500", "700", "800", "900"],
  display: "swap",
});

export default async function LocaleLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;

  const { children } = props;

  if (!isLocale(params.locale)) notFound();

  return (
    <div
      lang={params.locale}
      dir={params.locale === "ar" ? "rtl" : "ltr"}
      className={`${tajawal.className} min-h-screen bg-zinc-50`}
    >
      <SiteHeader locale={params.locale} />
      {children}
      <SiteFooter locale={params.locale} />
    </div>
  );
}
