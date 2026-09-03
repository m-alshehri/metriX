import en from "@/messages/en.json";
import ar from "@/messages/ar.json";
export type Locale = "en" | "ar";
export function isLocale(value: string): value is Locale { return value === "en" || value === "ar"; }
export function getDictionary(locale: Locale) { return locale === "ar" ? ar : en; }
