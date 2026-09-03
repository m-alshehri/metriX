import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
export default function LocaleLayout({children,params}:{children:React.ReactNode;params:{locale:string}}) {
  if (!isLocale(params.locale)) notFound();
  return <div lang={params.locale} dir={params.locale === "ar" ? "rtl" : "ltr"}>{children}</div>;
}
