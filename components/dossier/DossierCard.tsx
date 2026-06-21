"use client";

import { Dossier } from "@/lib/domain/types";
import { Card, CardHeader, CardTitle, CardSubtitle, CardBody } from "@/components/ui/Card";
import { PhaseBadge } from "./PhaseBadge";
import { Badge } from "@/components/ui/Badge";
import { useT } from "@/lib/i18n/useT";
import { formatDate } from "@/lib/utils/format";
import { AlertTriangle, FileText, MapPin } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface Props {
  dossier: Dossier;
}

const priorityTone = {
  low: "neutral",
  normal: "info",
  high: "warning",
  urgent: "danger",
} as const;

export function DossierCard({ dossier }: Props) {
  const { t, locale } = useT();
  const openAlerts = dossier.alerts.filter((a) => !a.resolvedAt).length;

  return (
    <Link href={`/dossiers/${dossier.id}`} className="block group">
      <Card className="card-hover h-full group-hover:border-brand-200 group-hover:shadow-brand-lg">
        <CardHeader>
          <div className="flex flex-col gap-1">
            <CardTitle className="text-sm font-mono text-ink-500">
              {dossier.reference}
            </CardTitle>
            <p className="text-sm font-semibold text-ink-900 line-clamp-2">
              {dossier.object}
            </p>
          </div>
          <PhaseBadge phase={dossier.currentPhase} />
        </CardHeader>
        <CardBody className="space-y-2 text-sm text-ink-600">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-ink-400" />
            <span>
              {dossier.commune}, {dossier.wilaya}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-ink-400" />
            <span>
              {dossier.documents.length} {t("common.documents").toLowerCase()}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tone={priorityTone[dossier.priority]}>
              {t(`priority.${dossier.priority}`)}
            </Badge>
            <span className="text-xs text-ink-500">
              {t("common.updated")} {formatDate(dossier.updatedAt, locale)}
            </span>
          </div>
        </CardBody>
        {openAlerts > 0 ? (
          <div
            className={cn(
              "flex items-center gap-2 border-t border-warn-100 bg-warn-50 px-4 py-2 text-xs text-warn-700 rounded-b-xl"
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {openAlerts} {t("common.alerts").toLowerCase()}
          </div>
        ) : null}
      </Card>
    </Link>
  );
}