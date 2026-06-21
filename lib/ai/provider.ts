// AI provider boundary. MockAI implements this locally; a real Claude
// provider would be a one-file swap that returns the same shapes.

import {
  Dossier,
  DossierSummary,
  ExtractionResult,
  NextStepSuggestion,
  Alert,
  DocumentKind,
  Phase,
  Locale,
} from "@/lib/domain/types";

export interface AIProvider {
  /** Generate a 3-paragraph summary of a dossier's current state. */
  summarizeDossier(dossier: Dossier, locale: Locale): Promise<DossierSummary>;

  /** Extract structured fields from an uploaded document. */
  extractDocumentFields(
    file: { name: string; sizeBytes: number; mimeType: string },
    existing: Partial<Dossier>,
    locale: Locale
  ): Promise<ExtractionResult>;

  /** Recommend the next phase transition with reasoning. */
  suggestNextStep(
    dossier: Dossier,
    locale: Locale
  ): Promise<NextStepSuggestion>;

  /** Re-evaluate a dossier for fresh alerts (rule engine + AI annotation). */
  annotateAlerts(alerts: Alert[], locale: Locale): Promise<Alert[]>;
}

import { MockAI } from "./mock";

let provider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!provider) provider = new MockAI();
  return provider;
}

// Localize a Phase enum value into a human string.
export function phaseDisplayName(phase: Phase, locale: Locale): string {
  const map: Record<Phase, Record<string, string>> = {
    intake: { sq: "Pranimi fillestar", fr: "Instruction initiale", ar: "الاستلام", en: "Intake" },
    reconnaissance: { sq: "Njohja", fr: "Reconnaissance", ar: "المعاينة", en: "Reconnaissance" },
    releve_topographique: { sq: "Matje topografike", fr: "Relevé topographique", ar: "الرفع الطبوغرافي", en: "Topographic survey" },
    analyse_juridique: { sq: "Analizë juridike", fr: "Analyse juridique", ar: "التحليل القانوني", en: "Legal analysis" },
    evaluation_domaniale: { sq: "Vlerësim pronësor", fr: "Évaluation domaniale", ar: "التقييم العقاري", en: "Domanial evaluation" },
    validation: { sq: "Validimi", fr: "Validation", ar: "المصادقة", en: "Validation" },
    cloture: { sq: "Mbyllja", fr: "Clôture", ar: "الإغلاق", en: "Closure" },
    instruction: { sq: "Instruktimi", fr: "Instruction", ar: "التعليم", en: "Instruction" },
    commission_evaluation: { sq: "Komisioni i vlerësimit", fr: "Commission d'évaluation", ar: "لجنة التقييم", en: "Evaluation commission" },
    appel_offres: { sq: "Ftesë për oferta", fr: "Appel d'offres", ar: "العرض", en: "Call for tenders" },
    adjudication: { sq: "Adjudikimi", fr: "Adjudication", ar: "الترسية", en: "Award" },
    signature_acte: { sq: "Nënshkrimi i aktit", fr: "Signature de l'acte", ar: "توقيع العقد", en: "Act signature" },
  };
  return map[phase]?.[locale] ?? map[phase]?.sq ?? phase;
}

export function documentKindDisplayName(
  kind: DocumentKind,
  locale: Locale
): string {
  const map: Record<DocumentKind, Record<string, string>> = {
    titre_propriete: { sq: "Titulli i pronësisë", fr: "Titre de propriété", ar: "سند الملكية", en: "Title deed" },
    plan_cadastral: { sq: "Plani kadastral", fr: "Plan cadastral", ar: "المخطط العقاري", en: "Cadastral plan" },
    releve_topographique: { sq: "Matje topografike", fr: "Relevé topographique", ar: "الرفع الطبوغرافي", en: "Topographic survey" },
    certificat_urbanisme: { sq: "Certifikatë urbanistike", fr: "Certificat d'urbanisme", ar: "شهادة التعمير", en: "Urbanism certificate" },
    evaluation_domaniale: { sq: "Vlerësim pronësor", fr: "Évaluation domaniale", ar: "التقييم العقاري", en: "Domanial evaluation" },
    pv_reconnaissance: { sq: "Procesverbal njohjeje", fr: "PV de reconnaissance", ar: "محضر المعاينة", en: "Reconnaissance report" },
    rapport_juridique: { sq: "Raport juridik", fr: "Rapport juridique", ar: "تقرير قانوني", en: "Legal report" },
    decision_commission: { sq: "Vendim komisioni", fr: "Décision de commission", ar: "قرار اللجنة", en: "Commission decision" },
    cahier_charges: { sq: "Specifikimet", fr: "Cahier des charges", ar: "دفتر الشروط", en: "Specifications" },
    offre_achat: { sq: "Ofertë blerjeje", fr: "Offre d'achat", ar: "عرض الشراء", en: "Purchase offer" },
    pv_adjudication: { sq: "Procesverbal adjudikimi", fr: "PV d'adjudication", ar: "محضر الترسية", en: "Award report" },
    acte_signature: { sq: "Akt i nënshkruar", fr: "Acte signé", ar: "العقد الموقع", en: "Signed act" },
    autre: { sq: "Tjetër", fr: "Autre", ar: "آخر", en: "Other" },
  };
  return map[kind]?.[locale] ?? map[kind]?.sq ?? kind;
}
