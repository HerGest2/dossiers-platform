// AI generation of a standard administrative letter / decision for a dossier.
//
// Two paths, same response shape:
//  - With ANTHROPIC_API_KEY: Claude (claude-opus-4-8) drafts a formal document
//    grounded ONLY in the dossier facts the client sends — unknown specifics
//    become bracketed placeholders, nothing is invented.
//  - Without a key (or on API error): we fill a standard server-side template in
//    the requested language. Unlike /api/chat this route never fails hard — an
//    offline template is genuinely useful, so the feature always produces a draft.

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Locale = "sq" | "ar" | "en" | "fr";
type LetterType = "notification" | "decision" | "request_documents";

interface LetterFields {
  reference: string;
  typeLabel: string;
  object: string;
  location: string;
  phaseLabel: string;
  parties: string[];
  surface?: string;
  value?: string;
  missing: string[];
  date: string;
  assignee: string;
}

interface LetterBody {
  letterType: LetterType;
  locale: Locale;
  fields: LetterFields;
}

const LANGUAGE: Record<Locale, string> = {
  sq: "Albanian (Shqip)",
  ar: "Arabic (العربية)",
  en: "English",
  fr: "French (Français)",
};

const DOC_TITLE: Record<LetterType, Record<Locale, string>> = {
  notification: {
    sq: "Njoftim",
    ar: "إشعار",
    en: "Notification",
    fr: "Notification",
  },
  decision: {
    sq: "Vendim administrativ",
    ar: "قرار إداري",
    en: "Administrative decision",
    fr: "Décision administrative",
  },
  request_documents: {
    sq: "Kërkesë për dokumente",
    ar: "طلب وثائق",
    en: "Request for documents",
    fr: "Demande de pièces",
  },
};

function factsText(f: LetterFields): string {
  const lines = [
    `Reference: ${f.reference}`,
    `Procedure: ${f.typeLabel}`,
    `Subject / object: ${f.object}`,
    `Location: ${f.location}`,
    `Current phase: ${f.phaseLabel}`,
    f.parties.length ? `Parties involved: ${f.parties.join(", ")}` : "",
    f.surface ? `Surface: ${f.surface}` : "",
    f.value ? `Estimated value: ${f.value}` : "",
    f.missing.length ? `Outstanding documents: ${f.missing.join(", ")}` : "All required documents are on file.",
    `Date: ${f.date}`,
    `Responsible officer: ${f.assignee}`,
  ];
  return lines.filter(Boolean).join("\n");
}

function systemPrompt(letterType: LetterType, locale: Locale): string {
  const lang = LANGUAGE[locale] ?? LANGUAGE.en;
  const kind = DOC_TITLE[letterType][locale] ?? DOC_TITLE[letterType].en;
  return [
    "You draft formal administrative documents for an Algerian public administration that manages",
    "property dossiers (land exploration and EKB privatization procedures).",
    "",
    `Produce a complete, ready-to-review «${kind}» as plain text, written entirely in ${lang}.`,
    "",
    "RULES:",
    "- Use ONLY the facts in the DOSSIER FACTS block. Do not invent names, dates, amounts, article",
    "  numbers, or legal references that are not provided.",
    "- For any required element that is not in the facts (signatory name, exact address, decision",
    "  number, deadline, place), insert a clearly bracketed placeholder such as [date], [signatory],",
    "  [decision number] so a civil servant can fill it in.",
    "- Use a formal administrative register and a conventional layout (header, date, reference,",
    "  subject, body, closing, signature block).",
    "- Output ONLY the document text — no preamble, no explanation, no markdown fences.",
  ].join("\n");
}

/* ----------------------------- offline templates ---------------------------- */

function bullet(items: string[], fallback: string): string {
  if (!items.length) return fallback;
  return items.map((i) => `  - ${i}`).join("\n");
}

function template(letterType: LetterType, locale: Locale, f: LetterFields): string {
  const parties = f.parties.length ? f.parties.join(", ") : null;
  const title = DOC_TITLE[letterType][locale] ?? DOC_TITLE[letterType].en;

  if (locale === "fr") {
    const to = parties ?? "[partie concernée]";
    if (letterType === "decision") {
      return [
        "[Administration / Service]",
        `DÉCISION N° [____]`,
        ``,
        `Date : ${f.date}`,
        `Réf. : ${f.reference}`,
        ``,
        `Objet : dossier ${f.reference} — ${f.object}, sis à ${f.location} (procédure ${f.typeLabel}).`,
        ``,
        `Vu les pièces versées au dossier ;`,
        `Vu l'état d'avancement de la procédure (phase « ${f.phaseLabel} ») ;`,
        f.missing.length ? `Considérant que les pièces suivantes restent à fournir : ${f.missing.join(", ")} ;` : ``,
        ``,
        `DÉCIDE :`,
        ``,
        `Article 1er : [préciser la décision relative au dossier ${f.reference}].`,
        `Article 2 : La présente décision sera notifiée à ${to}.`,
        ``,
        `Fait à [lieu], le ${f.date}.`,
        ``,
        `[Nom et qualité du signataire]`,
        f.assignee,
      ].filter((l) => l !== null).join("\n");
    }
    if (letterType === "request_documents") {
      return [
        "[Administration / Service]",
        ``,
        `Date : ${f.date}`,
        `Réf. : ${f.reference}`,
        ``,
        `Objet : Demande de pièces — dossier ${f.reference}`,
        ``,
        `À : ${to}`,
        ``,
        `Madame, Monsieur,`,
        ``,
        `Afin de poursuivre le traitement de votre dossier ${f.reference} relatif à ${f.object} (${f.location}), actuellement en phase « ${f.phaseLabel} », nous vous prions de bien vouloir fournir la ou les pièce(s) suivante(s) :`,
        bullet(f.missing, "  - [préciser les pièces requises]"),
        ``,
        `Merci de les transmettre dans un délai de [____] jours. À défaut, le traitement de votre dossier pourrait être retardé.`,
        ``,
        `Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.`,
        ``,
        `[Nom et qualité du signataire]`,
        f.assignee,
      ].join("\n");
    }
    // notification
    return [
      "[Administration / Service]",
      ``,
      `Date : ${f.date}`,
      `Réf. : ${f.reference}`,
      ``,
      `Objet : Notification relative au dossier ${f.reference} — ${f.object}`,
      ``,
      `À : ${to}`,
      ``,
      `Madame, Monsieur,`,
      ``,
      `Nous vous informons que votre dossier ${f.reference} concernant ${f.object}, sis à ${f.location}, est actuellement en phase « ${f.phaseLabel} » de la procédure ${f.typeLabel}.`,
      f.missing.length
        ? `Pour poursuivre, les pièces suivantes restent nécessaires : ${f.missing.join(", ")}.`
        : `Aucune pièce complémentaire n'est requise de votre part à ce stade.`,
      ``,
      `Vous pouvez suivre l'avancement de votre dossier à l'aide de son numéro de référence. Nous restons à votre disposition pour tout complément d'information.`,
      ``,
      `Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.`,
      ``,
      `[Nom et qualité du signataire]`,
      f.assignee,
    ].join("\n");
  }

  if (locale === "ar") {
    const to = parties ?? "[الطرف المعني]";
    if (letterType === "decision") {
      return [
        "[الإدارة / المصلحة]",
        `قرار رقم [____]`,
        ``,
        `التاريخ: ${f.date}`,
        `المرجع: ${f.reference}`,
        ``,
        `الموضوع: الملف ${f.reference} — ${f.object}، الكائن بـ ${f.location} (إجراء ${f.typeLabel}).`,
        ``,
        `بناءً على الوثائق المدرجة في الملف؛`,
        `بناءً على مرحلة تقدّم الإجراء («${f.phaseLabel}»)؛`,
        f.missing.length ? `وحيث إن الوثائق التالية لا تزال مطلوبة: ${f.missing.join("، ")}؛` : ``,
        ``,
        `يُقرّر ما يلي:`,
        ``,
        `المادة 1: [تحديد القرار المتعلق بالملف ${f.reference}].`,
        `المادة 2: يُبلَّغ هذا القرار إلى ${to}.`,
        ``,
        `حُرّر بـ [المكان]، في ${f.date}.`,
        ``,
        `[الاسم وصفة الموقّع]`,
        f.assignee,
      ].filter((l) => l !== "").join("\n");
    }
    if (letterType === "request_documents") {
      return [
        "[الإدارة / المصلحة]",
        ``,
        `التاريخ: ${f.date}`,
        `المرجع: ${f.reference}`,
        ``,
        `الموضوع: طلب وثائق — الملف ${f.reference}`,
        ``,
        `إلى: ${to}`,
        ``,
        `تحية طيبة وبعد،`,
        ``,
        `بغية متابعة معالجة ملفكم ${f.reference} المتعلق بـ ${f.object} (${f.location})، والموجود حالياً في مرحلة «${f.phaseLabel}»، يُرجى منكم تقديم الوثيقة (الوثائق) التالية:`,
        bullet(f.missing, "  - [تحديد الوثائق المطلوبة]"),
        ``,
        `يُرجى تقديمها خلال [____] يوماً. وفي حال عدم ذلك، قد يتأخر معالجة ملفكم.`,
        ``,
        `وتفضلوا بقبول فائق الاحترام والتقدير.`,
        ``,
        `[الاسم وصفة الموقّع]`,
        f.assignee,
      ].join("\n");
    }
    return [
      "[الإدارة / المصلحة]",
      ``,
      `التاريخ: ${f.date}`,
      `المرجع: ${f.reference}`,
      ``,
      `الموضوع: إشعار بخصوص الملف ${f.reference} — ${f.object}`,
      ``,
      `إلى: ${to}`,
      ``,
      `تحية طيبة وبعد،`,
      ``,
      `نُعلمكم أن ملفكم ${f.reference} المتعلق بـ ${f.object}، الكائن بـ ${f.location}، يوجد حالياً في مرحلة «${f.phaseLabel}» من إجراء ${f.typeLabel}.`,
      f.missing.length
        ? `وللمتابعة، لا تزال الوثائق التالية مطلوبة: ${f.missing.join("، ")}.`
        : `لا تُطلب منكم أي وثيقة إضافية في هذه المرحلة.`,
      ``,
      `يمكنكم متابعة تقدّم ملفكم باستعمال رقمه المرجعي. ونبقى رهن إشارتكم لأي معلومة إضافية.`,
      ``,
      `وتفضلوا بقبول فائق الاحترام والتقدير.`,
      ``,
      `[الاسم وصفة الموقّع]`,
      f.assignee,
    ].join("\n");
  }

  if (locale === "sq") {
    const to = parties ?? "[pala e interesuar]";
    if (letterType === "decision") {
      return [
        "[Administrata / Shërbimi]",
        `VENDIM Nr. [____]`,
        ``,
        `Data: ${f.date}`,
        `Ref.: ${f.reference}`,
        ``,
        `Objekti: dosja ${f.reference} — ${f.object}, e ndodhur në ${f.location} (procedura ${f.typeLabel}).`,
        ``,
        `Duke pasur parasysh dokumentet e dosjes;`,
        `Duke pasur parasysh fazën aktuale të procedurës («${f.phaseLabel}»);`,
        f.missing.length ? `Duke konsideruar se mungojnë ende dokumentet: ${f.missing.join(", ")};` : ``,
        ``,
        `VENDOS:`,
        ``,
        `Neni 1: [përcaktoni vendimin për dosjen ${f.reference}].`,
        `Neni 2: Ky vendim i njoftohet ${to}.`,
        ``,
        `Bërë në [vendi], më ${f.date}.`,
        ``,
        `[Emri dhe funksioni i nënshkruesit]`,
        f.assignee,
      ].filter((l) => l !== "").join("\n");
    }
    if (letterType === "request_documents") {
      return [
        "[Administrata / Shërbimi]",
        ``,
        `Data: ${f.date}`,
        `Ref.: ${f.reference}`,
        ``,
        `Objekti: Kërkesë për dokumente — dosja ${f.reference}`,
        ``,
        `Për: ${to}`,
        ``,
        `I/E nderuar,`,
        ``,
        `Për të vazhduar trajtimin e dosjes suaj ${f.reference} në lidhje me ${f.object} (${f.location}), aktualisht në fazën «${f.phaseLabel}», ju lutemi të paraqisni dokumentin/dokumentet e mëposhtme:`,
        bullet(f.missing, "  - [përcaktoni dokumentet e kërkuara]"),
        ``,
        `Ju lutemi t'i dorëzoni brenda [____] ditësh. Në të kundërt, trajtimi i dosjes suaj mund të vonohet.`,
        ``,
        `Me respekt,`,
        ``,
        `[Emri dhe funksioni i nënshkruesit]`,
        f.assignee,
      ].join("\n");
    }
    return [
      "[Administrata / Shërbimi]",
      ``,
      `Data: ${f.date}`,
      `Ref.: ${f.reference}`,
      ``,
      `Objekti: Njoftim në lidhje me dosjen ${f.reference} — ${f.object}`,
      ``,
      `Për: ${to}`,
      ``,
      `I/E nderuar,`,
      ``,
      `Ju njoftojmë se dosja juaj ${f.reference} në lidhje me ${f.object}, e ndodhur në ${f.location}, është aktualisht në fazën «${f.phaseLabel}» të procedurës ${f.typeLabel}.`,
      f.missing.length
        ? `Për të vazhduar, mungojnë ende dokumentet: ${f.missing.join(", ")}.`
        : `Në këtë fazë nuk kërkohet asnjë dokument shtesë nga ju.`,
      ``,
      `Mund të ndiqni ecurinë e dosjes suaj me numrin e referencës. Mbetemi në dispozicionin tuaj për çdo informacion shtesë.`,
      ``,
      `Me respekt,`,
      ``,
      `[Emri dhe funksioni i nënshkruesit]`,
      f.assignee,
    ].join("\n");
  }

  // English (default)
  const to = parties ?? "[the concerned party]";
  if (letterType === "decision") {
    return [
      "[Administration / Service]",
      `DECISION No. [____]`,
      ``,
      `Date: ${f.date}`,
      `Ref.: ${f.reference}`,
      ``,
      `Subject: dossier ${f.reference} — ${f.object}, located in ${f.location} (${f.typeLabel} procedure).`,
      ``,
      `Considering the documents on file;`,
      `Considering the current stage of the procedure ("${f.phaseLabel}");`,
      f.missing.length ? `Considering that the following documents remain outstanding: ${f.missing.join(", ")};` : ``,
      ``,
      `DECIDES:`,
      ``,
      `Article 1: [state the decision regarding dossier ${f.reference}].`,
      `Article 2: The present decision shall be notified to ${to}.`,
      ``,
      `Done at [place], on ${f.date}.`,
      ``,
      `[Name and title of signatory]`,
      f.assignee,
    ].filter((l) => l !== "").join("\n");
  }
  if (letterType === "request_documents") {
    return [
      "[Administration / Service]",
      ``,
      `Date: ${f.date}`,
      `Ref.: ${f.reference}`,
      ``,
      `Subject: Request for documents — dossier ${f.reference}`,
      ``,
      `To: ${to}`,
      ``,
      `Dear Madam/Sir,`,
      ``,
      `In order to continue processing your dossier ${f.reference} concerning ${f.object} (${f.location}), currently at the "${f.phaseLabel}" stage, we kindly ask you to provide the following document(s):`,
      bullet(f.missing, "  - [list the required documents]"),
      ``,
      `Please submit them within [____] days. Failing this, the processing of your dossier may be delayed.`,
      ``,
      `Yours faithfully,`,
      ``,
      `[Name and title of signatory]`,
      f.assignee,
    ].join("\n");
  }
  return [
    "[Administration / Service]",
    ``,
    `Date: ${f.date}`,
    `Ref.: ${f.reference}`,
    ``,
    `Subject: Notification regarding dossier ${f.reference} — ${f.object}`,
    ``,
    `To: ${to}`,
    ``,
    `Dear Madam/Sir,`,
    ``,
    `We hereby inform you that your dossier ${f.reference} concerning ${f.object}, located in ${f.location}, is currently at the "${f.phaseLabel}" stage of the ${f.typeLabel} procedure.`,
    f.missing.length
      ? `To proceed, the following documents are still required: ${f.missing.join(", ")}.`
      : `No further documents are required from you at this stage.`,
    ``,
    `You may follow the progress of your dossier using its reference number. We remain at your disposal for any further information.`,
    ``,
    `Yours faithfully,`,
    ``,
    `[Name and title of signatory]`,
    f.assignee,
  ].join("\n");
}

/* --------------------------------- handler -------------------------------- */

export async function POST(req: NextRequest) {
  let body: LetterBody;
  try {
    body = (await req.json()) as LetterBody;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const types: LetterType[] = ["notification", "decision", "request_documents"];
  const letterType: LetterType = types.includes(body.letterType) ? body.letterType : "notification";
  const locale: Locale = (["sq", "ar", "en", "fr"] as const).includes(body.locale) ? body.locale : "en";
  const fields = body.fields;
  if (!fields || !fields.reference) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  // No key → fill the offline template (still a useful draft).
  if (!apiKey) {
    return NextResponse.json({ letter: template(letterType, locale, fields), generated: "template" });
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1500,
      system: systemPrompt(letterType, locale),
      messages: [
        {
          role: "user",
          content:
            `DOSSIER FACTS (the only source of truth — do not go beyond it):\n${factsText(fields)}\n\n` +
            `Draft the «${DOC_TITLE[letterType][locale]}» now.`,
        },
      ],
    });
    const letter = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (!letter) {
      return NextResponse.json({ letter: template(letterType, locale, fields), generated: "template" });
    }
    return NextResponse.json({ letter, generated: "claude" });
  } catch {
    // On any Claude error, fall back to the template so the user still gets a draft.
    return NextResponse.json({ letter: template(letterType, locale, fields), generated: "template" });
  }
}
