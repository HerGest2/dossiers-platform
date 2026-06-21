"use client";

import { Alert, AlertSeverity } from "@/lib/domain/types";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/useT";
import { useDossierStore } from "@/lib/store/dossierStore";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import { Empty } from "@/components/ui/Empty";
import { cn } from "@/lib/utils/cn";

interface Props {
  dossierId: string;
  alerts: Alert[];
}

const severityMeta: Record<
  AlertSeverity,
  { tone: "info" | "warning" | "danger"; ringClass: string; bgClass: string; textClass: string; icon: typeof Info }
> = {
  info: {
    tone: "info",
    ringClass: "border-blue-200",
    bgClass: "bg-blue-50",
    textClass: "text-blue-700",
    icon: Info,
  },
  warning: {
    tone: "warning",
    ringClass: "border-warn-200",
    bgClass: "bg-warn-50",
    textClass: "text-warn-700",
    icon: AlertTriangle,
  },
  critical: {
    tone: "danger",
    ringClass: "border-danger-200",
    bgClass: "bg-danger-50",
    textClass: "text-danger-700",
    icon: ShieldAlert,
  },
};

export function AlertsPanel({ dossierId, alerts }: Props) {
  const { t } = useT();
  const resolveAlert = useDossierStore((s) => s.resolveAlert);
  const open = alerts.filter((a) => !a.resolvedAt);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <CardTitle className="text-sm">{t("alerts.title")}</CardTitle>
        </div>
        <Badge tone={open.length > 0 ? "warning" : "success"}>
          {open.length}
        </Badge>
      </CardHeader>
      <CardBody className="space-y-3">
        {open.length === 0 ? (
          <Empty
            title={t("alerts.empty")}
            icon={<CheckCircle2 className="h-8 w-8 text-emerald-500" />}
          />
        ) : (
          open.map((a) => {
            const m = severityMeta[a.severity];
            const Icon = m.icon;
            return (
              <div key={a.id} className={cn("rounded-md border p-3", m.ringClass, m.bgClass)}>
                <div className="flex items-start gap-3">
                  <Icon className={cn("mt-0.5 h-4 w-4", m.textClass)} />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-ink-900">{a.title}</p>
                      <Badge tone={m.tone}>{t(`alerts.severity.${a.severity}`)}</Badge>
                    </div>
                    <p className="text-xs text-ink-600">{a.detail}</p>
                    <p className="text-xs">
                      <span className="font-semibold text-ink-800">
                        {t("common.recommendation")}:{" "}
                      </span>
                      <span className="text-ink-700">{a.recommendation}</span>
                    </p>
                    <div className="pt-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => resolveAlert(dossierId, a.id)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t("alerts.resolve")}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardBody>
    </Card>
  );
}