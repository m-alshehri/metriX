import en from "@/messages/en.json";
import ar from "@/messages/ar.json";

export type Locale = "en" | "ar";
export function isLocale(v: string): v is Locale { return v === "en" || v === "ar"; }
export function getDictionary(locale: Locale) { return locale === "ar" ? ar : en; }
