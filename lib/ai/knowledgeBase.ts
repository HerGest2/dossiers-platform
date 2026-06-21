// Grounded process knowledge base — the "manual" the voice assistant retrieves
// from so it answers ONLY from the official process and legal basis (RAG), and
// never invents steps.
//
// NOTE FOR THE TEAM: the legal references below are realistic placeholders.
// Replace each `legalBasis` / `institutions` / `criticalPoints` entry with the
// exact content from the two official diagrams (Expropriation + EKB
// Privatization) to make the assistant fully authoritative.

import { DossierType, Phase, Locale } from "@/lib/domain/types";

export interface KbEntry {
  process: DossierType;
  phase: Phase;
  /** Short description of what happens in this phase (Albanian). */
  summary: string;
  /** Institutions involved in this phase. */
  institutions: string[];
  /** Legal basis / references that govern this phase. */
  legalBasis: string[];
  /** Manual or slow steps that typically cause delays. */
  criticalPoints: string[];
  /** Extra search terms (synonyms) to improve retrieval. */
  keywords: string[];
}

export const KNOWLEDGE_BASE: KbEntry[] = [
  // ---------------------------------------------------------------------------
  // Process 1 — Eksplorim/Procedurë foncier (Exploration)
  // ---------------------------------------------------------------------------
  {
    process: "exploration",
    phase: "intake",
    summary:
      "Hapja dhe regjistrimi i dosjes: verifikimi i titullit të pronësisë, identitetit të palëve dhe pranueshmërisë së kërkesës.",
    institutions: ["Konservatori i Pronës (Conservation Foncière)", "Sporteli i pranimit"],
    legalBasis: ["Ligji 90-25 mbi orientimin tokësor", "Udhëzimi i brendshëm i pranimit"],
    criticalPoints: [
      "Pranim manual i dosjes në letër",
      "Mungesë e gjurmës së auditimit (audit trail)",
    ],
    keywords: ["pranim", "regjistrim", "hapje", "dosje e re", "titull"],
  },
  {
    process: "exploration",
    phase: "reconnaissance",
    summary:
      "Verifikimi në terren i pronës dhe hartimi i procesverbalit të njohjes.",
    institutions: ["Komisioni i njohjes në terren", "Daïra"],
    legalBasis: ["Dekreti ekzekutiv 91-176", "Procedura e njohjes në terren"],
    criticalPoints: [
      "Planifikimi i vizitave në terren shkakton vonesa logjistike",
      "Procesverbali përpilohet dhe qarkullon në letër",
    ],
    keywords: ["njohje", "terren", "vizitë", "procesverbal", "reconnaissance"],
  },
  {
    process: "exploration",
    phase: "releve_topographique",
    summary:
      "Matja topografike e pronës dhe përgatitja e planit kadastral.",
    institutions: ["Drejtoria e Kadastrës", "Gjeometër ekspert"],
    legalBasis: ["Ligji mbi kadastrën kombëtar", "Standardet topografike"],
    criticalPoints: [
      "Varësia nga gjeometri i jashtëm",
      "Kalim manual i planeve ndërmjet institucioneve",
    ],
    keywords: ["matje", "topografike", "kadastër", "plan", "gjeometër", "sipërfaqe"],
  },
  {
    process: "exploration",
    phase: "analyse_juridique",
    summary:
      "Analiza e situatës juridike të pronës: ngarkesat, hipotekat dhe konfliktet e mundshme.",
    institutions: ["Shërbimi juridik", "Konservatori i Pronës"],
    legalBasis: ["Kodi Civil (dispozitat mbi pronësinë)", "Regjistri i ngarkesave"],
    criticalPoints: [
      "Kontrolli i ngarkesave dhe hipotekave kryhet manualisht",
      "Kërkohet kryqëzim dokumentesh nga disa regjistra",
    ],
    keywords: ["juridik", "ligjor", "ngarkesa", "hipotekë", "konflikt", "analizë"],
  },
  {
    process: "exploration",
    phase: "evaluation_domaniale",
    summary:
      "Vlerësimi i vlerës së pronës nga shërbimi i domeneve të shtetit.",
    institutions: ["Drejtoria e Domeneve të Shtetit (Domaines de l'État)"],
    legalBasis: ["Ligji 90-30 mbi pasuritë e shtetit", "Metodologjia e vlerësimit domanial"],
    criticalPoints: [
      "Vlera llogaritet manualisht në Excel",
      "Mungesë standardizimi ndërmjet vlerësuesve",
    ],
    keywords: ["vlerësim", "domanial", "vlera", "çmim", "domaines", "evaluation"],
  },
  {
    process: "exploration",
    phase: "validation",
    summary:
      "Miratimi i dosjes nga autoriteti kompetent përpara mbylljes.",
    institutions: ["Wilaya", "Komisioni i validimit"],
    legalBasis: ["Procedura e miratimit", "Vendimi i komisionit"],
    criticalPoints: [
      "Nënshkrime të shumta nga nivele të ndryshme",
      "Qarkullim fizik i dosjes ndërmjet zyrave",
    ],
    keywords: ["validim", "miratim", "nënshkrim", "aprovim", "komision"],
  },
  {
    process: "exploration",
    phase: "cloture",
    summary:
      "Nënshkrimi i aktit përfundimtar, lëshimi i certifikatës dhe arkivimi i dosjes.",
    institutions: ["Notari", "Konservatori i Pronës"],
    legalBasis: ["Ligji mbi noterinë", "Procedura e transkriptimit"],
    criticalPoints: [
      "Dorëzim fizik i certifikatave",
      "Njoftim i palëve me letër postare",
    ],
    keywords: ["mbyllje", "akt", "certifikatë", "arkivim", "clôture", "notar"],
  },

  // ---------------------------------------------------------------------------
  // Process 2 — Privatizim EKB (EKB Privatization)
  // ---------------------------------------------------------------------------
  {
    process: "ekb_privatization",
    phase: "intake",
    summary:
      "Hapja e dosjes së privatizimit dhe kontrolli fillestar i dokumentacionit të aseteve.",
    institutions: ["EKB / Agjencia e menaxhimit", "Sporteli i pranimit"],
    legalBasis: ["Urdhëresa 01-04 mbi menaxhimin e kapitaleve shtetërore"],
    criticalPoints: [
      "Dosjet menaxhohen në Excel",
      "Mungon gjurma e ndryshimeve",
    ],
    keywords: ["pranim", "privatizim", "ekb", "aset", "hapje"],
  },
  {
    process: "ekb_privatization",
    phase: "instruction",
    summary:
      "Instruktimi i dosjes, plotësimi i dokumentacionit dhe verifikimi i përputhshmërisë.",
    institutions: ["Shërbimi i instruktimit"],
    legalBasis: ["Procedura e instruktimit të dosjeve", "Lista e dokumenteve të detyrueshme"],
    criticalPoints: [
      "Kërkesa të përsëritura për dokumente shtesë",
      "Komunikim i ngadaltë me palët",
    ],
    keywords: ["instruktim", "dokumente", "plotësim", "verifikim", "instruction"],
  },
  {
    process: "ekb_privatization",
    phase: "commission_evaluation",
    summary:
      "Vlerësimi i aseteve nga komisioni i vlerësimit dhe përcaktimi i vlerës bazë.",
    institutions: ["Komisioni i vlerësimit"],
    legalBasis: ["Rregullorja e komisionit të vlerësimit"],
    criticalPoints: [
      "Mbledhjet e komisionit zhvillohen periodikisht — pritje e gjatë",
      "Vlerësim manual pa mjete digjitale",
    ],
    keywords: ["komision", "vlerësim", "aset", "vlera bazë", "evaluation"],
  },
  {
    process: "ekb_privatization",
    phase: "appel_offres",
    summary:
      "Hapja e procedurës së ftesës për oferta dhe publikimi i kushteve (cahier des charges).",
    institutions: ["Komisioni i tenderave", "Shërbimi i prokurimeve"],
    legalBasis: ["Dekreti mbi prokurimet publike", "Rregullat e ftesës për oferta"],
    criticalPoints: [
      "Publikim manual i njoftimit",
      "Afate ligjore të gjata për paraqitjen e ofertave",
    ],
    keywords: ["ftesë", "oferta", "tender", "cahier", "prokurim", "appel offres"],
  },
  {
    process: "ekb_privatization",
    phase: "adjudication",
    summary:
      "Hapja dhe vlerësimi i ofertave, klasifikimi dhe shpallja e fituesit.",
    institutions: ["Komisioni i adjudikimit"],
    legalBasis: ["Procedura e hapjes së ofertave", "Kriteret e vlerësimit"],
    criticalPoints: [
      "Hapja e ofertave kërkon prani fizike",
      "Kontestime të mundshme që zgjasin procesin",
    ],
    keywords: ["adjudikim", "fitues", "ofertë", "klasifikim", "award"],
  },
  {
    process: "ekb_privatization",
    phase: "signature_acte",
    summary:
      "Nënshkrimi i aktit të shitjes/transferimit me fituesin.",
    institutions: ["Notari", "EKB"],
    legalBasis: ["Ligji mbi noterinë", "Kontrata tip e transferimit"],
    criticalPoints: [
      "Nënshkrim fizik i dokumenteve",
      "Pritje për disponueshmërinë e palëve",
    ],
    keywords: ["nënshkrim", "akt", "shitje", "transferim", "signature"],
  },
  {
    process: "ekb_privatization",
    phase: "cloture",
    summary:
      "Regjistrimi përfundimtar i transferimit dhe mbyllja e dosjes.",
    institutions: ["Konservatori i Pronës"],
    legalBasis: ["Procedura e transkriptimit", "Arkivimi ligjor"],
    criticalPoints: [
      "Transkriptim manual në regjistër",
      "Njoftim me letër",
    ],
    keywords: ["mbyllje", "regjistrim", "arkivim", "transkriptim", "clôture"],
  },
];

function deburr(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function tokenize(s: string): string[] {
  return deburr(s)
    .replace(/[^a-z0-9\u0600-\u06ff\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

const STOPWORDS = new Set(
  tokenize(
    "the and for what which who where when how are is dossier dossiers " +
      "cilat cilët cila janë eshte jane per dhe nga ne te ka kanë kane " +
      "qui quoi quel quelle quels les des dans pour avec sont est " +
      "ما من في على هل التي الذي"
  )
);

import { translate } from "@/lib/i18n/config";

function entrySearchText(e: KbEntry, locale: Locale): string {
  return [
    translate(locale, `type.${e.process}`),
    translate(locale, `phase.${e.phase}`),
    e.summary,
    ...e.institutions,
    ...e.legalBasis,
    ...e.criticalPoints,
    ...e.keywords,
  ].join(" ");
}

export interface KbHit {
  entry: KbEntry;
  score: number;
}

/** Lightweight retrieval: term-overlap scoring with locale-aware fields. */
export function searchKnowledge(
  query: string,
  locale: Locale,
  limit = 3
): KbHit[] {
  const qTokens = tokenize(query).filter((t) => !STOPWORDS.has(t));
  if (qTokens.length === 0) return [];

  const hits: KbHit[] = KNOWLEDGE_BASE.map((entry) => {
    const hay = deburr(entrySearchText(entry, locale));
    let score = 0;
    for (const tok of qTokens) {
      if (hay.includes(tok)) score += 1;
      // Reward strong matches on phase/process names and explicit keywords.
      if (entry.keywords.some((k) => deburr(k).includes(tok))) score += 1;
    }
    return { entry, score };
  })
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score);

  return hits.slice(0, limit);
}
