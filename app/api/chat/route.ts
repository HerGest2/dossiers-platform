// Real Claude-powered chat endpoint for the civil-servant assistant ("Doss AI").
//
// This is the genuinely end-to-end AI feature: the browser builds a grounding
// payload (live dossier data + the official process knowledge base) and posts it
// here. We hand that to Claude with strict instructions to answer ONLY from the
// provided context — so the assistant is a real RAG over the process manual, not
// a decorative chat that invents steps.
//
// If ANTHROPIC_API_KEY is not configured, we return 503 and the client silently
// falls back to its local rule-based engine, so the demo still works offline.

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Locale = "sq" | "ar" | "en" | "fr";

interface ChatBody {
  query: string;
  locale: Locale;
  /** Pre-retrieved grounding context (dossier facts + process manual). */
  grounding: string;
  /** Recent turns for follow-up questions. */
  history?: { role: "user" | "assistant"; text: string }[];
}

const LANGUAGE: Record<Locale, string> = {
  sq: "Albanian (Shqip)",
  ar: "Arabic (العربية)",
  en: "English",
  fr: "French (Français)",
};

function systemPrompt(locale: Locale): string {
  const lang = LANGUAGE[locale] ?? LANGUAGE.en;
  return [
    "You are «Doss AI», an assistant that helps civil servants manage Algerian property dossiers",
    "across two procedures: Exploration / foncier (Exploration) and EKB Privatization.",
    "",
    "GROUNDING RULES — these are strict:",
    "- Answer ONLY from the CONTEXT block provided in the user message. The CONTEXT contains",
    "  live dossier data and the official process manual (phases, institutions, legal basis,",
    "  critical points).",
    "- NEVER invent process steps, phases, legal references, deadlines, institutions, or dossier",
    "  facts that are not in the CONTEXT. If the information is not there, say plainly that you",
    "  can only answer from the registered dossiers and the official process, and suggest what",
    "  the user could ask instead.",
    "- When you state a process fact, ground it in the manual (mention the phase/process).",
    "- You are an assistant, not the decision-maker: recommend, never assert that an action was",
    "  taken. Actual changes (creating, advancing, deleting dossiers) are done by the civil",
    "  servant through the interface.",
    "",
    "STYLE:",
    `- Reply in ${lang}. Always answer in this language regardless of the question's language.`,
    "- Be concise and practical — a busy civil servant is reading. Prefer 2-5 sentences or a short",
    "  bulleted list. Use «• » for bullets. You may use **bold** for key terms.",
    "- Lead with the answer, then the supporting detail.",
  ].join("\n");
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // No key configured → tell the client to use its local fallback.
    return NextResponse.json({ error: "no_api_key" }, { status: 503 });
  }

  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const query = (body.query ?? "").trim();
  if (!query) {
    return NextResponse.json({ error: "empty_query" }, { status: 400 });
  }
  const locale: Locale = (["sq", "ar", "en", "fr"] as const).includes(body.locale)
    ? body.locale
    : "en";

  const client = new Anthropic({ apiKey });

  // Keep the last few turns for follow-up context, capped to stay cheap.
  // The Messages API requires the first message to be a user turn, so drop any
  // leading assistant turns left by the sliding window.
  let history = (body.history ?? []).slice(-6);
  while (history.length && history[0].role !== "user") history = history.slice(1);

  const userContent =
    `CONTEXT (the only source of truth — do not go beyond it):\n` +
    `${body.grounding || "(no specific dossier or process context retrieved)"}\n\n` +
    `QUESTION FROM THE CIVIL SERVANT:\n${query}`;

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      system: systemPrompt(locale),
      messages: [
        ...history.map((h) => ({
          role: h.role,
          content: h.text,
        })),
        { role: "user" as const, content: userContent },
      ],
    });

    const answer = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (!answer) {
      return NextResponse.json({ error: "empty_answer" }, { status: 502 });
    }

    return NextResponse.json({ answer });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      // Surface a status the client can log; it will fall back locally.
      return NextResponse.json(
        { error: "claude_error", status: err.status, message: err.message },
        { status: 502 }
      );
    }
    return NextResponse.json({ error: "unknown" }, { status: 500 });
  }
}
