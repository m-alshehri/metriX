import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const tajawal = localFont({
  src: [
    {
      path: "../fonts/tajawal/Tajawal-ExtraLight.ttf",
      weight: "200",
      style: "normal",
    },
    {
      path: "../fonts/tajawal/Tajawal-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../fonts/tajawal/Tajawal-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/tajawal/Tajawal-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../fonts/tajawal/Tajawal-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../fonts/tajawal/Tajawal-ExtraBold.ttf",
      weight: "800",
      style: "normal",
    },
    {
      path: "../fonts/tajawal/Tajawal-Black.ttf",
      weight: "900",
      style: "normal",
    },
  ],
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
