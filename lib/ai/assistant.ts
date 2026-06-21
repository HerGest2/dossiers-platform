// Voice assistant "brain". Pure, synchronous, and grounded: it answers ONLY
// from (a) the live dossier data in the store and (b) the process knowledge
// base. It never invents process steps. Works fully in-browser with no API key,
// so the AI feature is genuinely end-to-end (not simulated).

import { Dossier, Locale, Phase } from "@/lib/domain/types";
import { translate } from "@/lib/i18n/config";
import {
  daysInCurrentPhase,
  missingRequiredDocs,
  nextPhases,
  phaseSlaDays,
} from "@/lib/domain/workflow";
import { KbEntry, searchKnowledge } from "./knowledgeBase";
import { ActionProposal, detectAction, isProposal } from "./actions";

export type AssistantSource = "data" | "process" | "none";

export interface AssistantReply {
  /** Rich text for on-screen display (may contain newlines and "• " bullets). */
  answer: string;
  /** Plain text optimized for text-to-speech. */
  spoken: string;
  /** Facts / references the answer is grounded on. */
  citedFacts: string[];
  source: AssistantSource;
  /** Optional navigation target (e.g. "/dossiers/<id>"). */
  navigate?: string;
  matchedDossierRef?: string;
  /** An action the assistant proposes and that requires user approval. */
  pendingAction?: ActionProposal;
}

function deburr(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

type Loc = Partial<Record<Locale, string>>;
function L(locale: Locale, m: Loc): string {
  return m[locale] ?? m.sq ?? m.en ?? Object.values(m)[0] ?? "";
}

const KW = {
  open: ["hap", "hape", "shfaq", "open", "ouvre", "ouvrir", "montre", "افتح", "اعرض"],
  missing: ["mungo", "mungon", "mungojn", "missing", "manque", "manquant", "ينقص", "ناقص"],
  next: ["hapi tjet", "hapin tjet", "tjeter", "next", "prochain", "suivant", "الخطوة", "التالي"],
  summary: ["permbledh", "gjendja", "gjendje", "status", "summary", "resume", "ملخص", "الحالة"],
  alerts: ["bllok", "sinjaliz", "alarm", "vones", "afat", "alert", "block", "deadline", "retard", "echeance", "تنبيه", "عائق", "معطل"],
  overview: ["sa dosje", "numri", "overview", "total", "how many", "combien", "panorama", "kem", "كم", "نظرة"],
  urgent: ["urgjent", "urgent", "عاجل"],
  phases: ["faza", "fazat", "hapat", "steps", "etap", "etape", "phases", "مراحل", "خطوات"],
  process: ["proces", "procedur", "process", "procedure", "اجراء", "عملية"],
};

function has(hayTokensJoined: string, list: string[]): boolean {
  return list.some((k) => hayTokensJoined.includes(deburr(k)));
}

function resolveDossier(
  q: string,
  dossiers: Dossier[],
  current?: Dossier | null
): Dossier | undefined {
  const qd = deburr(q);

  // 1) Reference pattern like EXP-2024-1234 / EKB 2024 12.
  const refMatch = qd.match(/[a-z]{2,4}[-\s]?\d{4}[-\s]?\d{2,5}/i);
  if (refMatch) {
    const norm = refMatch[0].replace(/\s+/g, "-");
    const found = dossiers.find((d) => {
      const r = deburr(d.reference).replace(/\s+/g, "-");
      return r.includes(norm) || norm.includes(r);
    });
    if (found) return found;
  }

  // 2) "this / current" dossier when on a detail page.
  if (
    current &&
    /\b(this|current|kjo|kete|këtë|kjone|ce dossier|ce|cette|celui|هذا|هذه|الحالي)\b/.test(qd)
  ) {
    return current;
  }

  // 3) Fuzzy match on object / commune / wilaya tokens (>=2 token overlap).
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

function summarizeDossier(d: Dossier, locale: Locale): AssistantReply {
  const phase = phaseName(d.currentPhase, locale);
  const days = daysInCurrentPhase(d);
  const sla = phaseSlaDays(d.currentPhase);
  const missing = missingRequiredDocs(d);
  const next = nextPhases(d)[0];
  const late = days > sla;

  const missingNames = missing.map((k) => translate(locale, `doc.${k}`).toLowerCase());

  const spoken = L(locale, {
    sq:
      `Dosja ${d.reference}, ${d.object}, ndodhet në fazën ${phase}, prej ${days} ditësh ` +
      `(afati ${sla} ditë).${late ? " Është me vonesë." : ""} ` +
      (missing.length
        ? `Mungojnë: ${missingNames.join(", ")}. `
        : "Të gjitha dokumentet e detyrueshme janë të pranishme. ") +
      (next ? `Hapi tjetër: ${phaseName(next, locale)}.` : "Dosja është në fazën përfundimtare."),
    en:
      `Dossier ${d.reference}, ${d.object}, is in the ${phase} phase, for ${days} days ` +
      `(SLA ${sla} days).${late ? " It is overdue." : ""} ` +
      (missing.length
        ? `Missing: ${missingNames.join(", ")}. `
        : "All required documents are present. ") +
      (next ? `Next step: ${phaseName(next, locale)}.` : "The dossier is in its final phase."),
    fr:
      `Dossier ${d.reference}, ${d.object}, en phase ${phase}, depuis ${days} jours ` +
      `(SLA ${sla} jours).${late ? " Il est en retard." : ""} ` +
      (missing.length
        ? `Manquant : ${missingNames.join(", ")}. `
        : "Toutes les pièces obligatoires sont présentes. ") +
      (next ? `Prochaine étape : ${phaseName(next, locale)}.` : "Le dossier est en phase finale."),
    ar:
      `الملف ${d.reference}، ${d.object}، في مرحلة ${phase} منذ ${days} يوماً (المهلة ${sla} يوماً).` +
      `${late ? " إنه متأخر." : ""} ` +
      (missing.length ? `الناقص: ${missingNames.join("، ")}. ` : "كل الوثائق المطلوبة متوفرة. ") +
      (next ? `الخطوة التالية: ${phaseName(next, locale)}.` : "الملف في مرحلته الأخيرة."),
  });

  const answer = [
    `**${d.reference}** — ${d.object}`,
    `• ${translate(locale, "ai.summary.status")}: ${phase} · ${days}/${sla} ${L(locale, { sq: "ditë", en: "days", fr: "jours", ar: "يوم" })}${late ? " ⚠️" : ""}`,
    `• ${translate(locale, "ai.summary.missing")}: ${missing.length ? missingNames.join(", ") : "—"}`,
    `• ${translate(locale, "ai.summary.next")}: ${next ? phaseName(next, locale) : "—"}`,
  ].join("\n");

  return {
    answer,
    spoken,
    citedFacts: [
      `${translate(locale, "common.reference")}: ${d.reference}`,
      `${translate(locale, "dossiers.detail.status")}: ${phase} (${days}/${sla}d)`,
      `${translate(locale, "common.documents")}: ${d.documents.length}`,
    ],
    source: "data",
    matchedDossierRef: d.reference,
  };
}

function answerMissing(d: Dossier, locale: Locale): AssistantReply {
  const missing = missingRequiredDocs(d).map((k) => translate(locale, `doc.${k}`));
  const spoken = missing.length
    ? L(locale, {
        sq: `Te dosja ${d.reference} mungojnë ${missing.length} dokument(e): ${missing.join(", ")}.`,
        en: `Dossier ${d.reference} is missing ${missing.length} document(s): ${missing.join(", ")}.`,
        fr: `Le dossier ${d.reference} a ${missing.length} pièce(s) manquante(s) : ${missing.join(", ")}.`,
        ar: `الملف ${d.reference} ينقصه ${missing.length} وثيقة: ${missing.join("، ")}.`,
      })
    : L(locale, {
        sq: `Te dosja ${d.reference} nuk mungon asnjë dokument i detyrueshëm.`,
        en: `Dossier ${d.reference} is not missing any required document.`,
        fr: `Le dossier ${d.reference} ne manque d'aucune pièce obligatoire.`,
        ar: `الملف ${d.reference} لا تنقصه أي وثيقة مطلوبة.`,
      });
  return {
    answer: spoken,
    spoken,
    citedFacts: [`${translate(locale, "common.reference")}: ${d.reference}`, `${translate(locale, "phase." + d.currentPhase)}`],
    source: "data",
    matchedDossierRef: d.reference,
  };
}

function answerNextStep(d: Dossier, locale: Locale): AssistantReply {
  const next = nextPhases(d)[0];
  const missing = missingRequiredDocs(d).map((k) => translate(locale, `doc.${k}`).toLowerCase());
  const spoken = next
    ? L(locale, {
        sq:
          `Hapi tjetër për dosjen ${d.reference} është kalimi në «${phaseName(next, locale)}».` +
          (missing.length ? ` Por së pari duhen: ${missing.join(", ")}.` : " Kushtet janë plotësuar."),
        en:
          `The next step for dossier ${d.reference} is to move to "${phaseName(next, locale)}".` +
          (missing.length ? ` But first you need: ${missing.join(", ")}.` : " Conditions are met."),
        fr:
          `La prochaine étape du dossier ${d.reference} est le passage à « ${phaseName(next, locale)} ».` +
          (missing.length ? ` Mais il faut d'abord : ${missing.join(", ")}.` : " Les conditions sont remplies."),
        ar:
          `الخطوة التالية للملف ${d.reference} هي الانتقال إلى «${phaseName(next, locale)}».` +
          (missing.length ? ` لكن يلزم أولاً: ${missing.join("، ")}.` : " الشروط مستوفاة."),
      })
    : L(locale, {
        sq: `Dosja ${d.reference} është në fazën përfundimtare — vazhdoni me mbylljen.`,
        en: `Dossier ${d.reference} is in its final phase — proceed with closure.`,
        fr: `Le dossier ${d.reference} est en phase finale — procédez à la clôture.`,
        ar: `الملف ${d.reference} في مرحلته الأخيرة — تابع الإغلاق.`,
      });
  return {
    answer: spoken,
    spoken,
    citedFacts: [
      `${translate(locale, "common.reference")}: ${d.reference}`,
      `${translate(locale, "dossiers.detail.status")}: ${phaseName(d.currentPhase, locale)}`,
    ],
    source: "data",
    matchedDossierRef: d.reference,
  };
}

function answerBlockages(dossiers: Dossier[], locale: Locale): AssistantReply {
  const scored = dossiers
    .map((d) => {
      const days = daysInCurrentPhase(d);
      const sla = phaseSlaDays(d.currentPhase);
      const overdue = Math.max(0, days - sla);
      const missing = missingRequiredDocs(d).length;
      const openAlerts = d.alerts.filter((a) => !a.resolvedAt).length;
      const score = overdue * 2 + missing * 3 + openAlerts;
      return { d, days, sla, overdue, missing, openAlerts, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    const none = L(locale, {
      sq: "Nuk ka dosje të bllokuara — të gjitha janë brenda afatit dhe me dokumentet e plota.",
      en: "No blocked dossiers — all are within SLA and fully documented.",
      fr: "Aucun dossier bloqué — tous dans les délais et complets.",
      ar: "لا توجد ملفات معطلة — جميعها ضمن المهلة ومكتملة.",
    });
    return { answer: none, spoken: none, citedFacts: [], source: "data" };
  }

  const top = scored.slice(0, 5);
  const lines = top.map((x) => {
    const reasons: string[] = [];
    if (x.overdue > 0)
      reasons.push(
        L(locale, {
          sq: `vonesë ${x.overdue}d`,
          en: `${x.overdue}d overdue`,
          fr: `${x.overdue}j de retard`,
          ar: `تأخّر ${x.overdue} يوم`,
        })
      );
    if (x.missing > 0)
      reasons.push(
        L(locale, {
          sq: `${x.missing} dok. mungojnë`,
          en: `${x.missing} docs missing`,
          fr: `${x.missing} pièces manquantes`,
          ar: `${x.missing} وثائق ناقصة`,
        })
      );
    return `• ${x.d.reference} — ${phaseName(x.d.currentPhase, locale)} (${reasons.join(", ")})`;
  });

  const header = L(locale, {
    sq: `${scored.length} dosje kërkojnë vëmendje. Më prioritaret:`,
    en: `${scored.length} dossiers need attention. Top priorities:`,
    fr: `${scored.length} dossiers à surveiller. Priorités :`,
    ar: `${scored.length} ملفات تحتاج انتباهاً. الأولويات:`,
  });

  const spoken = `${header} ${top
    .map((x) => x.d.reference)
    .slice(0, 3)
    .join(", ")}.`;

  return {
    answer: [header, ...lines].join("\n"),
    spoken,
    citedFacts: top.map((x) => `${x.d.reference}: ${x.overdue}d / ${x.missing} docs`),
    source: "data",
  };
}

function answerOverview(dossiers: Dossier[], locale: Locale): AssistantReply {
  const total = dossiers.length;
  const byType: Record<string, number> = {};
  for (const d of dossiers) byType[d.type] = (byType[d.type] ?? 0) + 1;
  const openAlerts = dossiers.reduce(
    (n, d) => n + d.alerts.filter((a) => !a.resolvedAt).length,
    0
  );
  const overdue = dossiers.filter(
    (d) => daysInCurrentPhase(d) > phaseSlaDays(d.currentPhase)
  ).length;

  const typeStr = Object.entries(byType)
    .map(([t, n]) => `${n} ${translate(locale, `type.${t}`)}`)
    .join(", ");

  const spoken = L(locale, {
    sq: `Ka ${total} dosje aktive (${typeStr}). ${openAlerts} sinjalizime të hapura dhe ${overdue} dosje me vonesë.`,
    en: `There are ${total} active dossiers (${typeStr}). ${openAlerts} open alerts and ${overdue} overdue.`,
    fr: `Il y a ${total} dossiers actifs (${typeStr}). ${openAlerts} alertes ouvertes et ${overdue} en retard.`,
    ar: `هناك ${total} ملفات نشطة (${typeStr}). ${openAlerts} تنبيهات مفتوحة و${overdue} متأخرة.`,
  });

  return {
    answer: spoken,
    spoken,
    citedFacts: [
      `${translate(locale, "dashboard.totalDossiers")}: ${total}`,
      `${translate(locale, "dashboard.openAlerts")}: ${openAlerts}`,
    ],
    source: "data",
  };
}

function answerFromKnowledge(query: string, locale: Locale): AssistantReply {
  const hits = searchKnowledge(query, locale, 2);
  if (hits.length === 0 || hits[0].score < 2) {
    const none = L(locale, {
      sq: "Mund të përgjigjem vetëm nga procesi zyrtar dhe të dhënat e dosjeve. Provoni ta riformuloni pyetjen.",
      en: "I can only answer from the official process and the dossier data. Try rephrasing your question.",
      fr: "Je ne réponds qu'à partir du processus officiel et des données des dossiers. Reformulez votre question.",
      ar: "أجيب فقط من الإجراء الرسمي وبيانات الملفات. أعد صياغة سؤالك.",
    });
    return { answer: none, spoken: none, citedFacts: [], source: "none" };
  }

  const e: KbEntry = hits[0].entry;
  const lead = L(locale, {
    sq: "Sipas procesit zyrtar",
    en: "According to the official process",
    fr: "Selon le processus officiel",
    ar: "وفقاً للإجراء الرسمي",
  });
  const phase = phaseName(e.phase, locale);
  const proc = translate(locale, `type.${e.process}`);
  const instLabel = L(locale, { sq: "Institucionet", en: "Institutions", fr: "Institutions", ar: "المؤسسات" });
  const baseLabel = L(locale, { sq: "Baza ligjore", en: "Legal basis", fr: "Base légale", ar: "الأساس القانوني" });
  const critLabel = L(locale, { sq: "Pikat kritike", en: "Critical points", fr: "Points critiques", ar: "النقاط الحرجة" });

  const answer = [
    `**${proc} · ${phase}**`,
    e.summary,
    `• ${instLabel}: ${e.institutions.join(", ")}`,
    `• ${baseLabel}: ${e.legalBasis.join("; ")}`,
    `• ${critLabel}: ${e.criticalPoints.join("; ")}`,
  ].join("\n");

  const spoken = `${lead}: ${e.summary} ${instLabel}: ${e.institutions.join(", ")}.`;

  return {
    answer,
    spoken,
    citedFacts: [
      `${proc} → ${phase}`,
      `${baseLabel}: ${e.legalBasis.join("; ")}`,
      `${instLabel}: ${e.institutions.join(", ")}`,
    ],
    source: "process",
  };
}

function listPhases(query: string, dossiers: Dossier[], locale: Locale): AssistantReply | null {
  const qd = deburr(query);
  const wantsEkb = /ekb|privatiz/.test(qd);
  const wantsExp = /explor|foncier|eksplor|ekspropri|expropri/.test(qd);
  const hits = searchKnowledge(query, locale, 14).filter((h) =>
    wantsEkb ? h.entry.process === "ekb_privatization" : wantsExp ? h.entry.process === "exploration" : true
  );
  const proc = wantsEkb ? "ekb_privatization" : "exploration";
  // Build ordered phase list from KB for the chosen process.
  const phases = (
    KB_ORDER[proc as keyof typeof KB_ORDER] || []
  ).map((p) => phaseName(p as Phase, locale));
  if (phases.length === 0) return null;
  const procLabel = translate(locale, `type.${proc}`);
  const spoken = L(locale, {
    sq: `Fazat e procesit ${procLabel} janë: ${phases.join(", ")}.`,
    en: `The phases of the ${procLabel} process are: ${phases.join(", ")}.`,
    fr: `Les phases du processus ${procLabel} sont : ${phases.join(", ")}.`,
    ar: `مراحل إجراء ${procLabel} هي: ${phases.join("، ")}.`,
  });
  return {
    answer: [`**${procLabel}**`, ...phases.map((p, i) => `${i + 1}. ${p}`)].join("\n"),
    spoken,
    citedFacts: [procLabel],
    source: "process",
  };
}

const KB_ORDER = {
  exploration: [
    "intake",
    "reconnaissance",
    "releve_topographique",
    "analyse_juridique",
    "evaluation_domaniale",
    "validation",
    "cloture",
  ],
  ekb_privatization: [
    "intake",
    "instruction",
    "commission_evaluation",
    "appel_offres",
    "adjudication",
    "signature_acte",
    "cloture",
  ],
} as const;

export function askAssistant(opts: {
  query: string;
  dossiers: Dossier[];
  locale: Locale;
  current?: Dossier | null;
}): AssistantReply {
  const { query, dossiers, locale, current } = opts;
  const qd = deburr(query);
  const target = resolveDossier(query, dossiers, current) ?? current ?? undefined;

  // 0) Action intents (create / delete / advance / add document). These never
  // execute here — they return a proposal the UI must have the user approve.
  const detected = detectAction({ query, dossiers, locale, current });
  if (detected) {
    if (isProposal(detected)) {
      return {
        answer: detected.summary,
        spoken: detected.confirmPrompt,
        citedFacts: detected.details.map((d) => `${d.label}: ${d.value}`),
        source: "data",
        pendingAction: detected,
      };
    }
    // Detected an action intent but couldn't fulfil it (needs more info).
    return { answer: detected.answer, spoken: detected.spoken, citedFacts: [], source: "data" };
  }

  // 1) Voice navigation: "open dossier X".
  if (has(qd, KW.open) && target) {
    const spoken = L(locale, {
      sq: `Po hap dosjen ${target.reference}.`,
      en: `Opening dossier ${target.reference}.`,
      fr: `Ouverture du dossier ${target.reference}.`,
      ar: `جارٍ فتح الملف ${target.reference}.`,
    });
    return {
      answer: spoken,
      spoken,
      citedFacts: [target.reference],
      source: "data",
      navigate: `/dossiers/${target.id}`,
      matchedDossierRef: target.reference,
    };
  }

  // 2) Portfolio overview / counts.
  if (has(qd, KW.overview)) return answerOverview(dossiers, locale);

  // 3) Blockages / deadlines / alerts.
  if (has(qd, KW.alerts)) {
    // If a specific dossier is referenced, fall through to summary instead.
    if (!target || !/\b\d{3,5}\b/.test(qd)) return answerBlockages(dossiers, locale);
  }

  // 4) Process "phases / steps" listing.
  if (has(qd, KW.phases)) {
    const r = listPhases(query, dossiers, locale);
    if (r) return r;
  }

  // 5) Dossier-scoped intents.
  if (target) {
    if (has(qd, KW.missing)) return answerMissing(target, locale);
    if (has(qd, KW.next)) return answerNextStep(target, locale);
    if (has(qd, KW.summary)) return summarizeDossier(target, locale);
    // Urgent scope without a dossier handled below; with a dossier, summarize.
    if (has(qd, KW.urgent)) return summarizeDossier(target, locale);
  }

  // 6) "What's missing in urgent dossiers?" (no specific dossier).
  if (has(qd, KW.missing) && has(qd, KW.urgent)) {
    const urgent = dossiers.filter((d) => d.priority === "urgent" || d.priority === "high");
    const withMissing = urgent
      .map((d) => ({ d, miss: missingRequiredDocs(d) }))
      .filter((x) => x.miss.length > 0);
    if (withMissing.length === 0) {
      const none = L(locale, {
        sq: "Asnjë dosje urgjente nuk ka dokumente që mungojnë.",
        en: "No urgent dossier has missing documents.",
        fr: "Aucun dossier urgent n'a de pièce manquante.",
        ar: "لا يوجد ملف عاجل تنقصه وثائق.",
      });
      return { answer: none, spoken: none, citedFacts: [], source: "data" };
    }
    const lines = withMissing.slice(0, 5).map(
      (x) => `• ${x.d.reference}: ${x.miss.map((k) => translate(locale, `doc.${k}`)).join(", ")}`
    );
    const header = L(locale, {
      sq: `${withMissing.length} dosje me përparësi kanë dokumente që mungojnë:`,
      en: `${withMissing.length} priority dossiers have missing documents:`,
      fr: `${withMissing.length} dossiers prioritaires ont des pièces manquantes :`,
      ar: `${withMissing.length} ملفات ذات أولوية تنقصها وثائق:`,
    });
    return {
      answer: [header, ...lines].join("\n"),
      spoken: `${header} ${withMissing.slice(0, 3).map((x) => x.d.reference).join(", ")}.`,
      citedFacts: withMissing.slice(0, 5).map((x) => x.d.reference),
      source: "data",
    };
  }

  // 7) Fallback: grounded answer from the process knowledge base (RAG).
  return answerFromKnowledge(query, locale);
}
