// Domain types for property dossiers (Explorations + EKB Privatizations)
// Single source of truth — every AI feature and UI component imports from here.

export type DossierType = "exploration" | "ekb_privatization";

export type Locale = "sq" | "ar" | "en" | "fr";

// Explorations track
export const EXPLORATION_PHASES = [
  "intake",
  "reconnaissance",
  "releve_topographique",
  "analyse_juridique",
  "evaluation_domaniale",
  "validation",
  "cloture",
] as const;
export type ExplorationPhase = (typeof EXPLORATION_PHASES)[number];

// EKB Privatizations track
export const EKB_PHASES = [
  "intake",
  "instruction",
  "commission_evaluation",
  "appel_offres",
  "adjudication",
  "signature_acte",
  "cloture",
] as const;
export type EkbPhase = (typeof EKB_PHASES)[number];

// Union used in storage
export type Phase = ExplorationPhase | EkbPhase;

export type Priority = "low" | "normal" | "high" | "urgent";

export type DocumentKind =
  | "titre_propriete"
  | "plan_cadastral"
  | "releve_topographique"
  | "certificat_urbanisme"
  | "evaluation_domaniale"
  | "pv_reconnaissance"
  | "rapport_juridique"
  | "decision_commission"
  | "cahier_charges"
  | "offre_achat"
  | "pv_adjudication"
  | "acte_signature"
  | "autre";

export interface DossierDocument {
  id: string;
  kind: DocumentKind;
  filename: string;
  /** base64 data URL or empty for mock */
  data: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedBy: string;
  /** Fields extracted by AI at upload time. */
  extracted?: Record<string, string | number>;
  /** Whether user has accepted the AI-extracted values. */
  applied?: boolean;
}

export interface PhaseTransition {
  phase: Phase;
  enteredAt: string;
  exitedAt?: string;
  enteredBy: string;
  note?: string;
}

export type ActivityKind =
  | "created"
  | "phase_advanced"
  | "document_uploaded"
  | "document_extracted"
  | "ai_summary_viewed"
  | "alert_resolved"
  | "note_added"
  | "field_updated";

export interface Activity {
  id: string;
  dossierId: string;
  kind: ActivityKind;
  at: string;
  by: string;
  message: string;
}

export type AlertSeverity = "info" | "warning" | "critical";

export type AlertKind =
  | "stalled"
  | "missing_doc"
  | "approaching_sla"
  | "data_inconsistency"
  | "overdue_action";

export interface Alert {
  id: string;
  dossierId: string;
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  detail: string;
  recommendation: string;
  createdAt: string;
  resolvedAt?: string;
  /** Free-text source language, just for display */
  lang?: Locale;
}

export interface Dossier {
  id: string;
  type: DossierType;
  reference: string;
  object: string; // human-readable title / object of the dossier
  wilaya: string;
  commune: string;
  address?: string;
  surfaceM2?: number;
  estimatedValueDzd?: number;
  parties: string[]; // involved parties (owners, applicants, buyers…)
  currentPhase: Phase;
  phaseHistory: PhaseTransition[];
  priority: Priority;
  assignee: string;
  createdAt: string;
  updatedAt: string;
  documents: DossierDocument[];
  alerts: Alert[];
  notes?: string;
}

// AI input/output shapes
export interface DossierSummary {
  statusParagraph: string;
  missingParagraph: string;
  nextStepParagraph: string;
  /** Facts the AI cited, for the "Show reasoning" disclosure. */
  citedFacts: string[];
  generatedAt: string;
  /** 0..1 mock confidence. */
  confidence: number;
}

export interface ExtractionResult {
  fields: Record<string, string | number | null>;
  /** Field-level confidence. */
  confidence: Record<string, number>;
  /** Mock's "I think this is a..." kind. */
  detectedDocumentKind: DocumentKind;
  /** Notes for the user about extraction quality. */
  notes: string[];
}

export interface NextStepSuggestion {
  recommendedPhase: Phase;
  explanation: string;
  /** Dossier facts that fed the recommendation. */
  citedFacts: string[];
  confidence: number;
}
