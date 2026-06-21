"use client";

// Citizen-facing "Where is my dossier?" view. Read-only: a citizen enters a
// reference and sees a friendly progress stepper — current phase, what's next,
// and last update. No civil-servant tools, documents, or internal notes.

import { useState } from "react";
import { useDossierStore } from "@/lib/store/dossierStore";
import { useT } from "@/lib/i18n/useT";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Empty } from "@/components/ui/Empty";
import {
  phasesFor,
  nextPhases,
  daysInCurrentPhase,
  phaseSlaDays,
} from "@/lib/domain/workflow";
import { Dossier } from "@/lib/domain/types";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Search, MapPin, Check, Clock, CircleDot, ArrowRight, FileSearch } from "lucide-react";

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[\s_]+/g, "-");
}

export default function TrackPage() {
  const { t } = useT();
  const dossiers = useDossierStore((s) => s.dossiers);

  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [match, setMatch] = useState<Dossier | null>(null);

  const search = () => {
    const q = normalize(query);
    setSearched(true);
    if (!q) {
      setMatch(null);
      return;
    }
    const found =
      dossiers.find((d) => normalize(d.reference) === q) ??
      dossiers.find((d) => normalize(d.reference).includes(q)) ??
      null;
    setMatch(found);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-ink-900">{t("track.title")}</h1>
        <p className="mt-1 text-sm text-ink-500">{t("track.subtitle")}</p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") search();
            }}
            placeholder={t("track.placeholder")}
            className="h-11 w-full rounded-lg border border-ink-200 bg-white ps-10 pe-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>
        <Button onClick={search} className="h-11">
          {t("track.search")}
        </Button>
      </div>

      {searched && match ? <DossierProgress dossier={match} /> : null}

      {searched && !match ? (
        <Empty
          title={t("track.notFound")}
          icon={<FileSearch className="h-8 w-8" />}
        />
      ) : null}
    </div>
  );
}

function DossierProgress({ dossier }: { dossier: Dossier }) {
  const { t, locale } = useT();
  const phases = phasesFor(dossier.type);
  const currentIdx = phases.indexOf(dossier.currentPhase);
  const days = daysInCurrentPhase(dossier);
  const delayed = days > phaseSlaDays(dossier.currentPhase);
  const next = nextPhases(dossier)[0];

  return (
    <Card className="overflow-hidden">
      {/* Header band */}
      <div className="bg-brand-gradient p-5 text-white">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-sm font-semibold">{dossier.reference}</span>
          <Badge tone="neutral" className="border-white/30 bg-white/15 text-white">
            {t(`type.${dossier.type}`)}
          </Badge>
        </div>
        <h2 className="mt-2 text-lg font-bold leading-snug">{dossier.object}</h2>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-white/85">
          <MapPin className="h-3.5 w-3.5" />
          {dossier.commune}, {dossier.wilaya}
        </p>
      </div>

      <CardBody className="space-y-5">
        {/* Plain-language status */}
        <div
          className={cn(
            "flex items-start gap-2 rounded-lg border p-3 text-sm",
            delayed
              ? "border-warn-100 bg-warn-50 text-warn-700"
              : "border-blue-100 bg-blue-50 text-blue-700"
          )}
        >
          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{delayed ? t("track.status.delayed") : t("track.status.inProgress")}</span>
        </div>

        {/* Progress stepper */}
        <ol className="relative space-y-0">
          {phases.map((phase, i) => {
            const state = i < currentIdx ? "completed" : i === currentIdx ? "current" : "upcoming";
            const last = i === phases.length - 1;
            return (
              <li key={phase} className="flex gap-3">
                {/* marker + connector */}
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2",
                      state === "completed" && "border-emerald-500 bg-emerald-500 text-white",
                      state === "current" && "border-brand-500 bg-brand-50 text-brand-600",
                      state === "upcoming" && "border-ink-200 bg-white text-ink-300"
                    )}
                  >
                    {state === "completed" ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : state === "current" ? (
                      <CircleDot className="h-3.5 w-3.5" />
                    ) : (
                      <span className="text-[11px] font-semibold">{i + 1}</span>
                    )}
                  </span>
                  {!last ? (
                    <span
                      className={cn(
                        "my-0.5 w-0.5 flex-1",
                        i < currentIdx ? "bg-emerald-300" : "bg-ink-200"
                      )}
                    />
                  ) : null}
                </div>
                {/* label */}
                <div className={cn("pb-5 pt-0.5", last && "pb-0")}>
                  <p
                    className={cn(
                      "text-sm font-medium",
                      state === "upcoming" ? "text-ink-400" : "text-ink-800"
                    )}
                  >
                    {t(`phase.${phase}`)}
                  </p>
                  {state === "current" ? (
                    <p className="mt-0.5 text-xs text-brand-600">{t("track.step.current")}</p>
                  ) : state === "completed" ? (
                    <p className="mt-0.5 text-xs text-emerald-600">{t("track.step.completed")}</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>

        {/* What's next + last update */}
        <div className="space-y-2 border-t border-ink-100 pt-4">
          <div className="flex items-center gap-2 text-sm">
            <ArrowRight className="h-4 w-4 text-brand-500" />
            <span className="text-ink-500">{t("track.whatNext")}:</span>
            <span className="font-medium text-ink-800">
              {next ? t(`phase.${next}`) : t("track.finalStep")}
            </span>
          </div>
          <p className="text-xs text-ink-500">
            {t("track.lastUpdate")}: {formatDate(dossier.updatedAt, locale)}
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
