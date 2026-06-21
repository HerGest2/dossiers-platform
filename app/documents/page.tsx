"use client";

import { useState } from "react";
import { useDossierStore } from "@/lib/store/dossierStore";
import { useT } from "@/lib/i18n/useT";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { DocumentUploader } from "@/components/documents/DocumentUploader";
import { Empty } from "@/components/ui/Empty";
import { FileText, Upload } from "lucide-react";

export default function DocumentsPage() {
  const { t } = useT();
  const dossiers = useDossierStore((s) => s.dossiers);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = selectedId ? dossiers.find((d) => d.id === selectedId) : null;
  const recentDocs = dossiers
    .flatMap((d) => d.documents.map((doc) => ({ ...doc, dossierRef: d.reference, dossierObject: d.object, dossierId: d.id })))
    .sort((a, b) => +new Date(b.uploadedAt) - +new Date(a.uploadedAt))
    .slice(0, 10);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gradient">{t("documents.title")}</h1>
        <p className="text-sm text-ink-500 mt-1">{t("documents.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">{t("common.uploadFile")}</CardTitle>
          </CardHeader>
          <CardBody>
            {!selected ? (
              <div className="space-y-2">
                <p className="text-sm text-ink-600">{t("common.recent")} dossiers:</p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {dossiers.slice(0, 6).map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedId(d.id)}
                      className="rounded-md border border-ink-200 bg-white p-3 text-start text-sm hover:bg-ink-50"
                    >
                      <p className="font-mono text-xs text-ink-500">{d.reference}</p>
                      <p className="font-medium text-ink-800 line-clamp-1">{d.object}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between rounded-md bg-blue-50 border border-blue-200 p-2 text-sm">
                  <span>
                    {selected.reference} · {selected.object}
                  </span>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="text-xs text-blue-700 hover:underline"
                  >
                    {t("common.back")}
                  </button>
                </div>
                <DocumentUploader dossier={selected} />
              </>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("documents.recent")}</CardTitle>
          </CardHeader>
          <CardBody>
            {recentDocs.length === 0 ? (
              <Empty title={t("documents.empty")} icon={<FileText className="h-8 w-8" />} />
            ) : (
              <ul className="space-y-2">
                {recentDocs.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-start gap-2 rounded-md border border-ink-200 bg-white p-2"
                  >
                    <Upload className="mt-0.5 h-3.5 w-3.5 text-ink-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-ink-800">{d.filename}</p>
                      <p className="truncate text-xs text-ink-500">{d.dossierRef}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}