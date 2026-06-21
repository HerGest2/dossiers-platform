"use client";

import { useState, useRef } from "react";
import { Dossier, ExtractionResult, DocumentKind } from "@/lib/domain/types";
import { getAIProvider } from "@/lib/ai/provider";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useT } from "@/lib/i18n/useT";
import { useDossierStore } from "@/lib/store/dossierStore";
import { Upload, FilePlus, Sparkles } from "lucide-react";
import { ExtractionDiff } from "./ExtractionDiff";

interface Props {
  dossier: Dossier;
}

export function DocumentUploader({ dossier }: Props) {
  const { t, locale } = useT();
  const attachDocument = useDossierStore((s) => s.attachDocument);
  const applyExtractedFields = useDossierStore((s) => s.applyExtractedFields);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<{
    extraction: ExtractionResult;
    docId: string;
    filename: string;
  } | null>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const file = files[0];
      // Read as data URL (kept small for prototype)
      const data = await readAsDataUrl(file);
      const ai = getAIProvider();
      const extraction = await ai.extractDocumentFields(
        { name: file.name, sizeBytes: file.size, mimeType: file.type || "application/octet-stream" },
        dossier,
        locale
      );
      const docId = attachDocument(dossier.id, {
        kind: extraction.detectedDocumentKind,
        filename: file.name,
        data,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        uploadedBy: dossier.assignee,
        extracted: extraction.fields as Record<string, string | number>,
      });
      setLastResult({ extraction, docId, filename: file.name });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-ink-700" />
          <CardTitle className="text-sm">{t("common.uploadFile")}</CardTitle>
        </div>
        <div className="flex items-center gap-1 text-xs text-ink-500">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          {t("common.ai")}
        </div>
      </CardHeader>
      <CardBody className="space-y-3">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            onFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          className={
            "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed p-6 text-center transition-colors " +
            (dragOver
              ? "border-ink-900 bg-ink-50"
              : "border-ink-200 bg-white hover:bg-ink-50")
          }
        >
          <FilePlus className="h-7 w-7 text-ink-400" />
          <p className="text-sm font-medium text-ink-700">{t("common.dragDrop")}</p>
          <p className="text-xs text-ink-500">{t("common.dragDropHint")}</p>
          <input
            ref={inputRef}
            type="file"
            hidden
            onChange={(e) => onFiles(e.target.files)}
            accept=".pdf,.png,.jpg,.jpeg,.txt,application/pdf,image/*,text/plain"
          />
        </div>
        {busy ? (
          <div className="space-y-2">
            <div className="skeleton h-3 w-1/3" />
            <div className="skeleton h-12 w-full" />
          </div>
        ) : null}
        {lastResult ? (
          <ExtractionDiff
            extraction={lastResult.extraction}
            dossier={dossier}
            onApplyAll={() => {
              applyExtractedFields(dossier.id, lastResult.docId);
              setLastResult(null);
            }}
          />
        ) : null}
      </CardBody>
    </Card>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result || ""));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}