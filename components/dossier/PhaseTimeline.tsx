"use client";

import { Dossier, PhaseTransition, Locale } from "@/lib/domain/types";
import { useT } from "@/lib/i18n/useT";
import { formatDateTime } from "@/lib/utils/format";
import { CheckCircle2, Circle, Clock } from "lucide-react";

interface Props {
  dossier: Dossier;
}

export function PhaseTimeline({ dossier }: Props) {
  const { t, locale } = useT();
  return (
    <ol className="relative space-y-3 border-s border-ink-200 ps-6">
      {dossier.phaseHistory.map((p, i) => {
        const isCurrent = !p.exitedAt && p.phase === dossier.currentPhase;
        const Icon = isCurrent ? Clock : p.exitedAt ? CheckCircle2 : Circle;
        return (
          <li key={i} className="relative">
            <span className="absolute -start-[34px] flex h-6 w-6 items-center justify-center rounded-full bg-white ring-2 ring-ink-200">
              <Icon
                className={`h-3.5 w-3.5 ${isCurrent ? "text-amber-600 animate-pulse-soft" : "text-ink-400"}`}
              />
            </span>
            <PhaseRow transition={p} isCurrent={isCurrent} locale={locale} t={t} />
          </li>
        );
      })}
    </ol>
  );
}

function PhaseRow({
  transition,
  isCurrent,
  locale,
  t,
}: {
  transition: PhaseTransition;
  isCurrent: boolean;
  locale: Locale;
  t: (k: string, v?: Record<string, string | number>) => string;
}) {
  return (
    <div className="rounded-md border border-ink-200 bg-white p-3">
      <div className="flex items-center justify-between">
        <p className="font-medium text-ink-900">{t(`phase.${transition.phase}`)}</p>
        {isCurrent ? (
          <span className="text-xs font-medium text-amber-700">● {t("common.recent")}</span>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-ink-500">
        {formatDateTime(transition.enteredAt, locale)}{" "}
        {transition.enteredBy ? `· ${t("common.by")} ${transition.enteredBy}` : ""}
        {transition.exitedAt
          ? ` → ${formatDateTime(transition.exitedAt, locale)}`
          : ""}
      </p>
      {transition.note ? (
        <p className="mt-1 text-sm text-ink-700">{transition.note}</p>
      ) : null}
    </div>
  );
}