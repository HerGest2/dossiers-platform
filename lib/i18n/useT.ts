// Tiny translation hook. Uses the locale from the store and re-renders on change.

"use client";

import { useDossierStore } from "@/lib/store/dossierStore";
import { translate } from "./config";

export function useT() {
  const locale = useDossierStore((s) => s.locale);
  return {
    locale,
    t: (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
  };
}
