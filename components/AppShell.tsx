"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDossierStore } from "@/lib/store/dossierStore";
import { useT } from "@/lib/i18n/useT";
import { DIRECTIONS, LOCALE_LABELS, LOCALE_FLAGS, LOCALES } from "@/lib/i18n/config";
import { Globe, LayoutDashboard, FolderOpen, FileText, Settings, Plus, ChevronDown, Presentation, MapPin } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { HydrationGate } from "./HydrationGate";
import { VoiceCopilot } from "./assistant/VoiceCopilot";

export function AppShell({ children }: { children: React.ReactNode }) {
  const locale = useDossierStore((s) => s.locale);
  const hydrated = useDossierStore((s) => s.hydrated);
  const { t } = useT();
  const pathname = usePathname();
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = DIRECTIONS[locale];
  }, [locale]);

  useEffect(() => {
    if (!hydrated) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "n") {
        e.preventDefault();
        router.push("/dossiers/new");
      } else if (e.key === "/") {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>("[data-search-input]");
        input?.focus();
      } else if (e.key === "?") {
        setHelpOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hydrated, router]);

  // The cinematic pitch page renders chrome-free (no header, nav, or copilot).
  if (pathname === "/present") {
    return <HydrationGate>{children}</HydrationGate>;
  }

  const navItems = [
    { href: "/", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/dossiers", label: t("nav.dossiers"), icon: FolderOpen },
    { href: "/documents", label: t("nav.documents"), icon: FileText },
    { href: "/settings", label: t("nav.settings"), icon: Settings },
  ];

  return (
    <HydrationGate>
      <div className="min-h-screen text-ink-900" dir={DIRECTIONS[locale]}>
        <header className="sticky top-0 z-30 border-b border-white/40 glass shadow-[0_1px_0_rgba(255,255,255,0.6),0_8px_24px_-16px_rgba(79,70,229,0.35)]">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
            <Link href="/" className="group flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-brand transition-transform group-hover:scale-105">
                <span className="text-sm font-black tracking-tight">D</span>
              </div>
              <div className="leading-tight">
                <p className="text-sm font-bold text-gradient">{t("app.name")}</p>
                <p className="text-[10px] font-medium text-ink-500">{t("app.tagline")}</p>
              </div>
            </Link>

            <nav className="ms-4 hidden gap-1 md:flex">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                      active
                        ? "border border-ink-200 bg-white text-ink-900 shadow-sm"
                        : "text-ink-600 hover:bg-brand-50 hover:text-brand-700"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="ms-auto flex items-center gap-2">
              <Link
                href="/track"
                title={t("track.title")}
                className={cn(
                  "hidden sm:inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors",
                  pathname?.startsWith("/track")
                    ? "border-brand-300 bg-brand-100 text-brand-800"
                    : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50"
                )}
              >
                <MapPin className="h-3.5 w-3.5" />
                {t("nav.track")}
              </Link>
              <Link
                href="/present"
                title="Pitch Mode"
                className="hidden md:inline-flex h-9 items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100"
              >
                <Presentation className="h-3.5 w-3.5" />
                Pitch
              </Link>
              <LocaleSwitcher />
              <Link
                href="/dossiers/new"
                className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3.5 text-xs font-semibold text-ink-700 transition-colors hover:border-brand-200 hover:bg-ink-50"
              >
                <Plus className="h-3.5 w-3.5" />
                {t("common.newDossier")}
              </Link>
              <button
                onClick={() => setHelpOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-brand-50 hover:text-brand-700"
                title="?"
                aria-label="Help"
              >
                <span className="text-xs font-semibold">?</span>
              </button>
            </div>
          </div>
        </header>

        <main key={pathname} className="mx-auto max-w-7xl animate-fade-in-up px-4 py-6">
          {children}
        </main>

        <VoiceCopilot />

        {helpOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-ink-900/40" onClick={() => setHelpOpen(false)} />
            <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-5 shadow-2xl border border-ink-200">
              <h3 className="text-base font-semibold mb-2">Raccourcis / Shortcuts</h3>
              <ul className="text-sm space-y-1.5 text-ink-700">
                <li><kbd className="rounded bg-ink-100 px-1.5 py-0.5">N</kbd> · {t("shortcut.new")}</li>
                <li><kbd className="rounded bg-ink-100 px-1.5 py-0.5">/</kbd> · {t("shortcut.search")}</li>
                <li><kbd className="rounded bg-ink-100 px-1.5 py-0.5">?</kbd> · {t("shortcut.help")}</li>
              </ul>
              <button
                onClick={() => setHelpOpen(false)}
                className="mt-4 rounded-md bg-ink-900 px-3 py-1.5 text-sm text-white"
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </HydrationGate>
  );
}

function LocaleSwitcher() {
  const locale = useDossierStore((s) => s.locale);
  const setLocale = useDossierStore((s) => s.setLocale);
  return (
    <div className="relative">
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as any)}
        className="appearance-none rounded-lg border border-ink-200 bg-white/80 py-1.5 ps-8 pe-7 text-xs font-semibold text-ink-700 transition-colors hover:border-brand-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
        aria-label={LOCALE_LABELS[locale]}
      >
        {LOCALES.map((k) => (
          <option key={k} value={k}>
            {LOCALE_FLAGS[k]} {LOCALE_LABELS[k]}
          </option>
        ))}
      </select>
      <Globe className="pointer-events-none absolute start-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-500" />
      <ChevronDown className="pointer-events-none absolute end-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
    </div>
  );
}