"use client";

import { useParams, useRouter } from "next/navigation";
import { useDossierStore } from "@/lib/store/dossierStore";
import { useT } from "@/lib/i18n/useT";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PhaseBadge } from "@/components/dossier/PhaseBadge";
import { AISummaryPanel } from "@/components/dossier/AISummaryPanel";
import { NextStepPanel } from "@/components/dossier/NextStepPanel";
import { LetterPanel } from "@/components/dossier/LetterPanel";
import { AlertsPanel } from "@/components/dossier/AlertsPanel";
import { PhaseTimeline } from "@/components/dossier/PhaseTimeline";
import { DocumentUploader } from "@/components/documents/DocumentUploader";
import { DocumentList } from "@/components/documents/DocumentList";
import { Tabs } from "@/components/ui/Tabs";
import { formatDate, formatDateTime, formatNumber } from "@/lib/utils/format";
import { ArrowLeft, MapPin, Users, Maximize2, Banknote, Flag } from "lucide-react";
import Link from "next/link";

export default function DossierDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t, locale } = useT();
  const dossier = useDossierStore((s) => s.dossiers.find((d) => d.id === params.id));

  if (!dossier) {
    return (
      <div className="text-center py-20">
        <p className="text-ink-600">{t("common.empty")}</p>
        <Link href="/dossiers" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
          ← {t("common.back")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/dossiers"
            className="inline-flex items-center gap-1 text-xs text-ink-500 hover:text-ink-800"
          >
            <ArrowLeft className="h-3 w-3" />
            {t("common.back")}
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-ink-900">{dossier.object}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-ink-500">
            <span className="font-mono">{dossier.reference}</span>
            <span>·</span>
            <span>{t(`type.${dossier.type}`)}</span>
            <span>·</span>
            <PhaseBadge phase={dossier.currentPhase} />
            <Badge tone={
              dossier.priority === "urgent" ? "danger"
              : dossier.priority === "high" ? "warning"
              : dossier.priority === "low" ? "neutral"
              : "info"
            }>
              <Flag className="h-3 w-3" />
              {t(`priority.${dossier.priority}`)}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left column: AI panels */}
        <div className="space-y-5 lg:col-span-2">
          <Tabs
            tabs={[
              { key: "summary", label: t("ai.summary.title"), content: <AISummaryPanel dossier={dossier} /> },
              { key: "next", label: t("ai.nextStep.title"), content: <NextStepPanel dossier={dossier} /> },
              { key: "letter", label: t("ai.letter.title"), content: <LetterPanel dossier={dossier} /> },
              { key: "upload", label: t("common.uploadFile"), content: <DocumentUploader dossier={dossier} /> },
            ]}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("common.documents")}</CardTitle>
              <span className="text-xs text-ink-500">{dossier.documents.length}</span>
            </CardHeader>
            <CardBody>
              <DocumentList documents={dossier.documents} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("common.timeline")}</CardTitle>
            </CardHeader>
            <CardBody>
              <PhaseTimeline dossier={dossier} />
            </CardBody>
          </Card>
        </div>

        {/* Right column: dossier facts + alerts */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("dossiers.detail.status")}</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm">
              <FactRow icon={<MapPin className="h-4 w-4" />} label={t("dossiers.detail.wilayaCommune")}>
                {dossier.commune}, {dossier.wilaya}
              </FactRow>
              <FactRow icon={<Users className="h-4 w-4" />} label={t("dossiers.detail.parties")}>
                {dossier.parties.length > 0 ? dossier.parties.join(", ") : "—"}
              </FactRow>
              <FactRow icon={<Maximize2 className="h-4 w-4" />} label={t("dossiers.detail.surface")}>
                {dossier.surfaceM2
                  ? t("dossiers.detail.m2", { n: formatNumber(dossier.surfaceM2, locale) })
                  : "—"}
              </FactRow>
              <FactRow icon={<Banknote className="h-4 w-4" />} label={t("dossiers.detail.value")}>
                {dossier.estimatedValueDzd
                  ? t("dossiers.detail.dzd", { n: formatNumber(dossier.estimatedValueDzd, locale) })
                  : "—"}
              </FactRow>
              <FactRow label={t("common.assignee")}>{dossier.assignee}</FactRow>
              <FactRow label={t("common.created")}>{formatDate(dossier.createdAt, locale)}</FactRow>
              <FactRow label={t("common.updated")}>{formatDateTime(dossier.updatedAt, locale)}</FactRow>
            </CardBody>
          </Card>

          <AlertsPanel dossierId={dossier.id} alerts={dossier.alerts} />
        </div>
      </div>
    </div>
  );
}

function FactRow({
  icon, label, children,
}: { icon?: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      {icon ? <span className="mt-0.5 text-ink-400">{icon}</span> : null}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ink-500">{label}</p>
        <p className="text-sm text-ink-800">{children}</p>
      </div>
    </div>
  );
}
