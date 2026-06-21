"use client";

import { useState } from "react";
import { useDossierStore } from "@/lib/store/dossierStore";
import { useT } from "@/lib/i18n/useT";
import { LOCALES, LOCALE_LABELS, LOCALE_FLAGS } from "@/lib/i18n/config";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Globe, Database, Sparkles, AlertTriangle } from "lucide-react";
import { Locale } from "@/lib/domain/types";
import { cn } from "@/lib/utils/cn";

export default function SettingsPage() {
  const { t } = useT();
  const locale = useDossierStore((s) => s.locale);
  const setLocale = useDossierStore((s) => s.setLocale);
  const resetToSeed = useDossierStore((s) => s.resetToSeed);
  const clearAll = useDossierStore((s) => s.clearAll);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gradient">{t("settings.title")}</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <CardTitle className="text-sm">{t("settings.language")}</CardTitle>
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap gap-2">
            {LOCALES.map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition-all",
                  l === locale
                    ? "border-transparent bg-brand-gradient text-white shadow-brand"
                    : "border-ink-200 bg-white text-ink-700 hover:border-brand-200 hover:bg-brand-50"
                )}
              >
                <span className="text-base leading-none">{LOCALE_FLAGS[l as Locale]}</span>
                {LOCALE_LABELS[l as Locale]}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <CardTitle className="text-sm">{t("settings.data")}</CardTitle>
          </div>
        </CardHeader>
        <CardBody className="space-y-2">
          <Button onClick={() => setConfirmReset(true)} variant="secondary">
            {t("settings.resetSeed")}
          </Button>
          <Button onClick={() => setConfirmClear(true)} variant="danger">
            <AlertTriangle className="h-4 w-4" />
            {t("settings.clearAll")}
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-sm">{t("settings.about")}</CardTitle>
          </div>
        </CardHeader>
        <CardBody className="space-y-2 text-sm text-ink-700">
          <p>
            {t("settings.aboutBody", {
              provider: "MockAI",
            })}
          </p>
          <p className="text-xs text-ink-500">
            {t("settings.swapProvider", {
              file: "lib/ai/provider.ts",
              className: "ClaudeProvider",
            })}
          </p>
        </CardBody>
      </Card>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title={t("settings.resetSeed")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                resetToSeed();
                setConfirmReset(false);
              }}
            >
              {t("common.confirm")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-700">{t("settings.resetConfirm")}</p>
      </Modal>

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title={t("settings.clearAll")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmClear(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                clearAll();
                setConfirmClear(false);
              }}
            >
              {t("common.confirm")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-700">{t("settings.clearAll")}</p>
      </Modal>
    </div>
  );
}