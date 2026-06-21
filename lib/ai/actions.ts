// Agentic action layer. The assistant can DETECT an action the user asks for
// (create / delete / advance / add document) and PROPOSE it. It never mutates
// anything on its own — the UI must call executeAction() only after the user
// explicitly approves (button click or a spoken "yes"). This keeps the AI
// safe and auditable: every change is human-confirmed.

import { Dossier, DocumentKind, DossierType, Locale, Phase } from "@/lib/domain/types";
import { translate } from "@/lib/i18n/config";
import { nextPhases } from "@/lib/domain/workflow";
import { useDossierStore } from "@/lib/store/dossierStore";

/* --------------------------------- types ---------------------------------- */

export type ActionKind = "create_dossier" | "delete_dossier" | "advance_phase" | "add_document";

export interface CreateDossierAction {
  kind: "create_dossier";
  input: {
    type: DossierType;
    reference: string;
    object: string;
    wilaya: string;
    commune: string;
    parties: string[];
    priority: Dossier["priority"];
    assignee: string;
  };
}

export interface DeleteDossierAction {
  kind: "delete_dossier";
  dossierId: string;
  reference: string;
}

export interface AdvancePhaseAction {
  kind: "advance_phase";
  dossierId: string;
  reference: string;
  to: Phase;
}

export interface AddDocumentAction {
  kind: "add_document";
  dossierId: string;
  reference: string;
  docKind: DocumentKind;
  filename: string;
}

export type AssistantAction =
  | CreateDossierAction
  | DeleteDossierAction
  | AdvancePhaseAction
  | AddDocumentAction;

/** A proposed action awaiting the user's approval. */
export interface ActionProposal {
  action: AssistantAction;
  /** Short title for the confirmation card. */
  title: string;
  /** One-line human summary. */
  summary: string;
  /** Field-by-field detail bullets shown before approving. */
  details: { label: string; value: string }[];
  /** Destructive actions (delete) render with a red warning style. */
  destructive: boolean;
  /** Spoken request for approval. */
  confirmPrompt: string;
}

/** detectAction can also fail gracefully with a plain reply instead of a proposal. */
export interface DetectFailure {
  failed: true;
  answer: string;
  spoken: string;
}

/* ------------------------------- localization ----------------------------- */

type Loc = Partial<Record<Locale, string>>;
function L(locale: Locale, m: Loc): string {
  return m[locale] ?? m.sq ?? m.en ?? Object.values(m)[0] ?? "";
}

function deburr(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function has(hay: string, list: string[]): boolean {
  return list.some((k) => hay.includes(deburr(k)));
}

const KW = {
  create: [
    "create", "new dossier", "add a dossier", "add dossier",
    "krijo", "krijoj", "dosje te re", "shto dosje", "shtoj dosje",
    "cree", "creer", "nouveau dossier", "ajoute un dossier",
    "انشئ", "ملف جديد", "اضف ملف",
  ],
  del: [
    "delete", "remove dossier", "remove the dossier", "discard dossier",
    "fshi", "fshij", "hiq dosjen", "elimino",
    "supprime", "supprimer", "efface", "effacer",
    "احذف", "حذف", "ازل",
  ],
  advance: [
    "advance", "move to", "move it", "next phase", "promote", "progress", "push to",
    "kalo", "avanco", "cojeni", "faza tjeter", "ne fazen",
    "avance", "avancer", "passe", "passer", "phase suivante", "faire avancer",
    "انتقل", "المرحلة التالية", "قدم",
  ],
  addDoc: [
    "add document", "attach", "upload", "add a document", "add the document", "add file",
    "ngarko", "bashkangjit", "shto dokument", "shto nje dokument", "ngjit",
    "ajoute un document", "televerse", "televerser", "joindre", "joins", "ajoute le document",
    "اضف وثيقة", "ارفق", "حمل",
  ],
};

export const AFFIRM = [
  "yes", "yeah", "yep", "yup", "ok", "okay", "approve", "approved", "confirm", "confirmed",
  "do it", "sure", "go ahead", "please do",
  "po", "ne rregull", "aprovo", "miratoj", "konfirmo", "dakord", "vazhdo",
  "oui", "d accord", "daccord", "valide", "valider", "confirme", "vas y",
  "نعم", "موافق", "أكد", "اكد", "تمام",
];

export const NEGATE = [
  "no", "nope", "nah", "cancel", "stop", "dont", "do not", "abort", "never mind", "nevermind",
  "jo", "anulo", "ndal", "mos",
  "non", "annule", "annuler", "arrete", "arreter", "laisse tomber",
  "لا", "الغ", "ألغ", "توقف", "لا تفعل",
];

export function isAffirmative(text: string): boolean {
  const t = ` ${deburr(text).replace(/[^a-z\u0600-\u06ff ]/g, " ")} `;
  return AFFIRM.some((w) => t.includes(` ${deburr(w)} `) || t.includes(` ${deburr(w)}`));
}
export function isNegative(text: string): boolean {
  const t = ` ${deburr(text).replace(/[^a-z\u0600-\u06ff ]/g, " ")} `;
  return NEGATE.some((w) => t.includes(` ${deburr(w)} `) || t.includes(` ${deburr(w)}`));
}

/* ------------------------------ dossier resolve --------------------------- */

function resolveDossier(q: string, dossiers: Dossier[], current?: Dossier | null): Dossier | undefined {
  const qd = deburr(q);
  const refMatch = qd.match(/[a-z]{2,4}[-\s]?\d{4}[-\s]?\d{2,5}/i);
  if (refMatch) {
    const norm = refMatch[0].replace(/\s+/g, "-");
    const found = dossiers.find((d) => {
      const r = deburr(d.reference).replace(/\s+/g, "-");
      return r.includes(norm) || norm.includes(r);
    });
    if (found) return found;
  }
  if (current && /\b(this|current|kjo|kete|këtë|ce dossier|cette|celui|هذا|هذه|الحالي)\b/.test(qd)) {
    return current;
  }
  const qTokens = qd.split(/\s+/).filter((w) => w.length > 3);
  let best: { d: Dossier; score: number } | undefined;
  for (const d of dossiers) {
    const hay = deburr(`${d.object} ${d.commune} ${d.wilaya} ${d.parties.join(" ")}`);
    let score = 0;
    for (const tok of qTokens) if (hay.includes(tok)) score += 1;
    if (score >= 2 && (!best || score > best.score)) best = { d, score };
  }
  return best?.d;
}

function phaseName(p: Phase, locale: Locale): string {
  return translate(locale, `phase.${p}`);
}

/* ------------------------------ field parsing ----------------------------- */

function parseType(qd: string): DossierType {
  if (/ekb|privatiz|بيع|خصخصة/.test(qd)) return "ekb_privatization";
  return "exploration";
}

function parsePriority(qd: string): Dossier["priority"] {
  if (/urgent|urgjent|عاجل/.test(qd)) return "urgent";
  if (/high|prioritaire|me perparesi|prioritet|عالي/.test(qd)) return "high";
  if (/low|basse|i ulet|منخفض/.test(qd)) return "low";
  return "normal";
}

function parseObject(raw: string): string | undefined {
  const patterns = [
    /(?:for|named|called|titled|about|regarding)\s+(.+)$/i,
    /(?:pour|nomm[ée]+|intitul[ée]+|appel[ée]+|concernant)\s+(.+)$/i,
    /(?:p[eë]r|me objekt|me titull|i quajtur|quajtur)\s+(.+)$/i,
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (m && m[1]) {
      let s = m[1].trim().replace(/["'».,;:!?]+$/g, "").trim();
      // Strip a leading "dossier/dosje" noun if it slipped in.
      s = s.replace(/^(le |la |a |an |the |un |une |nje |një )?(dossier|dosje|ملف)\s+/i, "").trim();
      if (s.length >= 2) return s.slice(0, 80);
    }
  }
  return undefined;
}

const DOC_KEYWORDS: { kind: DocumentKind; words: string[] }[] = [
  { kind: "titre_propriete", words: ["titre", "propriete", "ownership", "title", "titull", "pronesi", "ملكية", "سند"] },
  { kind: "plan_cadastral", words: ["cadastr", "kadastr", "cadastral", "مساحي", "مخطط"] },
  { kind: "releve_topographique", words: ["topograph", "topografi", "survey", "طوبوغرافي"] },
  { kind: "certificat_urbanisme", words: ["urbanism", "urbanisme", "urbanizem", "تعمير"] },
  { kind: "evaluation_domaniale", words: ["evaluation", "domanial", "vleresim", "تقييم"] },
  { kind: "pv_reconnaissance", words: ["reconnaissance", "njohje", "معاينة"] },
  { kind: "rapport_juridique", words: ["juridique", "legal", "juridik", "rapport", "قانوني"] },
  { kind: "decision_commission", words: ["commission", "decision", "komision", "لجنة"] },
  { kind: "cahier_charges", words: ["cahier", "charges", "specifications", "kushte", "دفتر"] },
  { kind: "offre_achat", words: ["offre", "achat", "offer", "oferte", "عرض"] },
  { kind: "pv_adjudication", words: ["adjudication", "shitje", "مزايدة"] },
  { kind: "acte_signature", words: ["acte", "signature", "akt", "نهائي", "عقد"] },
];

function parseDocKind(qd: string): DocumentKind {
  for (const { kind, words } of DOC_KEYWORDS) if (has(qd, words)) return kind;
  return "autre";
}

function nextReference(type: DossierType, dossiers: Dossier[]): string {
  const prefix = type === "ekb_privatization" ? "EKB" : "EXP";
  const year = new Date().getFullYear();
  const count = dossiers.filter((d) => d.type === type).length + 1;
  return `${prefix}-${year}-${String(count).padStart(3, "0")}`;
}

/* ------------------------------ detection --------------------------------- */

export function detectAction(opts: {
  query: string;
  dossiers: Dossier[];
  locale: Locale;
  current?: Dossier | null;
}): ActionProposal | DetectFailure | null {
  const { query, dossiers, locale, current } = opts;
  const qd = deburr(query);
  const unassigned = L(locale, { sq: "I pacaktuar", en: "Unassigned", fr: "Non assigné", ar: "غير معيّن" });
  const tbd = L(locale, { sq: "Për t'u përcaktuar", en: "To be defined", fr: "À définir", ar: "يُحدد لاحقاً" });

  /* ---- 1) DELETE (destructive, checked first) ---- */
  if (has(qd, KW.del) && !has(qd, KW.addDoc)) {
    const target = resolveDossier(query, dossiers, current);
    if (!target) {
      return failure(
        locale,
        {
          sq: "Cilën dosje dëshironi të fshini? Më jepni referencën, p.sh. EXP-2024-014.",
          en: "Which dossier should I delete? Give me the reference, e.g. EXP-2024-014.",
          fr: "Quel dossier dois-je supprimer ? Donnez-moi la référence, p. ex. EXP-2024-014.",
          ar: "أي ملف أحذف؟ أعطني المرجع، مثل EXP-2024-014.",
        }
      );
    }
    return {
      action: { kind: "delete_dossier", dossierId: target.id, reference: target.reference },
      destructive: true,
      title: L(locale, { sq: "Fshi dosjen", en: "Delete dossier", fr: "Supprimer le dossier", ar: "حذف الملف" }),
      summary: L(locale, {
        sq: `Do të fshihet përgjithmonë dosja ${target.reference} — ${target.object}.`,
        en: `This will permanently delete dossier ${target.reference} — ${target.object}.`,
        fr: `Ceci supprimera définitivement le dossier ${target.reference} — ${target.object}.`,
        ar: `سيؤدي هذا إلى حذف الملف ${target.reference} — ${target.object} نهائياً.`,
      }),
      details: [
        { label: translate(locale, "common.reference"), value: target.reference },
        { label: translate(locale, "dossiers.detail.object"), value: target.object },
        { label: translate(locale, "common.documents"), value: String(target.documents.length) },
      ],
      confirmPrompt: L(locale, {
        sq: `Të fshij dosjen ${target.reference}? Kjo nuk mund të kthehet. Thoni «po» për ta konfirmuar.`,
        en: `Delete dossier ${target.reference}? This can't be undone. Say "yes" to confirm.`,
        fr: `Supprimer le dossier ${target.reference} ? Action irréversible. Dites « oui » pour confirmer.`,
        ar: `حذف الملف ${target.reference}؟ لا يمكن التراجع. قل «نعم» للتأكيد.`,
      }),
    };
  }

  /* ---- 2) CREATE ---- */
  if (has(qd, KW.create)) {
    const type = parseType(qd);
    const reference = nextReference(type, dossiers);
    const object =
      parseObject(query) ?? L(locale, { sq: "Dosje pa titull", en: "Untitled dossier", fr: "Dossier sans titre", ar: "ملف بدون عنوان" });
    const priority = parsePriority(qd);
    const typeLabel = translate(locale, `type.${type}`);
    const prioLabel = translate(locale, `priority.${priority}`);
    return {
      action: {
        kind: "create_dossier",
        input: { type, reference, object, wilaya: tbd, commune: tbd, parties: [], priority, assignee: unassigned },
      },
      destructive: false,
      title: L(locale, { sq: "Krijo dosje", en: "Create dossier", fr: "Créer un dossier", ar: "إنشاء ملف" }),
      summary: L(locale, {
        sq: `Do të krijohet një dosje e re ${typeLabel}.`,
        en: `This will create a new ${typeLabel} dossier.`,
        fr: `Ceci créera un nouveau dossier ${typeLabel}.`,
        ar: `سيؤدي هذا إلى إنشاء ملف ${typeLabel} جديد.`,
      }),
      details: [
        { label: L(locale, { sq: "Lloji", en: "Type", fr: "Type", ar: "النوع" }), value: typeLabel },
        { label: translate(locale, "common.reference"), value: reference },
        { label: translate(locale, "dossiers.detail.object"), value: object },
        { label: translate(locale, "common.priority"), value: prioLabel },
      ],
      confirmPrompt: L(locale, {
        sq: `Të krijoj dosjen ${typeLabel} me referencë ${reference}? Thoni «po» për ta konfirmuar.`,
        en: `Create a ${typeLabel} dossier with reference ${reference}? Say "yes" to confirm.`,
        fr: `Créer un dossier ${typeLabel} avec la référence ${reference} ? Dites « oui » pour confirmer.`,
        ar: `إنشاء ملف ${typeLabel} بالمرجع ${reference}؟ قل «نعم» للتأكيد.`,
      }),
    };
  }

  /* ---- 3) ADD DOCUMENT ---- */
  if (has(qd, KW.addDoc)) {
    const target = resolveDossier(query, dossiers, current);
    if (!target) {
      return failure(locale, {
        sq: "Te cila dosje ta shtoj dokumentin? Më jepni referencën.",
        en: "Which dossier should I add the document to? Give me the reference.",
        fr: "À quel dossier ajouter le document ? Donnez-moi la référence.",
        ar: "إلى أي ملف أضيف الوثيقة؟ أعطني المرجع.",
      });
    }
    const docKind = parseDocKind(qd);
    const docLabel = translate(locale, `doc.${docKind}`);
    const filename = `${docKind}.pdf`;
    return {
      action: { kind: "add_document", dossierId: target.id, reference: target.reference, docKind, filename },
      destructive: false,
      title: L(locale, { sq: "Shto dokument", en: "Add document", fr: "Ajouter un document", ar: "إضافة وثيقة" }),
      summary: L(locale, {
        sq: `Do të shtohet «${docLabel}» te dosja ${target.reference}.`,
        en: `This will add "${docLabel}" to dossier ${target.reference}.`,
        fr: `Ceci ajoutera « ${docLabel} » au dossier ${target.reference}.`,
        ar: `سيؤدي هذا إلى إضافة «${docLabel}» إلى الملف ${target.reference}.`,
      }),
      details: [
        { label: translate(locale, "common.reference"), value: target.reference },
        { label: translate(locale, "common.documents"), value: docLabel },
      ],
      confirmPrompt: L(locale, {
        sq: `Të shtoj «${docLabel}» te dosja ${target.reference}? Thoni «po» për ta konfirmuar.`,
        en: `Add "${docLabel}" to dossier ${target.reference}? Say "yes" to confirm.`,
        fr: `Ajouter « ${docLabel} » au dossier ${target.reference} ? Dites « oui » pour confirmer.`,
        ar: `إضافة «${docLabel}» إلى الملف ${target.reference}؟ قل «نعم» للتأكيد.`,
      }),
    };
  }

  /* ---- 4) ADVANCE PHASE ---- */
  if (has(qd, KW.advance)) {
    const target = resolveDossier(query, dossiers, current);
    if (!target) {
      return failure(locale, {
        sq: "Cilën dosje të avancoj? Më jepni referencën.",
        en: "Which dossier should I advance? Give me the reference.",
        fr: "Quel dossier faire avancer ? Donnez-moi la référence.",
        ar: "أي ملف أقدّمه؟ أعطني المرجع.",
      });
    }
    const next = nextPhases(target)[0];
    if (!next) {
      return failure(locale, {
        sq: `Dosja ${target.reference} është tashmë në fazën përfundimtare.`,
        en: `Dossier ${target.reference} is already in its final phase.`,
        fr: `Le dossier ${target.reference} est déjà en phase finale.`,
        ar: `الملف ${target.reference} في مرحلته الأخيرة بالفعل.`,
      });
    }
    return {
      action: { kind: "advance_phase", dossierId: target.id, reference: target.reference, to: next },
      destructive: false,
      title: L(locale, { sq: "Avanco fazën", en: "Advance phase", fr: "Avancer la phase", ar: "تقديم المرحلة" }),
      summary: L(locale, {
        sq: `Dosja ${target.reference} do të kalojë në «${phaseName(next, locale)}».`,
        en: `Dossier ${target.reference} will move to "${phaseName(next, locale)}".`,
        fr: `Le dossier ${target.reference} passera à « ${phaseName(next, locale)} ».`,
        ar: `سينتقل الملف ${target.reference} إلى «${phaseName(next, locale)}».`,
      }),
      details: [
        { label: translate(locale, "common.reference"), value: target.reference },
        { label: translate(locale, "dossiers.detail.status"), value: phaseName(target.currentPhase, locale) },
        { label: L(locale, { sq: "Faza e re", en: "New phase", fr: "Nouvelle phase", ar: "المرحلة الجديدة" }), value: phaseName(next, locale) },
      ],
      confirmPrompt: L(locale, {
        sq: `Të avancoj dosjen ${target.reference} në «${phaseName(next, locale)}»? Thoni «po» për ta konfirmuar.`,
        en: `Advance dossier ${target.reference} to "${phaseName(next, locale)}"? Say "yes" to confirm.`,
        fr: `Faire avancer le dossier ${target.reference} vers « ${phaseName(next, locale)} » ? Dites « oui » pour confirmer.`,
        ar: `تقديم الملف ${target.reference} إلى «${phaseName(next, locale)}»؟ قل «نعم» للتأكيد.`,
      }),
    };
  }

  return null;
}

function failure(locale: Locale, m: Loc): DetectFailure {
  const s = L(locale, m);
  return { failed: true, answer: s, spoken: s };
}

export function isProposal(x: ActionProposal | DetectFailure | null): x is ActionProposal {
  return !!x && !("failed" in x);
}

/* ------------------------------- execution -------------------------------- */

export interface ActionResult {
  answer: string;
  spoken: string;
  navigate?: string;
}

/** Performs the approved mutation against the store. Side-effectful. */
export function executeAction(action: AssistantAction, locale: Locale): ActionResult {
  const store = useDossierStore.getState();

  switch (action.kind) {
    case "create_dossier": {
      const id = store.createDossier(action.input);
      const msg = L(locale, {
        sq: `U krijua dosja ${action.input.reference}. Po e hap.`,
        en: `Created dossier ${action.input.reference}. Opening it now.`,
        fr: `Dossier ${action.input.reference} créé. Ouverture en cours.`,
        ar: `تم إنشاء الملف ${action.input.reference}. جارٍ فتحه.`,
      });
      return { answer: msg, spoken: msg, navigate: `/dossiers/${id}` };
    }
    case "delete_dossier": {
      store.deleteDossier(action.dossierId);
      const msg = L(locale, {
        sq: `Dosja ${action.reference} u fshi.`,
        en: `Dossier ${action.reference} has been deleted.`,
        fr: `Le dossier ${action.reference} a été supprimé.`,
        ar: `تم حذف الملف ${action.reference}.`,
      });
      return { answer: msg, spoken: msg };
    }
    case "advance_phase": {
      store.advancePhase(action.dossierId, action.to);
      const msg = L(locale, {
        sq: `Dosja ${action.reference} kaloi në «${phaseName(action.to, locale)}».`,
        en: `Dossier ${action.reference} moved to "${phaseName(action.to, locale)}".`,
        fr: `Le dossier ${action.reference} est passé à « ${phaseName(action.to, locale)} ».`,
        ar: `انتقل الملف ${action.reference} إلى «${phaseName(action.to, locale)}».`,
      });
      return { answer: msg, spoken: msg, navigate: `/dossiers/${action.dossierId}` };
    }
    case "add_document": {
      store.attachDocument(action.dossierId, {
        kind: action.docKind,
        filename: action.filename,
        data: "",
        mimeType: "application/pdf",
        sizeBytes: 128 * 1024,
        uploadedBy: "Doss AI",
      });
      const docLabel = translate(locale, `doc.${action.docKind}`);
      const msg = L(locale, {
        sq: `U shtua «${docLabel}» te dosja ${action.reference}.`,
        en: `Added "${docLabel}" to dossier ${action.reference}.`,
        fr: `« ${docLabel} » ajouté au dossier ${action.reference}.`,
        ar: `تمت إضافة «${docLabel}» إلى الملف ${action.reference}.`,
      });
      return { answer: msg, spoken: msg, navigate: `/dossiers/${action.dossierId}` };
    }
  }
}
