"use client";

import Link from "next/link";
import { useDossierStore, selectOpenAlerts } from "@/lib/store/dossierStore";
import { useT } from "@/lib/i18n/useT";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DossierCard } from "@/components/dossier/DossierCard";
import { Button } from "@/components/ui/Button";
import { Empty } from "@/components/ui/Empty";
import {
  AlertTriangle, FolderOpen, ShieldAlert, TrendingUp, ArrowRight, Sparkles, CheckCircle2
} from "lucide-react";
import { daysInCurrentPhase, sortAlertsBySeverity } from "@/lib/domain/workflow";
import { Dossier } from "@/lib/domain/types";
import { cn } from "@/lib/utils/cn";

export default function DashboardPage() {
  const { t, locale } = useT();
  const dossiers = useDossierStore((s) => s.dossiers);
  const openAlerts = useDossierStore(selectOpenAlerts);
  const recent = [...dossiers]
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, 6);
  const critical = sortAlertsBySeverity(openAlerts).slice(0, 5);

  const avgDays = dossiers.length
    ? Math.round(
        dossiers.reduce((sum, d) => sum + daysInCurrentPhase(d), 0) / dossiers.length
      )
    : 0;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-ink-200/80 bg-white/90 p-6 shadow-card backdrop-blur-sm sm:p-8">
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
              <Sparkles className="h-3.5 w-3.5" />
              {t("app.name")}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">{t("dashboard.title")}</h1>
            <p className="mt-1 text-sm text-ink-500">{t("app.tagline")}</p>
          </div>
          <Link href="/dossiers">
            <Button variant="secondary">
              {t("dashboard.viewAll")}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard
          icon={<FolderOpen className="h-5 w-5" />}
          label={t("dashboard.totalDossiers")}
          value={dossiers.length}
          gradient="from-blue-500 to-indigo-600"
        />
        <KpiCard
          icon={<ShieldAlert className="h-5 w-5" />}
          label={t("dashboard.openAlerts")}
          value={openAlerts.length}
          gradient="from-amber-500 to-orange-600"
        />
        <KpiCard
          icon={<TrendingUp className="h-5 w-5" />}
          label={t("dashboard.avgDays")}
          value={`${avgDays}`}
          gradient="from-emerald-500 to-teal-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">{t("dashboard.criticalAlerts")}</CardTitle>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardBody>
            {critical.length === 0 ? (
              <Empty
                title={t("dashboard.noAlerts")}
                icon={<CheckCircle2 className="h-8 w-8 text-emerald-500" />}
              />
            ) : (
              <ul className="space-y-2">
                {critical.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/dossiers/${a.dossierId}`}
                      className="flex items-center justify-between rounded-md border border-ink-200 bg-white p-3 hover:bg-ink-50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <AlertTriangle
                          className={cn(
                            "h-4 w-4",
                            a.severity === "critical"
                              ? "text-danger-600"
                              : a.severity === "warning"
                              ? "text-warn-600"
                              : "text-blue-600"
                          )}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink-900 truncate">{a.title}</p>
                          <p className="text-xs text-ink-500 truncate">{a.recommendation}</p>
                        </div>
                      </div>
                      <Badge
                        tone={
                          a.severity === "critical"
                            ? "danger"
                            : a.severity === "warning"
                            ? "warning"
                            : "info"
                        }
                      >
                        {t(`alerts.severity.${a.severity}`)}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("dashboard.byPhase")}</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            <ByPhaseBar dossiers={dossiers} />
          </CardBody>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">{t("dashboard.recentDossiers")}</h2>
          <Link href="/dossiers" className="text-xs text-ink-600 hover:text-ink-900">
            {t("dashboard.viewAll")} →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {recent.map((d) => (
            <DossierCard key={d.id} dossier={d} />
          ))}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon, label, value, gradient,
}: { icon: React.ReactNode; label: string; value: string | number; gradient: string }) {
  return (
    <Card className="card-hover overflow-hidden hover:shadow-brand-lg">
      <CardBody className="flex items-center gap-4">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md",
            gradient
          )}
        >
          {icon}
        </div>
        <div>
          <p className="text-xs font-medium text-ink-500">{label}</p>
          <p className="text-3xl font-extrabold tracking-tight text-ink-900">{value}</p>
        </div>
      </CardBody>
    </Card>
  );
}

function ByPhaseBar({ dossiers }: { dossiers: Dossier[] }) {
  const { t } = useT();
  const counts: Record<string, number> = {};
  for (const d of dossiers) counts[d.currentPhase] = (counts[d.currentPhase] ?? 0) + 1;
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, n]) => n));
  return (
    <div className="space-y-2">
      {entries.map(([phase, n]) => (
        <div key={phase} className="space-y-0.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink-700">{t(`phase.${phase}` as any)}</span>
            <span className="text-ink-500">{n}</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-fuchsia-500 transition-all"
              style={{ width: `${(n / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
