"use client";

import { useEffect, useState } from "react";
import { Dossier, NextStepSuggestion } from "@/lib/domain/types";
import { getAIProvider, phaseDisplayName } from "@/lib/ai/provider";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/useT";
import { useDossierStore } from "@/lib/store/dossierStore";
import { ArrowRight, Brain, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Props {
  dossier: Dossier;
}

export function NextStepPanel({ dossier }: Props) {
  const { t, locale } = useT();
  const advancePhase = useDossierStore((s) => s.advancePhase);
  const [suggestion, setSuggestion] = useState<NextStepSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);

  const generate = async () => {
    setLoading(true);
    setApplied(false);
    try {
      const ai = getAIProvider();
      const out = await ai.suggestNextStep(dossier, locale);
      setSuggestion(out);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dossier.id, dossier.currentPhase, locale]);

  const onAdvance = () => {
    if (!suggestion || suggestion.recommendedPhase === dossier.currentPhase) return;
    advancePhase(dossier.id, suggestion.recommendedPhase, suggestion.explanation);
    setApplied(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <CardTitle className="text-sm">{t("ai.nextStep.title")}</CardTitle>
        </div>
        <Button variant="ghost" size="sm" onClick={generate} loading={loading}>
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardBody className="space-y-3">
        {loading && !suggestion ? (
          <div className="skeleton h-16 w-full" />
        ) : suggestion ? (
          <>
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-wide text-ink-500">
                {t("common.detail")}
              </span>
              <span className="rounded-md bg-ink-900 px-2 py-0.5 text-xs font-medium text-white">
                {phaseDisplayName(suggestion.recommendedPhase, locale)}
              </span>
            </div>
            <p className="text-sm text-ink-800 leading-relaxed">
              {suggestion.explanation}
            </p>
            <div className="flex items-center justify-between text-xs text-ink-500 pt-2 border-t border-ink-100">
              <span>
                {t("common.confidence")} {(suggestion.confidence * 100).toFixed(0)}%
              </span>
              <button
                onClick={() => setShowReasoning((v) => !v)}
                className="inline-flex items-center gap-1 text-ink-600 hover:text-ink-900"
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
                  {suggestion.citedFacts.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {suggestion.recommendedPhase !== dossier.currentPhase ? (
              <Button
                onClick={onAdvance}
                disabled={applied}
                className={cn("w-full")}
              >
                <ArrowRight className="h-4 w-4" />
                {applied ? t("common.confirm") : t("ai.nextStep.advance")}
              </Button>
            ) : null}
          </>
        ) : null}
      </CardBody>
    </Card>
  );
}