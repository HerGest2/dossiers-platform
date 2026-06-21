"use client";

import { Dossier, ExtractionResult, DocumentKind } from "@/lib/domain/types";
import { getAIProvider, documentKindDisplayName } from "@/lib/ai/provider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useT } from "@/lib/i18n/useT";
import { CheckCircle2, ArrowRight, Sparkles, Info } from "lucide-react";

interface Props {
  extraction: ExtractionResult;
  dossier: Dossier;
  onApplyAll: () => void;
}

const FIELD_MAPPING: Record<string, keyof Dossier | "parties"> = {
  wilaya: "wilaya",
  commune: "commune",
  reference: "reference",
  surface_m2: "surfaceM2",
  value_dzd: "estimatedValueDzd",
  date: "reference", // informational only
  parties: "parties",
};

const FIELD_LABELS: Record<string, string> = {
  wilaya: "Wilaya",
  commune: "Commune",
  reference: "Reference",
  surface_m2: "Surface (m²)",
  value_dzd: "Value (DZD)",
  date: "Date",
  parties: "Parties",
};

export function ExtractionDiff({ extraction, dossier, onApplyAll }: Props) {
  const { t } = useT();
  const fields = Object.entries(extraction.fields).filter(
    ([, v]) => v != null && v !== ""
  );

  const currentValueFor = (key: string): string => {
    const map = FIELD_MAPPING[key];
    if (!map) return "—";
    const cur = (dossier as any)[map];
    if (cur == null) return "—";
    if (Array.isArray(cur)) return cur.join(", ");
    return String(cur);
  };

  return (
    <Card className="border-amber-200 bg-amber-50/40">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-semibold text-ink-900">{t("ai.extraction.title")}</p>
          </div>
          <Badge tone="info">
            {t("ai.extraction.detected")}: {documentKindDisplayName(extraction.detectedDocumentKind, "en")}
          </Badge>
        </div>

        <div className="rounded-md border border-ink-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-xs text-ink-600">
              <tr>
                <th className="px-3 py-2 text-start font-medium">Field</th>
                <th className="px-3 py-2 text-start font-medium">{t("ai.extraction.currentValue")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("ai.extraction.extractedValue")}</th>
                <th className="px-3 py-2 text-start font-medium">{t("common.confidence")}</th>
              </tr>
            </thead>
            <tbody>
              {fields.map(([k, v]) => {
                const conf = extraction.confidence[k] ?? 0.5;
                const current = currentValueFor(k);
                const extracted = String(v);
                const diff = current !== "—" && current !== extracted;
                return (
                  <tr key={k} className="border-t border-ink-100">
                    <td className="px-3 py-2 font-medium text-ink-800">{FIELD_LABELS[k] ?? k}</td>
                    <td className="px-3 py-2 text-ink-600">{current}</td>
                    <td className="px-3 py-2 text-ink-900">
                      <span className={diff ? "font-semibold text-emerald-700" : ""}>{extracted}</span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ink-100">
                          <div
                            className="h-full bg-amber-500"
                            style={{ width: `${Math.round(conf * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-ink-600">{Math.round(conf * 100)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {extraction.notes.length > 0 ? (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-2 text-xs text-blue-800">
            <div className="flex items-center gap-1 font-medium">
              <Info className="h-3.5 w-3.5" />
              {t("ai.extraction.notes")}
            </div>
            <ul className="list-disc ps-5 mt-1">
              {extraction.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <Button onClick={onApplyAll}>
            <CheckCircle2 className="h-4 w-4" />
            {t("common.applyAll")}
          </Button>
        </div>
      </div>
    </Card>
  );
}