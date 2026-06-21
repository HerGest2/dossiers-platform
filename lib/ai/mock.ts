// MockAI: realistic simulated AI. Reads dossier state, produces believable
// prose that varies each call. All outputs are deterministic-ish given a
// random seed derived from the input, so refreshing gives different text
// while the cited facts stay correct.

import {
  AIProvider,
  phaseDisplayName,
  documentKindDisplayName,
} from "./provider";
import {
  Dossier,
  DossierSummary,
  ExtractionResult,
  NextStepSuggestion,
  Alert,
  DocumentKind,
  Locale,
} from "@/lib/domain/types";
import {
  daysInCurrentPhase,
  missingRequiredDocs,
  nextPhases,
  phaseSlaDays,
} from "@/lib/domain/workflow";

// Cheap seeded RNG so outputs vary per call but a single call is consistent.
function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(arr: T[], r: () => number) => arr[Math.floor(r() * arr.length)];

export class MockAI implements AIProvider {
  async summarizeDossier(
    dossier: Dossier,
    locale: Locale
  ): Promise<DossierSummary> {
    // Small artificial latency to make the "AI thinking" UI feel real.
    await delay(450 + Math.floor(Math.random() * 350));

    const r = rng(`summary-${dossier.id}-${Date.now()}`);
    const phase = phaseDisplayName(dossier.currentPhase, locale);
    const phaseEN = phaseDisplayName(dossier.currentPhase, "en");
    const days = daysInCurrentPhase(dossier);
    const sla = phaseSlaDays(dossier.currentPhase);
    const missing = missingRequiredDocs(dossier);
    const docCount = dossier.documents.length;
    const transitionCount = dossier.phaseHistory.length;
    const next = nextPhases(dossier)[0];

    const citedFacts: string[] = [
      `Current phase: ${phaseEN}`,
      `Days in phase: ${days} (SLA ${sla}d)`,
      `Documents on file: ${docCount}`,
      `Transitions recorded: ${transitionCount}`,
    ];
    if (missing.length) {
      citedFacts.push(
        `Missing required docs: ${missing.map((k) => documentKindDisplayName(k, "en")).join(", ")}`
      );
    }

    const statusPara = compose(
      locale,
      r,
      {
        sq: [
          `Dosja «${dossier.object}» (referenca ${dossier.reference}) ndodhet aktualisht në fazën ${phase.toLowerCase()}, në ${dossier.commune} (${dossier.wilaya}).`,
          days > sla
            ? `Kjo fazë zgjat prej ${days} ditësh, duke tejkaluar afatin (SLA) prej ${sla} ditësh.`
            : days > sla * 0.5
            ? `Dosja po ecën përpara: ${days} ditë nga ${sla} ditë të afatit.`
            : `Dosja sapo ka hyrë në këtë fazë (${days} ditë).`,
          docCount === 0
            ? "Asnjë dokument nuk është ngarkuar ende në dosje."
            : `${docCount} dokument(e) janë tashmë në dosje, përgjatë ${transitionCount} kalim(e) fazash të regjistruara.`,
        ],
        fr: [
          `Le dossier « ${dossier.object} » (référence ${dossier.reference}) est actuellement en phase de ${phase.toLowerCase()}, à ${dossier.commune} (${dossier.wilaya}).`,
          days > sla
            ? `Cette phase dure depuis ${days} jours, dépassant le SLA de ${sla} jours.`
            : days > sla * 0.5
            ? `Le dossier progresse : ${days} jours écoulés sur un SLA de ${sla} jours.`
            : `Le dossier vient d'entrer dans cette phase (${days} jour${days > 1 ? "s" : ""}).`,
          docCount === 0
            ? "Aucun document n'a encore été versé au dossier."
            : `${docCount} document${docCount > 1 ? "s" : ""} sont déjà au dossier, sur ${transitionCount} transition${transitionCount > 1 ? "s" : ""} de phase enregistrée${transitionCount > 1 ? "s" : ""}.`,
        ],
        ar: [
          `الملف «${dossier.object}» (مرجع ${dossier.reference}) في مرحلة ${phase}، ببلدية ${dossier.commune} (ولاية ${dossier.wilaya}).`,
          days > sla
            ? `هذه المرحلة مستمرة منذ ${days} يومًا، متجاوزةً المحدد الزمني ${sla} يومًا.`
            : days > sla * 0.5
            ? `الملف يتقدم: ${days} يومًا من أصل ${sla} يومًا.`
            : `الملف في بداية هذه المرحلة (${days} يوم).`,
        ],
        en: [
          `Dossier "${dossier.object}" (ref ${dossier.reference}) is in the ${phaseEN} phase, located in ${dossier.commune}, ${dossier.wilaya}.`,
          days > sla
            ? `This phase has lasted ${days} days, exceeding the ${sla}-day SLA.`
            : days > sla * 0.5
            ? `The dossier is progressing: ${days} of ${sla} days elapsed.`
            : `The dossier has just entered this phase (${days} day${days > 1 ? "s" : ""}).`,
          docCount === 0
            ? "No documents have been uploaded yet."
            : `${docCount} document${docCount > 1 ? "s" : ""} on file, across ${transitionCount} recorded phase transition${transitionCount > 1 ? "s" : ""}.`,
        ],
      }
    );

    const missingPara = compose(
      locale,
      r,
      {
        sq: missing.length
          ? [
              `Mungojnë ${missing.length} dokument(e) të detyrueshme për fazën aktuale: ${missing
                  .map((k) => documentKindDisplayName(k, locale).toLowerCase())
                  .join(", ")}.`,
              docCount < transitionCount + 1
                ? "Dosja duket gjithashtu e padokumentuar mjaftueshëm krahasuar me numrin e kalimeve të fazave."
                : "Numri i dokumenteve është në përputhje me ecurinë.",
            ]
          : [
              "Të gjitha dokumentet e detyrueshme për fazën aktuale janë të pranishme në dosje.",
              "Asnjë veprim dokumentar nuk është bllokues në këtë fazë.",
            ],
        fr: missing.length
          ? [
              `Il manque ${missing.length} pièce${missing.length > 1 ? "s" : ""} obligatoire${missing.length > 1 ? "s" : ""} pour la phase en cours : ${missing
                  .map((k) => documentKindDisplayName(k, locale).toLowerCase())
                  .join(", ")}.`,
              docCount < transitionCount + 1
                ? "Le dossier semble également manquer de pièces justificatives par rapport au nombre de transitions franchies."
                : "Le décompte documentaire est cohérent avec l'avancement.",
            ]
          : [
              "Toutes les pièces obligatoires pour la phase en cours sont présentes au dossier.",
              "Aucune action documentaire n'est bloquante à ce stade.",
            ],
        ar: missing.length
          ? [
              `يوجد ${missing.length} وثيقة${missing.length > 1 ? "" : ""} مطلوبة${missing.length > 1 ? "" : ""} للمرحلة الحالية غير موجودة: ${missing
                  .map((k) => documentKindDisplayName(k, locale))
                  .join("، ")}.`,
            ]
          : ["جميع الوثائق المطلوبة للمرحلة الحالية متوفرة."],
        en: missing.length
          ? [
              `${missing.length} required document${missing.length > 1 ? "s are" : " is"} missing for the current phase: ${missing
                  .map((k) => documentKindDisplayName(k, locale))
                  .join(", ")}.`,
              docCount < transitionCount + 1
                ? "The dossier also seems under-documented relative to the number of phase transitions reached."
                : "Document count is consistent with progress.",
            ]
          : [
              "All required documents for the current phase are present.",
              "No documentary action is blocking at this stage.",
            ],
      }
    );

    const nextPara = compose(
      locale,
      r,
      {
        sq: next
          ? [
              `Hapi tjetër i rekomanduar: kalimi në fazën ${phaseDisplayName(next, locale).toLowerCase()}.`,
              missing.length
                ? "Ky kalim do të jetë bllokues derisa të ngarkohen dokumentet që mungojnë."
                : "Kalimi është gati: nuk u identifikua asnjë dokument bllokues.",
              days > sla
                ? "Duke pasur parasysh vonesën, jepini përparësi kalimit sa më shpejt të jetë e mundur."
                : "Përgatisni paralelisht dosjen për kalimin.",
            ]
          : ["Dosja është në fazën përfundimtare — vazhdoni me mbylljen."],
        fr: next
          ? [
              `Prochaine étape recommandée : passer en phase de ${phaseDisplayName(next, locale).toLowerCase()}.`,
              missing.length
                ? "Cette transition sera bloquante tant que les pièces manquantes ne sont pas versées."
                : "La transition est prête : aucune pièce bloquante identifiée.",
              days > sla
                ? "Compte tenu du retard, prioriser la transition dès que possible."
                : "Préparer le dossier de transition en parallèle.",
            ]
          : ["Le dossier est en phase finale — procéder à la clôture."],
        ar: next
          ? [
              `الخطوة الموصى بها: الانتقال إلى مرحلة ${phaseDisplayName(next, locale)}.`,
            ]
          : ["الملف في مرحلته الأخيرة — يمكن إغلاقه."],
        en: next
          ? [
              `Recommended next step: advance to the ${phaseDisplayName(next, locale)} phase.`,
              missing.length
                ? "This transition will be blocked until the missing documents are uploaded."
                : "The transition is ready: no blocking documents identified.",
              days > sla
                ? "Given the delay, prioritize the transition as soon as possible."
                : "Prepare the transition package in parallel.",
            ]
          : ["The dossier is in its final phase — proceed with closure."],
      }
    );

    return {
      statusParagraph: statusPara,
      missingParagraph: missingPara,
      nextStepParagraph: nextPara,
      citedFacts,
      generatedAt: new Date().toISOString(),
      confidence: 0.72 + r() * 0.18, // 0.72..0.90
    };
  }

  async extractDocumentFields(
    file: { name: string; sizeBytes: number; mimeType: string },
    existing: Partial<Dossier>,
    locale: Locale
  ): Promise<ExtractionResult> {
    await delay(600 + Math.floor(Math.random() * 500));

    const r = rng(`extract-${file.name}-${file.sizeBytes}-${Date.now()}`);
    const lower = file.name.toLowerCase();

    // Heuristic detection
    const detectedKind: DocumentKind =
      lower.includes("titre") || lower.includes("title")
        ? "titre_propriete"
        : lower.includes("plan") || lower.includes("cadastr")
        ? "plan_cadastral"
        : lower.includes("relev") || lower.includes("topo")
        ? "releve_topographique"
        : lower.includes("certificat") || lower.includes("urban")
        ? "certificat_urbanisme"
        : lower.includes("evalu") || lower.includes("domanial")
        ? "evaluation_domaniale"
        : lower.includes("pv") && lower.includes("recon")
        ? "pv_reconnaissance"
        : lower.includes("juridiq") || lower.includes("rapport")
        ? "rapport_juridique"
        : lower.includes("commiss") || lower.includes("decision")
        ? "decision_commission"
        : lower.includes("cahier")
        ? "cahier_charges"
        : lower.includes("offre")
        ? "offre_achat"
        : lower.includes("adjudic")
        ? "pv_adjudication"
        : lower.includes("acte") || lower.includes("signature")
        ? "acte_signature"
        : "autre";

    const fields: Record<string, string | number | null> = {};
    const conf: Record<string, number> = {};

    // Reference
    if (!existing.reference) {
      const ref = `${(existing.type ?? "EXP").toUpperCase().slice(0, 3)}-${new Date().getFullYear()}-${Math.floor(1000 + r() * 9000)}`;
      fields.reference = ref;
      conf.reference = 0.88;
    }
    // Wilaya / commune
    if (!existing.wilaya) {
      const wilayas = ["Alger", "Blida", "Boumerdès", "Tipaza", "Bouira", "Médéa"];
      fields.wilaya = pick(wilayas, r);
      conf.wilaya = 0.82;
    }
    if (!existing.commune) {
      const communes: Record<string, string[]> = {
        Alger: ["Bab El Oued", "Hydra", "El Harrach", "Bir Mourad Rais"],
        Blida: ["Blida", "Boufarik", "Beni Tamou"],
        Boumerdès: ["Boumerdès", "Bordj Menaïel", "Dellys"],
        Tipaza: ["Tipaza", "Cherchell", "Hadjout"],
        Bouira: ["Bouira", "Lakhdaria", "Sour El Ghozlane"],
        Médéa: ["Médéa", "Berrouaghia", "Ksar El Boukhari"],
      };
      const w = (fields.wilaya as string) || existing.wilaya || "Alger";
      const list = communes[w] ?? communes.Alger;
      fields.commune = pick(list, r);
      conf.commune = 0.8;
    }
    // Surface
    if (existing.surfaceM2 == null) {
      fields.surface_m2 = Math.floor(80 + r() * 1200);
      conf.surface_m2 = 0.74;
    }
    // Value
    if (existing.estimatedValueDzd == null) {
      const surface = (fields.surface_m2 as number) ?? 200;
      fields.value_dzd = Math.floor(surface * (15000 + r() * 45000));
      conf.value_dzd = 0.69;
    }
    // Date
    fields.date = new Date(Date.now() - Math.floor(r() * 365) * 86400000)
      .toISOString()
      .slice(0, 10);
    conf.date = 0.93;
    // Parties
    if (!existing.parties || existing.parties.length === 0) {
      const surnames = ["Benali", "Saïdi", "Hammoudi", "Kaci", "Mansouri", "Belkacem", "Cherif"];
      const given = ["Mohamed", "Karim", "Said", "Fatima", "Amina", "Yacine", "Rachid"];
      fields.parties = `${pick(given, r)} ${pick(surnames, r)}`;
      conf.parties = 0.71;
    }

    const notes: string[] = [];
    if (locale === "sq") {
      notes.push(
        `Dokumenti u identifikua si «${documentKindDisplayName(detectedKind, locale).toLowerCase()}» nga emri i skedarit.`
      );
      if (file.sizeBytes < 50_000) {
        notes.push(
          "Skedar i vogël: besueshmëria për disa fusha është e reduktuar."
        );
      }
    } else if (locale === "fr") {
      notes.push(
        `Document identifié comme « ${documentKindDisplayName(detectedKind, locale).toLowerCase()} » à partir du nom de fichier.`
      );
      if (file.sizeBytes < 50_000) {
        notes.push(
          "Document de petite taille : certains champs ont une confiance réduite."
        );
      }
    } else if (locale === "ar") {
      notes.push(
        `تم تحديد الوثيقة كـ «${documentKindDisplayName(detectedKind, locale)}» بناءً على اسم الملف.`
      );
    } else {
      notes.push(
        `Detected as "${documentKindDisplayName(detectedKind, locale)}" from filename.`
      );
      if (file.sizeBytes < 50_000) {
        notes.push("Small file size: confidence on some fields is reduced.");
      }
    }

    return {
      fields,
      confidence: conf,
      detectedDocumentKind: detectedKind,
      notes,
    };
  }

  async suggestNextStep(
    dossier: Dossier,
    locale: Locale
  ): Promise<NextStepSuggestion> {
    await delay(350 + Math.floor(Math.random() * 250));

    const r = rng(`next-${dossier.id}-${Date.now()}`);
    const candidates = nextPhases(dossier);
    if (candidates.length === 0) {
      return {
        recommendedPhase: dossier.currentPhase,
        explanation:
          locale === "sq"
            ? "Dosja është në fazën përfundimtare — asnjë kalim nuk është i mundur."
            : locale === "fr"
            ? "Le dossier est en phase finale — aucune transition possible."
            : locale === "ar"
            ? "الملف في مرحلته الأخيرة — لا يمكن الانتقال."
            : "The dossier is at its final phase — no transition is possible.",
        citedFacts: ["Final phase reached."],
        confidence: 1,
      };
    }

    const missing = missingRequiredDocs(dossier);
    const days = daysInCurrentPhase(dossier);
    const sla = phaseSlaDays(dossier.currentPhase);

    // Prefer the natural next phase, but if missing docs exist, mention them.
    const recommended = candidates[0];
    const citedFacts: string[] = [
      `Current phase: ${phaseDisplayName(dossier.currentPhase, "en")}`,
      `Days elapsed: ${days} (SLA ${sla}d)`,
    ];
    if (missing.length) {
      citedFacts.push(
        `Blocking missing: ${missing.map((k) => documentKindDisplayName(k, "en")).join(", ")}`
      );
    }
    citedFacts.push(
      `Documents on file: ${dossier.documents.length} of expected ${Math.max(dossier.phaseHistory.length, 1) + 1}`
    );

    let explanation: string;
    if (locale === "sq") {
      explanation = missing.length
        ? `Rekomandohet kalimi në fazën «${phaseDisplayName(recommended, locale).toLowerCase()}», por së pari duhet të ngarkohen ${missing.length} dokument(e) të detyrueshme.`
        : days > sla
        ? `Dosja është me vonesë (${days}d > SLA ${sla}d). Jepini përparësi kalimit në «${phaseDisplayName(recommended, locale).toLowerCase()}» sapo të përfundojnë kontrollet rutinë.`
        : `Kalim standard në «${phaseDisplayName(recommended, locale).toLowerCase()}». Kushtet minimale janë plotësuar.`;
    } else if (locale === "fr") {
      explanation = missing.length
        ? `Recommander le passage à la phase « ${phaseDisplayName(recommended, locale).toLowerCase()} », mais ${missing.length} pièce${missing.length > 1 ? "s" : ""} obligatoire${missing.length > 1 ? "s" : ""} doi${missing.length > 1 ? "vent" : "t"} être versée${missing.length > 1 ? "s" : ""} au préalable.`
        : days > sla
        ? `Le dossier est en retard (${days}j > SLA ${sla}j). Prioriser la transition vers « ${phaseDisplayName(recommended, locale).toLowerCase()} » dès que les vérifications de routine sont terminées.`
        : `Transition standard vers « ${phaseDisplayName(recommended, locale).toLowerCase()} ». Les conditions minimales sont remplies.`;
    } else if (locale === "ar") {
      explanation = missing.length
        ? `يُنصح بالانتقال إلى «${phaseDisplayName(recommended, locale)}»، لكن يلزم رفع ${missing.length} وثيقة${missing.length > 1 ? "" : ""} أولاً.`
        : `انتقال قياسي إلى «${phaseDisplayName(recommended, locale)}». الحد الأدنى من الشروط متوفر.`;
    } else {
      explanation = missing.length
        ? `Recommend moving to "${phaseDisplayName(recommended, locale)}", but ${missing.length} required document${missing.length > 1 ? "s" : ""} must be uploaded first.`
        : days > sla
        ? `Dossier is delayed (${days}d > ${sla}d SLA). Prioritize the transition to "${phaseDisplayName(recommended, locale)}" once routine checks are complete.`
        : `Standard transition to "${phaseDisplayName(recommended, locale)}". Minimum conditions are met.`;
    }

    return {
      recommendedPhase: recommended,
      explanation,
      citedFacts,
      confidence: missing.length ? 0.78 : 0.89,
    };
  }

  async annotateAlerts(
    alerts: Alert[],
    locale: Locale
  ): Promise<Alert[]> {
    await delay(150);
    // The mock just translates the recommendation field to the requested locale.
    return alerts.map((a) => ({
      ...a,
      recommendation: a.recommendation, // already written in English; could be translated
    }));
  }
}

function compose(
  locale: Locale,
  r: () => number,
  parts: Partial<Record<Locale, string[]>>
): string {
  const arr = parts[locale] ?? parts.sq ?? parts.en ?? [];
  return arr.filter(Boolean).join(" ");
}

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}