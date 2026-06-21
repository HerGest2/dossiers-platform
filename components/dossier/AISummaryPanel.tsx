"use client";

import { useEffect, useState } from "react";
import { Dossier, DossierSummary } from "@/lib/domain/types";
import { getAIProvider } from "@/lib/ai/provider";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/useT";
import { useDossierStore } from "@/lib/store/dossierStore";
import { Sparkles, RefreshCw, ChevronDown, ChevronUp, Brain } from "lucide-react";
import { formatDateTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

interface Props {
  dossier: Dossier;
}

export function AISummaryPanel({ dossier }: Props) {
  const { t, locale } = useT();
  const recordActivity = useDossierStore((s) => s.recordActivity);
  const [summary, setSummary] = useState<DossierSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReasoning, setShowReasoning] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const ai = getAIProvider();
      const out = await ai.summarizeDossier(dossier, locale);
      setSummary(out);
      recordActivity({
        dossierId: dossier.id,
        kind: "ai_summary_viewed",
        by: dossier.assignee,
        message: t("activity.ai_summary_viewed"),
      });
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!summary || summary.citedFacts[0]?.includes(dossier.currentPhase) === false) {
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dossier.id, dossier.currentPhase, locale]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <CardTitle className="text-sm">{t("ai.summary.title")}</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={generate}
          loading={loading}
          aria-label={t("ai.summary.refresh")}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t("ai.summary.refresh")}
        </Button>
      </CardHeader>
      <CardBody className="space-y-4">
        {error ? (
          <p className="text-sm text-danger-700">{error}</p>
        ) : loading && !summary ? (
          <div className="space-y-2">
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </div>
        ) : summary ? (
          <>
            <Section
              title={t("ai.summary.status")}
              body={summary.statusParagraph}
              color="bg-blue-50 border-blue-100"
            />
            <Section
              title={t("ai.summary.missing")}
              body={summary.missingParagraph}
              color="bg-amber-50 border-amber-100"
            />
            <Section
              title={t("ai.summary.next")}
              body={summary.nextStepParagraph}
              color="bg-emerald-50 border-emerald-100"
            />
            <div className="flex items-center justify-between pt-2 border-t border-ink-100">
              <p className="text-xs text-ink-500">
                {t("ai.summary.generated", { date: formatDateTime(summary.generatedAt, locale) })}{" "}
                · {t("common.confidence")} {(summary.confidence * 100).toFixed(0)}%
              </p>
              <button
                onClick={() => setShowReasoning((v) => !v)}
                className="inline-flex items-center gap-1 text-xs text-ink-600 hover:text-ink-900"
              >
                <Brain className="h-3.5 w-3.5" />
                {showReasoning ? t("common.hideReasoning") : t("common.showReasoning")}
                {showReasoning ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
            {showReasoning ? (
              <div className="rounded-md border border-ink-200 bg-ink-50 p-3 text-xs text-ink-700">
                <p className="font-medium text-ink-800 mb-1">{t("common.citedFacts")}</p>
                <ul className="list-disc ps-5 space-y-0.5">
                  {summary.citedFacts.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : null}
      </CardBody>
    </Card>
  );
}

function Section({ title, body, color }: { title: string; body: string; color: string }) {
  return (
    <div className={cn("rounded-md border p-3", color)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-700 mb-1">{title}</p>
      <p className="text-sm text-ink-800 leading-relaxed">{body}</p>
    </div>
  );
}

function Skeleton() {
  return <div className="skeleton h-12 w-full" />;
}