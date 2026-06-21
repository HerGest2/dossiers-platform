// Locale-aware date / number formatting helpers.

import { Locale } from "@/lib/domain/types";

export function formatDate(iso: string, locale: Locale): string {
  const d = new Date(iso);
  try {
    return d.toLocaleDateString(localeToBcp47(locale), {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export function formatDateTime(iso: string, locale: Locale): string {
  const d = new Date(iso);
  try {
    return d.toLocaleString(localeToBcp47(locale), {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d.toISOString().slice(0, 16).replace("T", " ");
  }
}

export function formatNumber(n: number, locale: Locale): string {
  try {
    return n.toLocaleString(localeToBcp47(locale));
  } catch {
    return n.toString();
  }
}

export function formatBytes(n: number, locale: Locale): string {
  const units =
    locale === "fr" ? ["o", "Ko", "Mo", "Go"] : ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function localeToBcp47(l: Locale) {
  if (l === "ar") return "ar-DZ";
  if (l === "fr") return "fr-DZ";
  if (l === "sq") return "sq-AL";
  return "en-US";
}

export function formatDzd(n: number, locale: Locale): string {
  const formatted = formatNumber(Math.round(n), locale);
  if (locale === "ar") return `${formatted} دج`;
  return `${formatted} DZD`;
}
