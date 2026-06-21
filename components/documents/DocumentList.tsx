"use client";

import { Dossier, DossierDocument } from "@/lib/domain/types";
import { documentKindDisplayName } from "@/lib/ai/provider";
import { useT } from "@/lib/i18n/useT";
import { formatBytes, formatDate } from "@/lib/utils/format";
import { Badge } from "@/components/ui/Badge";
import { FileText, CheckCircle2, Download } from "lucide-react";

interface Props {
  documents: DossierDocument[];
}

export function DocumentList({ documents }: Props) {
  const { t, locale } = useT();
  if (documents.length === 0) {
    return (
      <p className="text-sm text-ink-500 italic">{t("dossiers.detail.noDocuments")}</p>
    );
  }
  return (
    <ul className="divide-y divide-ink-100 rounded-md border border-ink-200 bg-white">
      {documents.map((d) => (
        <li key={d.id} className="flex items-center justify-between gap-3 p-3">
          <div className="flex min-w-0 items-start gap-3">
            <FileText className="mt-0.5 h-4 w-4 text-ink-400" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink-900">{d.filename}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                <span>{documentKindDisplayName(d.kind, locale)}</span>
                <span>·</span>
                <span>{formatBytes(d.sizeBytes, locale)}</span>
                <span>·</span>
                <span>{formatDate(d.uploadedAt, locale)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {d.applied ? (
              <Badge tone="success">
                <CheckCircle2 className="h-3 w-3" />
                {t("ai.extraction.applied")}
              </Badge>
            ) : null}
            {d.data ? (
              <a
                href={d.data}
                download={d.filename}
                className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-800"
                title={t("common.download")}
              >
                <Download className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}