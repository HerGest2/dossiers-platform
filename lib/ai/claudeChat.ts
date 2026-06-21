// Client-side bridge to the real Claude chat endpoint (app/api/chat).
//
// Responsibilities:
//  1. Retrieve grounding locally — the live dossier data the question is about
//     plus the most relevant entries from the official process knowledge base.
//  2. POST that grounding + the question to /api/chat, which calls Claude.
//  3. Return an AssistantReply, or null if Claude is unavailable (no API key /
//     network error) so the caller can fall back to the local rule engine.
//
// Retrieving grounding here (rather than on the server) keeps the API route
// stateless and means the citations shown in the UI are exactly what Claude saw.

import { Dossier, Locale } from "@/lib/domain/types";
import { translate } from "@/lib/i18n/config";
import {
  daysInCurrentPhase,
  missingRequiredDocs,
  nextPhases,
  phaseSlaDays,
} from "@/lib/domain/workflow";
import { searchKnowledge } from "./knowledgeBase";
import { AssistantReply, AssistantSource } from "./assistant";

function deburr(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Resolve a dossier the question is about: by reference, "this", or fuzzy match. */
function resolveDossier(
  query: string,
  dossiers: Dossier[],
  current?: Dossier | null
): Dossier | undefined {
  const qd = deburr(query);
  const refMatch = qd.match(/[a-z]{2,4}[-\s]?\d{4}[-\s]?\d{2,5}/i);
  if (refMatch) {
    const norm = refMatch[0].replace(/\s+/g, "-");
    const found = dossiers.find((d) => {
      const r = deburr(d.reference).replace(/\s+/g, "-");
      return r.includes(norm) || norm.includes(r);
    });
    if (found) return found;
  }
  if (current && /\b(this|current|kjo|kete|këtë|ce|cette|celui|هذا|هذه|الحالي)\b/.test(qd)) {
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

function describeDossier(d: Dossier, locale: Locale): string {
  const phase = translate(locale, `phase.${d.currentPhase}`);
  const days = daysInCurrentPhase(d);
  const sla = phaseSlaDays(d.currentPhase);
  const missing = missingRequiredDocs(d).map((k) => translate(locale, `doc.${k}`));
  const next = nextPhases(d)[0];
  const openAlerts = d.alerts.filter((a) => !a.resolvedAt);
  const lines = [
    `DOSSIER ${d.reference} — ${d.object}`,
    `  Procedure: ${translate(locale, `type.${d.type}`)}`,
    `  Location: ${d.commune}, ${d.wilaya}`,
    `  Current phase: ${phase} (${days} days elapsed, SLA ${sla} days${days > sla ? " — OVERDUE" : ""})`,
    `  Priority: ${translate(locale, `priority.${d.priority}`)}`,
    d.surfaceM2 != null ? `  Surface: ${d.surfaceM2} m²` : "",
    d.estimatedValueDzd != null ? `  Estimated value: ${d.estimatedValueDzd} DZD` : "",
    d.parties.length ? `  Parties: ${d.parties.join(", ")}` : "",
    `  Documents on file (${d.documents.length}): ${
      d.documents.map((doc) => translate(locale, `doc.${doc.kind}`)).join(", ") || "none"
    }`,
    `  Missing required documents: ${missing.length ? missing.join(", ") : "none"}`,
    `  Next phase in the process: ${next ? translate(locale, `phase.${next}`) : "final phase reached"}`,
    `  Open alerts (${openAlerts.length}): ${
      openAlerts.map((a) => a.title).join("; ") || "none"
    }`,
  ];
  return lines.filter(Boolean).join("\n");
}

function describePortfolio(dossiers: Dossier[], locale: Locale): string {
  const byType: Record<string, number> = {};
  for (const d of dossiers) byType[d.type] = (byType[d.type] ?? 0) + 1;
  const openAlerts = dossiers.reduce(
    (n, d) => n + d.alerts.filter((a) => !a.resolvedAt).length,
    0
  );
  const overdue = dossiers.filter(
    (d) => daysInCurrentPhase(d) > phaseSlaDays(d.currentPhase)
  );
  const typeStr = Object.entries(byType)
    .map(([t, n]) => `${n} ${translate(locale, `type.${t}`)}`)
    .join(", ");
  return [
    `PORTFOLIO OVERVIEW`,
    `  Total active dossiers: ${dossiers.length} (${typeStr})`,
    `  Open alerts: ${openAlerts}`,
    `  Overdue dossiers (${overdue.length}): ${
      overdue.slice(0, 8).map((d) => d.reference).join(", ") || "none"
    }`,
  ].join("\n");
}

function describeKnowledge(query: string, locale: Locale): { text: string; hasHits: boolean } {
  const hits = searchKnowledge(query, locale, 3).filter((h) => h.score >= 2);
  if (hits.length === 0) return { text: "", hasHits: false };
  const blocks = hits.map((h) => {
    const e = h.entry;
    return [
      `PROCESS MANUAL — ${translate(locale, `type.${e.process}`)} · ${translate(locale, `phase.${e.phase}`)}`,
      `  Summary: ${e.summary}`,
      `  Institutions: ${e.institutions.join(", ")}`,
      `  Legal basis: ${e.legalBasis.join("; ")}`,
      `  Critical points (manual/slow steps): ${e.criticalPoints.join("; ")}`,
    ].join("\n");
  });
  return { text: blocks.join("\n\n"), hasHits: true };
}

interface GroundingResult {
  grounding: string;
  citedFacts: string[];
  source: AssistantSource;
}

function buildGrounding(
  query: string,
  dossiers: Dossier[],
  locale: Locale,
  current?: Dossier | null
): GroundingResult {
  const target = resolveDossier(query, dossiers, current) ?? current ?? undefined;
  const kb = describeKnowledge(query, locale);

  const parts: string[] = [describePortfolio(dossiers, locale)];
  const citedFacts: string[] = [];

  if (target) {
    parts.push(describeDossier(target, locale));
    citedFacts.push(`${translate(locale, "common.reference")}: ${target.reference}`);
    citedFacts.push(
      `${translate(locale, "dossiers.detail.status")}: ${translate(locale, `phase.${target.currentPhase}`)}`
    );
  }
  if (kb.hasHits) {
    parts.push(kb.text);
    const top = searchKnowledge(query, locale, 1)[0];
    if (top) {
      citedFacts.push(
        `${translate(locale, `type.${top.entry.process}`)} → ${translate(locale, `phase.${top.entry.phase}`)}`
      );
    }
  }

  const source: AssistantSource = target ? "data" : kb.hasHits ? "process" : "data";
  return { grounding: parts.join("\n\n"), citedFacts, source };
}

/** Strip light markdown so the text-to-speech voice reads cleanly. */
function toSpoken(answer: string): string {
  return answer
    .replace(/\*\*/g, "")
    .replace(/^[-•]\s*/gm, "")
    .replace(/[#`]/g, "")
    .replace(/\n+/g, " ")
    .trim();
}

export interface AskClaudeOpts {
  query: string;
  dossiers: Dossier[];
  locale: Locale;
  current?: Dossier | null;
  history?: { role: "user" | "assistant"; text: string }[];
}

/**
 * Ask the real Claude model, grounded in local dossier + process data.
 * Returns null when Claude is unavailable so the caller can fall back locally.
 */
export async function askClaude(opts: AskClaudeOpts): Promise<AssistantReply | null> {
  const { query, dossiers, locale, current, history } = opts;
  const { grounding, citedFacts, source } = buildGrounding(query, dossiers, locale, current);

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, locale, grounding, history }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { answer?: string };
    const answer = (data.answer ?? "").trim();
    if (!answer) return null;

    return {
      answer,
      spoken: toSpoken(answer),
      citedFacts,
      source,
    };
  } catch {
    return null;
  }
}
