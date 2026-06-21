"use client";

import { useState, useMemo } from "react";
import { useDossierStore } from "@/lib/store/dossierStore";
import { useT } from "@/lib/i18n/useT";
import { DossierList } from "@/components/dossier/DossierList";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Search, Plus, Filter, X } from "lucide-react";
import Link from "next/link";
import { DossierType, Phase } from "@/lib/domain/types";
import { cn } from "@/lib/utils/cn";

export default function DossiersPage() {
  const { t } = useT();
  const dossiers = useDossierStore((s) => s.dossiers);
  const [q, setQ] = useState("");
  const [type, setType] = useState<DossierType | "all">("all");
  const [phase, setPhase] = useState<Phase | "all">("all");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent" | "all">("all");

  const filtered = useMemo(() => {
    return dossiers.filter((d) => {
      if (type !== "all" && d.type !== type) return false;
      if (phase !== "all" && d.currentPhase !== phase) return false;
      if (priority !== "all" && d.priority !== priority) return false;
      if (q.trim()) {
        const hay = (
          d.reference +
          " " +
          d.object +
          " " +
          d.commune +
          " " +
          d.wilaya +
          " " +
          d.parties.join(" ")
        ).toLowerCase();
        if (!hay.includes(q.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [dossiers, q, type, phase, priority]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gradient">{t("dossiers.title")}</h1>
          <p className="text-sm text-ink-500 mt-1">{t("dossiers.subtitle")}</p>
        </div>
        <Link href="/dossiers/new">
          <Button>
            <Plus className="h-4 w-4" />
            {t("common.newDossier")}
          </Button>
        </Link>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              data-search-input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("common.search")}
              className="w-full rounded-md border border-ink-200 bg-white py-1.5 ps-8 pe-3 text-sm placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-300"
            />
          </div>
          <Select
            label={t("common.allTypes")}
            value={type}
            onChange={(v) => setType(v as any)}
            options={[
              { value: "all", label: t("common.allTypes") },
              { value: "exploration", label: t("type.exploration") },
              { value: "ekb_privatization", label: t("type.ekb_privatization") },
            ]}
          />
          <Select
            label={t("common.allPhases")}
            value={phase}
            onChange={(v) => setPhase(v as any)}
            options={[
              { value: "all", label: t("common.allPhases") },
              { value: "intake", label: t("phase.intake") },
              { value: "reconnaissance", label: t("phase.reconnaissance") },
              { value: "releve_topographique", label: t("phase.releve_topographique") },
              { value: "analyse_juridique", label: t("phase.analyse_juridique") },
              { value: "evaluation_domaniale", label: t("phase.evaluation_domaniale") },
              { value: "validation", label: t("phase.validation") },
              { value: "instruction", label: t("phase.instruction") },
              { value: "commission_evaluation", label: t("phase.commission_evaluation") },
              { value: "appel_offres", label: t("phase.appel_offres") },
              { value: "adjudication", label: t("phase.adjudication") },
              { value: "signature_acte", label: t("phase.signature_acte") },
            ]}
          />
          <Select
            label={t("common.allPriorities")}
            value={priority}
            onChange={(v) => setPriority(v as any)}
            options={[
              { value: "all", label: t("common.allPriorities") },
              { value: "urgent", label: t("priority.urgent") },
              { value: "high", label: t("priority.high") },
              { value: "normal", label: t("priority.normal") },
              { value: "low", label: t("priority.low") },
            ]}
          />
          {(q || type !== "all" || phase !== "all" || priority !== "all") ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ("");
                setType("all");
                setPhase("all");
                setPriority("all");
              }}
            >
              <X className="h-3.5 w-3.5" />
              {t("common.all")}
            </Button>
          ) : null}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-ink-500">
          <span>
            {t("dossiers.count", { count: filtered.length })} / {dossiers.length}
          </span>
          <span className="inline-flex items-center gap-1">
            <Filter className="h-3 w-3" />
            {t("common.filter")}
          </span>
        </div>
      </Card>

      <DossierList dossiers={filtered} />
    </div>
  );
}

function Select<T extends string>({
  label, value, onChange, options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={cn(
        "rounded-md border border-ink-200 bg-white px-2.5 py-1.5 text-xs text-ink-700",
        "focus:outline-none focus:ring-2 focus:ring-ink-300"
      )}
      aria-label={label}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
