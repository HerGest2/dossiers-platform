"use client";

import { Dossier } from "@/lib/domain/types";
import { DossierCard } from "./DossierCard";
import { Empty } from "@/components/ui/Empty";
import { FileSearch } from "lucide-react";
import { useT } from "@/lib/i18n/useT";

interface Props {
  dossiers: Dossier[];
}

export function DossierList({ dossiers }: Props) {
  const { t } = useT();
  if (dossiers.length === 0) {
    return (
      <Empty
        title={t("dossiers.empty")}
        icon={<FileSearch className="h-8 w-8" />}
      />
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {dossiers.map((d) => (
        <DossierCard key={d.id} dossier={d} />
      ))}
    </div>
  );
}