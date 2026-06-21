# Plateforme Dossiers — Explorations & EKB Privatizations

A working prototype web platform for civil servants managing Algerian property dossiers. Built with **Next.js 14 + TypeScript**, state persisted in **localStorage**. The **assistant chatbot ("Doss AI") is powered by the real Claude API** (`claude-opus-4-8`); the other AI panels (summary, extraction, next-step, alerts) run locally via `MockAI`. UI is multilingual: **Shqip / العربية / English / Français**, with full RTL support for Arabic.

## Run

```bash
npm install
cp .env.example .env.local   # then paste your ANTHROPIC_API_KEY
npm run dev
```

Open <http://localhost:3000>.

### Enabling the real Claude chatbot

The assistant calls Claude through the server route `app/api/chat/route.ts` using the official `@anthropic-ai/sdk`. Put your key in `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Get one at <https://console.anthropic.com/settings/keys>. **Without a key the app still runs** — the chatbot automatically falls back to its local rule-based engine, so the demo never breaks.

On first load, the app seeds **10 realistic Algerian dossiers** spanning both tracks (Explorations foncières + Privatisations EKB) across all phases. State persists across reloads via `localStorage`.

To reset to the seed data: **Settings → Reset with demo data**.

## Features

### Core AI features (all four requested)
1. **Dossier summary** — `AISummaryPanel` produces a 3-paragraph summary (status / missing / next step) in the active UI language. Refresh to regenerate. A "Show reasoning" disclosure lists the cited facts.
2. **Document data extraction** — Drop a PDF/image/text file in `DocumentUploader`. The AI returns structured fields (wilaya, commune, reference, surface, value, parties, date). `ExtractionDiff` shows current vs extracted side-by-side with one-click "Apply all".
3. **Next-step suggestion** — `NextStepPanel` recommends the next phase transition, explains *why* in plain language, and offers a one-click "Apply transition" button.
4. **Critical-points alerts** — `AlertsPanel` shows stalled dossiers (over phase SLA), missing required documents, approaching deadlines, and data inconsistencies. Each alert has a one-line recommendation. The dashboard surfaces the top 5 critical alerts.

### Bonus directions implemented
- **Citizen view ("Where is my dossier?")** — a read-only public page at `/track` (link in the header). A citizen enters a reference (e.g. `EXP-2025-1042`) and sees a friendly progress stepper: completed / current / upcoming phases, a plain-language status, what happens next, and the last update. No civil-servant tools.
- **Standard letter / decision generation** — the **Letter** tab on a dossier (`LetterPanel`) drafts a formal administrative document (notification, decision, or request for documents). With `ANTHROPIC_API_KEY` set, Claude (`claude-opus-4-8`, via `app/api/letter/route.ts`) writes it grounded only in the dossier's facts, in the active language; offline it fills a standard template in all four languages. Edit, copy, download (.txt), print, or attach it to the dossier.
- **Dashboard with blockages & deadlines** — KPIs + top critical alerts surface stalled dossiers and approaching SLAs.
- **Both processes simultaneously** — Exploration and EKB Privatization run side by side throughout.

### Extras added
- **Dashboard KPIs** — total dossiers, open alerts, average days in phase, distribution by phase.
- **Phase timeline** — visual history of every phase transition with timestamp + actor + notes.
- **Filter & search** — by type, phase, priority, and free-text across reference, object, parties, location.
- **Activity log** — every action (creation, phase advance, doc upload, AI summary view, alert resolution) is recorded.
- **i18n with RTL** — switch language from the header; the entire layout flips to RTL for Arabic including directional icons.
- **Keyboard shortcuts** — `N` new dossier, `/` focus search, `?` help.
- **Seed data + reset** — 10 realistic dossiers to make the demo feel alive; one-click reset in Settings.

## Architecture

```
app/                  Next.js App Router pages (dashboard, dossiers, documents, settings)
components/           UI primitives + dossier/documents feature components
lib/
  domain/             types + workflow rules (phase order, required docs, alert rules)
  ai/                 AIProvider interface + MockAI implementation + prompt templates
  store/              Zustand store with localStorage persist
  i18n/               translations (fr/ar/en) + useT hook
  utils/              formatting helpers
data/seed.ts          10 realistic Algerian dossiers
```

The workflow rules (`lib/domain/workflow.ts`) are the single source of truth for phase order, required documents per phase, SLAs, and alert generation. The AI layer reads these to produce realistic outputs.

## How the Claude chatbot works (real, end-to-end)

The assistant is a grounded RAG over the live data, not a decorative chat:

1. **Retrieve (client).** `lib/ai/claudeChat.ts` builds a grounding payload from the store — the dossier the question is about (phase, days vs SLA, missing docs, next phase, alerts), a portfolio overview, and the most relevant entries from the process knowledge base (`lib/ai/knowledgeBase.ts`: institutions, legal basis, critical points).
2. **Generate (server).** `app/api/chat/route.ts` sends that grounding + the question to `claude-opus-4-8` via `@anthropic-ai/sdk`, with a system prompt that forbids inventing process steps, phases, or legal references — Claude answers **only** from the provided context, in the active UI language.
3. **Safety + fallback.** Anything that mutates state (create / advance / delete a dossier) or navigates the app is still handled by the deterministic local engine and requires explicit user approval. If `ANTHROPIC_API_KEY` is missing or the call fails, the chatbot transparently falls back to the local engine.

The other four AI panels still run on `MockAI`. The `AIProvider` interface in `lib/ai/provider.ts` is the seam to make those real too: implement a `ClaudeProvider` and return it from `getAIProvider()`. Prompts are pre-written in `lib/ai/prompts.ts`. 

## Out of scope

- Real OCR / PDF parsing — MockAI simulates based on filename heuristics; a real impl would use a document-intelligence service.
- Authentication / user accounts — single-user prototype.
- Server-side persistence — localStorage only.
- Mobile-first layout — responsive but desktop-primary.
