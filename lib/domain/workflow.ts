// Workflow rules: phase ordering, required docs per phase, alert thresholds.
// Centralized so AI suggestions and UI both speak the same language.

import {
  Dossier,
  DossierType,
  DocumentKind,
  Phase,
  EXPLORATION_PHASES,
  EKB_PHASES,
  Alert,
  AlertKind,
  AlertSeverity,
} from "./types";

export function phasesFor(type: DossierType): readonly Phase[] {
  return type === "exploration" ? EXPLORATION_PHASES : EKB_PHASES;
}

export function nextPhases(dossier: Dossier): Phase[] {
  const all = phasesFor(dossier.type);
  const idx = all.indexOf(dossier.currentPhase);
  if (idx < 0 || idx >= all.length - 1) return [];
  // Allow skipping by at most one phase forward, or going back one phase.
  const out: Phase[] = [];
  if (idx + 1 < all.length) out.push(all[idx + 1]);
  if (idx + 2 < all.length) out.push(all[idx + 2]);
  if (idx - 1 >= 0) out.push(all[idx - 1]);
  return out;
}

export function previousPhases(dossier: Dossier): Phase[] {
  const all = phasesFor(dossier.type);
  const idx = all.indexOf(dossier.currentPhase);
  if (idx <= 0) return [];
  return [all[idx - 1]];
}

// Required document kinds per phase. The dossier is "blocked" on the
// phase if any of these are missing.
const REQUIRED_DOCS: Record<Phase, DocumentKind[]> = {
  intake: ["titre_propriete"],
  reconnaissance: ["pv_reconnaissance"],
  releve_topographique: ["releve_topographique", "plan_cadastral"],
  analyse_juridique: ["rapport_juridique", "titre_propriete"],
  evaluation_domaniale: ["evaluation_domaniale", "certificat_urbanisme"],
  validation: ["rapport_juridique", "evaluation_domaniale"],
  cloture: ["acte_signature"],

  instruction: ["titre_propriete", "certificat_urbanisme"],
  commission_evaluation: ["decision_commission"],
  appel_offres: ["cahier_charges"],
  adjudication: ["offre_achat", "pv_adjudication"],
  signature_acte: ["acte_signature"],
};

export function requiredDocsFor(phase: Phase): DocumentKind[] {
  return REQUIRED_DOCS[phase] ?? [];
}

export function missingRequiredDocs(dossier: Dossier): DocumentKind[] {
  const required = requiredDocsFor(dossier.currentPhase);
  const present = new Set(dossier.documents.map((d) => d.kind));
  return required.filter((k) => !present.has(k));
}

// SLAs in days for each phase — used for "stalled" and "approaching deadline" alerts.
const PHASE_SLA_DAYS: Record<Phase, number> = {
  intake: 14,
  reconnaissance: 21,
  releve_topographique: 30,
  analyse_juridique: 30,
  evaluation_domaniale: 45,
  validation: 21,
  cloture: 7,
  instruction: 21,
  commission_evaluation: 30,
  appel_offres: 60,
  adjudication: 30,
  signature_acte: 21,
};

export function phaseSlaDays(phase: Phase): number {
  return PHASE_SLA_DAYS[phase] ?? 30;
}

export function daysInCurrentPhase(dossier: Dossier, now = new Date()): number {
  const entry = [...dossier.phaseHistory]
    .reverse()
    .find((t) => t.phase === dossier.currentPhase);
  const start = entry ? new Date(entry.enteredAt) : new Date(dossier.updatedAt);
  const ms = now.getTime() - start.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

// Phase human label in the active UI locale
export function phaseLabelKey(phase: Phase): string {
  return `phase.${phase}`;
}

export function typeLabelKey(type: DossierType): string {
  return `type.${type}`;
}

// --- Alert rules -----------------------------------------------------------

let alertCounter = 0;
function newAlertId() {
  alertCounter += 1;
  return `al_${Date.now()}_${alertCounter}`;
}

export function evaluateAlertsFor(dossier: Dossier, now = new Date()): Alert[] {
  const out: Alert[] = [];
  const days = daysInCurrentPhase(dossier, now);
  const sla = phaseSlaDays(dossier.currentPhase);

  // Stalled
  if (days > sla) {
    out.push({
      id: newAlertId(),
      dossierId: dossier.id,
      kind: "stalled",
      severity: days > sla * 1.5 ? "critical" : "warning",
      title: `Stalled ${days}d in ${dossier.currentPhase}`,
      detail: `Dossier has been in this phase for ${days} days (SLA ${sla}d).`,
      recommendation:
        days > sla * 1.5
          ? "Escalate to head of service and request a status review."
          : "Contact the assignee for a status update and unblock missing items.",
      createdAt: now.toISOString(),
    });
  } else if (days > sla * 0.75) {
    out.push({
      id: newAlertId(),
      dossierId: dossier.id,
      kind: "approaching_sla",
      severity: "info",
      title: `Approaching SLA (${days}/${sla} days)`,
      detail: `Dossier is nearing its phase SLA. ${sla - days} days remain.`,
      recommendation: "Prioritize the next action to avoid escalation.",
      createdAt: now.toISOString(),
    });
  }

  // Missing required documents
  const missing = missingRequiredDocs(dossier);
  for (const kind of missing) {
    out.push({
      id: newAlertId(),
      dossierId: dossier.id,
      kind: "missing_doc",
      severity: "warning",
      title: `Missing document: ${kind.replace(/_/g, " ")}`,
      detail: `The phase "${dossier.currentPhase}" requires a "${kind.replace(/_/g, " ")}" document.`,
      recommendation: `Request the document from the applicant or issuing authority.`,
      createdAt: now.toISOString(),
    });
  }

  // Data inconsistency: surface area or value obviously missing for a phase
  // where they are usually set.
  if (
    (dossier.currentPhase === "evaluation_domaniale" ||
      dossier.currentPhase === "appel_offres") &&
    (!dossier.surfaceM2 || !dossier.estimatedValueDzd)
  ) {
    out.push({
      id: newAlertId(),
      dossierId: dossier.id,
      kind: "data_inconsistency",
      severity: "warning",
      title: "Surface area or estimated value missing",
      detail:
        "The dossier is at a phase that normally requires surface and value data, but one is missing.",
      recommendation:
        "Update surface / value fields or upload the missing source document.",
      createdAt: now.toISOString(),
    });
  }

  return out;
}

export function severityWeight(s: AlertSeverity): number {
  return s === "critical" ? 3 : s === "warning" ? 2 : 1;
}

export function sortAlertsBySeverity(alerts: Alert[]): Alert[] {
  return [...alerts].sort(
    (a, b) => severityWeight(b.severity) - severityWeight(a.severity)
  );
}

export function allAlerts(dossiers: Dossier[], now = new Date()): Alert[] {
  const all: Alert[] = [];
  for (const d of dossiers) {
    for (const a of d.alerts) {
      if (!a.resolvedAt) all.push(a);
    }
    all.push(...evaluateAlertsFor(d, now));
  }
  return sortAlertsBySeverity(all);
}
