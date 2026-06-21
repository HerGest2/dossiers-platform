"use client";

import { useState } from "react";
import { Dossier } from "@/lib/domain/types";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useT } from "@/lib/i18n/useT";
import { useDossierStore } from "@/lib/store/dossierStore";
import { missingRequiredDocs } from "@/lib/domain/workflow";
import { formatDate, formatDzd, formatNumber } from "@/lib/utils/format";
import {
  FileSignature,
  Sparkles,
  Copy,
  Check,
  Download,
  Printer,
  Paperclip,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

type LetterType = "notification" | "decision" | "request_documents";

interface Props {
  dossier: Dossier;
}

const TYPES: LetterType[] = ["notification", "decision", "request_documents"];

export function LetterPanel({ dossier }: Props) {
  const { t, locale } = useT();
  const attachDocument = useDossierStore((s) => s.attachDocument);
  const recordActivity = useDossierStore((s) => s.recordActivity);

  const [type, setType] = useState<LetterType>("notification");
  const [letter, setLetter] = useState<string>("");
  const [generated, setGenerated] = useState<"claude" | "template" | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [attached, setAttached] = useState(false);

  const buildFields = () => ({
    reference: dossier.reference,
    typeLabel: t(`type.${dossier.type}`),
    object: dossier.object,
    location: `${dossier.commune}, ${dossier.wilaya}`,
    phaseLabel: t(`phase.${dossier.currentPhase}`),
    parties: dossier.parties,
    surface:
      dossier.surfaceM2 != null
        ? t("dossiers.detail.m2", { n: formatNumber(dossier.surfaceM2, locale) })
        : undefined,
    value: dossier.estimatedValueDzd != null ? formatDzd(dossier.estimatedValueDzd, locale) : undefined,
    missing: missingRequiredDocs(dossier).map((k) => t(`doc.${k}`)),
    date: formatDate(new Date().toISOString(), locale),
    assignee: dossier.assignee,
  });

  const generate = async () => {
    setLoading(true);
    setAttached(false);
    try {
      const res = await fetch("/api/letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ letterType: type, locale, fields: buildFields() }),
      });
      const data = (await res.json()) as { letter?: string; generated?: "claude" | "template" };
      if (data.letter) {
        setLetter(data.letter);
        setGenerated(data.generated ?? "template");
      }
    } catch {
      // Network failure: nothing to show; keep any existing draft.
    } finally {
      setLoading(false);
    }
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  const filename = `${type}-${dossier.reference}.txt`;

  const onDownload = () => {
    const blob = new Blob([letter], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onPrint = () => {
    const w = window.open("", "_blank", "width=720,height=900");
    if (!w) return;
    const safe = letter.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
    w.document.write(
      `<html><head><title>${filename}</title></head>` +
        `<body style="margin:40px;font-family:Georgia,'Times New Roman',serif;">` +
        `<pre style="white-space:pre-wrap;font-family:inherit;font-size:14px;line-height:1.6;">${safe}</pre>` +
        `</body></html>`
    );
    w.document.close();
    w.focus();
    w.print();
  };

  const onAttach = () => {
    attachDocument(dossier.id, {
      kind: "autre",
      filename,
      data: "",
      mimeType: "text/plain",
      sizeBytes: new Blob([letter]).size,
      uploadedBy: dossier.assignee,
    });
    recordActivity({
      dossierId: dossier.id,
      kind: "note_added",
      by: dossier.assignee,
      message: `${t(`ai.letter.type.${type}`)} — ${filename}`,
    });
    setAttached(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileSignature className="h-4 w-4 text-brand-500" />
          <CardTitle className="text-sm">{t("ai.letter.title")}</CardTitle>
        </div>
        {generated ? (
          <Badge tone={generated === "claude" ? "info" : "neutral"}>
            <Sparkles className="h-3 w-3" />
            {t(`ai.letter.source.${generated}`)}
          </Badge>
        ) : null}
      </CardHeader>
      <CardBody className="space-y-3">
        {/* Letter type selector */}
        <div className="flex flex-wrap gap-1.5">
          {TYPES.map((tp) => (
            <button
              key={tp}
              onClick={() => setType(tp)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                type === tp
                  ? "border-brand-300 bg-brand-50 text-brand-700"
                  : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50"
              )}
            >
              {t(`ai.letter.type.${tp}`)}
            </button>
          ))}
        </div>

        <Button onClick={generate} loading={loading} size="sm">
          <Sparkles className="h-3.5 w-3.5" />
          {letter ? t("ai.letter.regenerate") : t("ai.letter.generate")}
        </Button>

        {letter ? (
          <>
            <textarea
              dir="auto"
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
              rows={16}
              className="w-full rounded-md border border-ink-200 bg-white p-3 font-mono text-xs leading-relaxed text-ink-800 focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
            <p className="text-[11px] text-ink-500">{t("ai.letter.editableHint")}</p>

            <div className="flex items-start gap-1.5 rounded-md bg-warn-50 px-2.5 py-1.5 text-[11px] text-warn-700">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {t("ai.letter.disclaimer")}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="secondary" size="sm" onClick={onCopy}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? t("ai.letter.copied") : t("ai.letter.copy")}
              </Button>
              <Button variant="secondary" size="sm" onClick={onDownload}>
                <Download className="h-3.5 w-3.5" />
                {t("common.download")}
              </Button>
              <Button variant="secondary" size="sm" onClick={onPrint}>
                <Printer className="h-3.5 w-3.5" />
                {t("ai.letter.print")}
              </Button>
              <Button variant="secondary" size="sm" onClick={onAttach} disabled={attached}>
                {attached ? <Check className="h-3.5 w-3.5" /> : <Paperclip className="h-3.5 w-3.5" />}
                {attached ? t("ai.letter.attached") : t("ai.letter.attach")}
              </Button>
            </div>
          </>
        ) : null}
      </CardBody>
    </Card>
  );
}
