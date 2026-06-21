// i18n config: locales, directions, and a tiny lookup helper.

import { Locale } from "@/lib/domain/types";

// Order matters: Albanian is primary (1st), French is 4th.
export const LOCALES: Locale[] = ["sq", "ar", "en", "fr"];

export const DEFAULT_LOCALE: Locale = "sq";

export const DIRECTIONS: Record<Locale, "ltr" | "rtl"> = {
  sq: "ltr",
  ar: "rtl",
  en: "ltr",
  fr: "ltr",
};

export const LOCALE_LABELS: Record<Locale, string> = {
  sq: "Shqip",
  ar: "العربية",
  en: "English",
  fr: "Français",
};

// Optional flag emojis for a friendlier language switcher.
export const LOCALE_FLAGS: Record<Locale, string> = {
  sq: "🇦🇱",
  ar: "🇩🇿",
  en: "🇬🇧",
  fr: "🇫🇷",
};

import sq from "./dictionaries/sq.json";
import ar from "./dictionaries/ar.json";
import en from "./dictionaries/en.json";
import fr from "./dictionaries/fr.json";

const DICT: Record<Locale, Record<string, string>> = { sq, ar, en, fr };

export type Dict = Record<string, string>;

export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  // Fall back to Albanian (primary), then French, then the raw key.
  const raw = DICT[locale]?.[key] ?? DICT.sq[key] ?? DICT.fr[key] ?? key;
  if (!vars) return raw;
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(new RegExp(`{${k}}`, "g"), String(v)),
    raw
  );
}
