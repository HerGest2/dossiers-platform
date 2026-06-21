"use client";

import { Badge } from "@/components/ui/Badge";
import { Phase, DossierType } from "@/lib/domain/types";
import { useT } from "@/lib/i18n/useT";
import { cn } from "@/lib/utils/cn";

const phaseColor: Record<Phase, string> = {
  intake: "bg-slate-50 text-slate-700 border-slate-200",
  reconnaissance: "bg-sky-50 text-sky-700 border-sky-200",
  releve_topographique: "bg-cyan-50 text-cyan-700 border-cyan-200",
  analyse_juridique: "bg-indigo-50 text-indigo-700 border-indigo-200",
  evaluation_domaniale: "bg-amber-50 text-amber-800 border-amber-200",
  validation: "bg-violet-50 text-violet-700 border-violet-200",
  cloture: "bg-emerald-50 text-emerald-700 border-emerald-200",
  instruction: "bg-sky-50 text-sky-700 border-sky-200",
  commission_evaluation: "bg-amber-50 text-amber-800 border-amber-200",
  appel_offres: "bg-orange-50 text-orange-700 border-orange-200",
  adjudication: "bg-rose-50 text-rose-700 border-rose-200",
  signature_acte: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

interface Props {
  phase: Phase;
  type?: DossierType;
  className?: string;
}

export function PhaseBadge({ phase, className }: Props) {
  const { t } = useT();
  return (
    <Badge tone="neutral" className={cn(phaseColor[phase], className)}>
      {t(`phase.${phase}`)}
    </Badge>
  );
}
