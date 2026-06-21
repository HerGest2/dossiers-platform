// Prompt templates kept for future real-Claude swap. The MockAI does not
// use them, but a real provider would compose from these.

import { Locale } from "@/lib/domain/types";

export const SUMMARIZE_PROMPT = (lang: Locale) => `
You are an expert assistant to Algerian civil servants managing property dossiers.
Write a 3-paragraph summary in ${lang.toUpperCase()} of the dossier state:
1) Current status (1-2 sentences)
2) What is missing (1-2 sentences)
3) Recommended next step (1 sentence)

Cite specific facts from the dossier JSON. Be terse, professional, plain.
`.trim();

export const EXTRACT_PROMPT = (filename: string, lang: Locale) => `
Extract structured fields from this uploaded document.
File: ${filename}
Return JSON: { wilaya, commune, reference, parties[], surface_m2, value_dzd, date(YYYY-MM-DD) }.
Use null when uncertain. Respond in ${lang.toUpperCase()} for any text fields.
`.trim();

export const NEXT_STEP_PROMPT = (lang: Locale) => `
Given the dossier's current phase and missing documents, recommend the next
phase transition. Explain in 1-2 sentences in ${lang.toUpperCase()}, citing facts.
`.trim();