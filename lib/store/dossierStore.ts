// Zustand store with localStorage persist. Single source of client-side truth
// for dossiers, documents, activities, language, and seed flag.

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  Dossier,
  DossierDocument,
  DossierType,
  Locale,
  Phase,
  Activity,
  Alert,
  DocumentKind,
  PhaseTransition,
} from "@/lib/domain/types";
import { evaluateAlertsFor } from "@/lib/domain/workflow";
import { SEED_DOSSIERS } from "@/data/seed";

interface State {
  locale: Locale;
  dossiers: Dossier[];
  activities: Activity[];
  hydrated: boolean;
}

interface Actions {
  setLocale: (l: Locale) => void;

  createDossier: (input: {
    type: DossierType;
    reference: string;
    object: string;
    wilaya: string;
    commune: string;
    address?: string;
    surfaceM2?: number;
    estimatedValueDzd?: number;
    parties: string[];
    priority: Dossier["priority"];
    assignee: string;
  }) => string;

  advancePhase: (id: string, to: Phase, note?: string) => void;
  regressPhase: (id: string, to: Phase, note?: string) => void;
  deleteDossier: (id: string) => void;

  attachDocument: (
    dossierId: string,
    doc: Omit<DossierDocument, "id" | "uploadedAt">
  ) => string;
  applyExtractedFields: (dossierId: string, docId: string) => void;
  removeDocument: (dossierId: string, docId: string) => void;

  resolveAlert: (dossierId: string, alertId: string) => void;

  refreshAlerts: () => void;

  recordActivity: (a: Omit<Activity, "id" | "at">) => void;

  resetToSeed: () => void;
  clearAll: () => void;

  setHydrated: () => void;
}

type Store = State & Actions;

let counter = 0;
const newId = (p: string) => `${p}_${Date.now()}_${++counter}`;

function nowIso() {
  return new Date().toISOString();
}

export const useDossierStore = create<Store>()(
  persist(
    (set, get) => ({
      locale: "sq",
      dossiers: [],
      activities: [],
      hydrated: false,

      setLocale: (l) => set({ locale: l }),

      createDossier: (input) => {
        const id = newId("dos");
        const now = nowIso();
        const initialPhase: Phase = "intake";
        const dossier: Dossier = {
          id,
          type: input.type,
          reference: input.reference,
          object: input.object,
          wilaya: input.wilaya,
          commune: input.commune,
          address: input.address,
          surfaceM2: input.surfaceM2,
          estimatedValueDzd: input.estimatedValueDzd,
          parties: input.parties,
          priority: input.priority,
          assignee: input.assignee,
          currentPhase: initialPhase,
          phaseHistory: [
            {
              phase: initialPhase,
              enteredAt: now,
              enteredBy: input.assignee,
            },
          ],
          documents: [],
          alerts: [],
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({
          dossiers: [dossier, ...s.dossiers],
        }));
        get().recordActivity({
          dossierId: id,
          kind: "created",
          by: input.assignee,
          message: `Dossier créé: ${input.reference}`,
        });
        get().refreshAlerts();
        return id;
      },

      advancePhase: (id, to, note) => {
        set((s) => ({
          dossiers: s.dossiers.map((d) => {
            if (d.id !== id) return d;
            const now = nowIso();
            const newHistory: PhaseTransition[] = d.phaseHistory.map((p) =>
              p.phase === d.currentPhase && !p.exitedAt
                ? { ...p, exitedAt: now }
                : p
            );
            newHistory.push({
              phase: to,
              enteredAt: now,
              enteredBy: d.assignee,
              note,
            });
            return {
              ...d,
              currentPhase: to,
              phaseHistory: newHistory,
              updatedAt: now,
            };
          }),
        }));
        const d = get().dossiers.find((x) => x.id === id);
        if (d) {
          get().recordActivity({
            dossierId: id,
            kind: "phase_advanced",
            by: d.assignee,
            message: `Phase → ${to}`,
          });
        }
        get().refreshAlerts();
      },

      regressPhase: (id, to, note) => {
        // Same as advance but moves backward; for demo simplicity reuse.
        get().advancePhase(id, to, note);
      },

      deleteDossier: (id) => {
        set((s) => ({
          dossiers: s.dossiers.filter((d) => d.id !== id),
          activities: s.activities.filter((a) => a.dossierId !== id),
        }));
      },

      attachDocument: (dossierId, doc) => {
        const id = newId("doc");
        const fullDoc: DossierDocument = {
          ...doc,
          id,
          uploadedAt: nowIso(),
        };
        set((s) => ({
          dossiers: s.dossiers.map((d) =>
            d.id === dossierId
              ? { ...d, documents: [...d.documents, fullDoc], updatedAt: nowIso() }
              : d
          ),
        }));
        const d = get().dossiers.find((x) => x.id === dossierId);
        if (d) {
          get().recordActivity({
            dossierId,
            kind: "document_uploaded",
            by: d.assignee,
            message: `Document ajouté: ${doc.filename}`,
          });
        }
        get().refreshAlerts();
        return id;
      },

      applyExtractedFields: (dossierId, docId) => {
        set((s) => ({
          dossiers: s.dossiers.map((d) => {
            if (d.id !== dossierId) return d;
            const doc = d.documents.find((x) => x.id === docId);
            if (!doc || !doc.extracted) return { ...d, updatedAt: nowIso() };
            const ex = doc.extracted;
            return {
              ...d,
              surfaceM2: typeof ex.surface_m2 === "number" ? ex.surface_m2 : d.surfaceM2,
              estimatedValueDzd:
                typeof ex.value_dzd === "number" ? ex.value_dzd : d.estimatedValueDzd,
              wilaya: typeof ex.wilaya === "string" ? ex.wilaya : d.wilaya,
              commune: typeof ex.commune === "string" ? ex.commune : d.commune,
              reference: typeof ex.reference === "string" ? ex.reference : d.reference,
              parties:
                typeof ex.parties === "string"
                  ? [...d.parties, ex.parties]
                  : d.parties,
              documents: d.documents.map((x) =>
                x.id === docId ? { ...x, applied: true } : x
              ),
              updatedAt: nowIso(),
            };
          }),
        }));
        const d = get().dossiers.find((x) => x.id === dossierId);
        if (d) {
          get().recordActivity({
            dossierId,
            kind: "document_extracted",
            by: d.assignee,
            message: `Champs extraits appliqués depuis le document`,
          });
        }
        get().refreshAlerts();
      },

      removeDocument: (dossierId, docId) => {
        set((s) => ({
          dossiers: s.dossiers.map((d) =>
            d.id === dossierId
              ? {
                  ...d,
                  documents: d.documents.filter((x) => x.id !== docId),
                  updatedAt: nowIso(),
                }
              : d
          ),
        }));
        get().refreshAlerts();
      },

      resolveAlert: (dossierId, alertId) => {
        const now = nowIso();
        set((s) => ({
          dossiers: s.dossiers.map((d) =>
            d.id === dossierId
              ? {
                  ...d,
                  alerts: d.alerts.map((a) =>
                    a.id === alertId ? { ...a, resolvedAt: now } : a
                  ),
                  updatedAt: now,
                }
              : d
          ),
        }));
        const d = get().dossiers.find((x) => x.id === dossierId);
        if (d) {
          get().recordActivity({
            dossierId,
            kind: "alert_resolved",
            by: d.assignee,
            message: `Alerte résolue`,
          });
        }
      },

      refreshAlerts: () => {
        set((s) => ({
          dossiers: s.dossiers.map((d) => {
            const fresh = evaluateAlertsFor(d);
            // Keep user-resolved alerts as resolved; add new ones.
            const resolvedIds = new Set(
              d.alerts.filter((a) => a.resolvedAt).map((a) => a.kind)
            );
            const filteredFresh = fresh.filter((a) => !resolvedIds.has(a.kind));
            return {
              ...d,
              alerts: [...d.alerts.filter((a) => a.resolvedAt), ...filteredFresh],
            };
          }),
        }));
      },

      recordActivity: (a) => {
        const act: Activity = {
          ...a,
          id: newId("act"),
          at: nowIso(),
        };
        set((s) => ({ activities: [act, ...s.activities].slice(0, 500) }));
      },

      resetToSeed: () => {
        set({
          dossiers: SEED_DOSSIERS.map((d) => ({
            ...d,
            // Make sure every dossier has its alerts re-evaluated.
            alerts: evaluateAlertsFor(d),
          })),
          activities: [],
        });
      },

      clearAll: () => {
        set({ dossiers: [], activities: [] });
      },

      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "dossiers-platform-v2",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        locale: s.locale,
        dossiers: s.dossiers,
        activities: s.activities,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
        if (state && state.dossiers.length === 0) {
          state.resetToSeed();
        } else {
          state?.refreshAlerts();
        }
      },
    }
  )
);

// Helpers exported for components
export function selectDossierById(id: string) {
  return (s: Store) => s.dossiers.find((d) => d.id === id);
}

export function selectAllDossiers(s: Store) {
  return s.dossiers;
}

export function selectOpenAlerts(s: Store): Alert[] {
  return s.dossiers.flatMap((d) => d.alerts.filter((a) => !a.resolvedAt));
}
