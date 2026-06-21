"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDossierStore } from "@/lib/store/dossierStore";
import { useT } from "@/lib/i18n/useT";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DossierType, Priority } from "@/lib/domain/types";

const WILAYAS = [
  "Alger", "Blida", "Boumerdès", "Tipaza", "Bouira", "Médéa",
];

export default function NewDossierPage() {
  const { t } = useT();
  const router = useRouter();
  const createDossier = useDossierStore((s) => s.createDossier);
  const [type, setType] = useState<DossierType>("exploration");
  const [reference, setReference] = useState("");
  const [object, setObject] = useState("");
  const [wilaya, setWilaya] = useState("Alger");
  const [commune, setCommune] = useState("");
  const [address, setAddress] = useState("");
  const [surface, setSurface] = useState<string>("");
  const [value, setValue] = useState<string>("");
  const [parties, setParties] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [assignee, setAssignee] = useState("A. Khelifi");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reference.trim() || !object.trim() || !commune.trim()) return;
    const id = createDossier({
      type,
      reference: reference.trim(),
      object: object.trim(),
      wilaya,
      commune: commune.trim(),
      address: address.trim() || undefined,
      surfaceM2: surface ? Number(surface) : undefined,
      estimatedValueDzd: value ? Number(value) : undefined,
      parties: parties.split(",").map((p) => p.trim()).filter(Boolean),
      priority,
      assignee,
    });
    router.push(`/dossiers/${id}`);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t("common.newDossier")}</h1>
        <p className="text-sm text-ink-500 mt-1">
          {t("app.tagline")}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">1 · Type & référence</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label={t("common.detail")}>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as DossierType)}
                className="input"
              >
                <option value="exploration">{t("type.exploration")}</option>
                <option value="ekb_privatization">{t("type.ekb_privatization")}</option>
              </select>
            </Field>
            <Field label={t("common.reference")} required>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="EXP-2026-0001"
                className="input"
                required
              />
            </Field>
            <Field label={t("dossiers.detail.object")} required className="md:col-span-2">
              <input
                value={object}
                onChange={(e) => setObject(e.target.value)}
                placeholder="Exploration / Cession…"
                className="input"
                required
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">2 · Localisation</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label={t("common.wilaya")} required>
              <select value={wilaya} onChange={(e) => setWilaya(e.target.value)} className="input">
                {WILAYAS.map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </Field>
            <Field label={t("common.commune")} required>
              <input
                value={commune}
                onChange={(e) => setCommune(e.target.value)}
                className="input"
                required
              />
            </Field>
            <Field label={t("common.description")}>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="input"
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">3 · Caractéristiques</CardTitle>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label={t("dossiers.detail.surface") + " (m²)"}>
              <input
                type="number"
                value={surface}
                onChange={(e) => setSurface(e.target.value)}
                className="input"
                placeholder="0"
              />
            </Field>
            <Field label={t("dossiers.detail.value") + " (DZD)"}>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="input"
                placeholder="0"
              />
            </Field>
            <Field label={t("dossiers.detail.priority")}>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="input"
              >
                <option value="low">{t("priority.low")}</option>
                <option value="normal">{t("priority.normal")}</option>
                <option value="high">{t("priority.high")}</option>
                <option value="urgent">{t("priority.urgent")}</option>
              </select>
            </Field>
            <Field label={t("dossiers.detail.parties")} className="md:col-span-3">
              <input
                value={parties}
                onChange={(e) => setParties(e.target.value)}
                placeholder="Nom 1, Nom 2, ..."
                className="input"
              />
            </Field>
            <Field label={t("common.assignee")} className="md:col-span-3">
              <input
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="input"
              />
            </Field>
          </CardBody>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => router.push("/dossiers")}>
            {t("common.cancel")}
          </Button>
          <Button type="submit">
            {t("common.createDossier")}
          </Button>
        </div>
      </form>

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.375rem;
          border: 1px solid #e2e8f0;
          background: #fff;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
        .input:focus {
          outline: none;
          ring: 2px;
          border-color: #94a3b8;
        }
      `}</style>
    </div>
  );
}

function Field({
  label, required, children, className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 ${className ?? ""}`}>
      <span className="text-xs font-medium text-ink-600">
        {label} {required ? <span className="text-danger-600">*</span> : null}
      </span>
      {children}
    </label>
  );
}
