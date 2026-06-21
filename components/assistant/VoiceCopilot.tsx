"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useDossierStore } from "@/lib/store/dossierStore";
import { useT } from "@/lib/i18n/useT";
import { useVoice } from "@/lib/voice/useVoice";
import { askAssistant, AssistantReply } from "@/lib/ai/assistant";
import { askClaude } from "@/lib/ai/claudeChat";
import {
  ActionProposal,
  executeAction,
  isAffirmative,
  isNegative,
} from "@/lib/ai/actions";
import { cn } from "@/lib/utils/cn";
import {
  Mic,
  Square,
  Volume2,
  VolumeX,
  X,
  Send,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Bot,
  Check,
  Trash2,
  FilePlus2,
  ChevronsRight,
  Paperclip,
  ShieldAlert,
} from "lucide-react";

interface Msg {
  id: string;
  role: "user" | "assistant";
  text: string;
  reply?: AssistantReply;
}

let mid = 0;
const newMid = () => `m_${Date.now()}_${++mid}`;

export function VoiceCopilot() {
  const { t, locale } = useT();
  const dossiers = useDossierStore((s) => s.dossiers);
  const hydrated = useDossierStore((s) => s.hydrated);
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [pending, setPending] = useState<ActionProposal | null>(null);
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Detect the dossier currently being viewed, so "this dossier" works.
  const currentDossier = useMemo(() => {
    const m = pathname?.match(/\/dossiers\/([^/]+)/);
    if (!m) return null;
    return dossiers.find((d) => d.id === m[1]) ?? null;
  }, [pathname, dossiers]);
  const currentRef = useRef(currentDossier);
  currentRef.current = currentDossier;
  const autoSpeakRef = useRef(autoSpeak);
  autoSpeakRef.current = autoSpeak;
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  const pushAssistant = (text: string, reply?: AssistantReply) =>
    setMessages((prev) => [...prev, { id: newMid(), role: "assistant", text, reply }]);

  const runReply = (reply: AssistantReply) => {
    if (autoSpeakRef.current) voice.speak(reply.spoken);
    if (reply.navigate) {
      const href = reply.navigate;
      setTimeout(() => {
        router.push(href);
        setOpen(false);
      }, 900);
    }
  };

  // Execute a previously-proposed action after the user approves it.
  const approve = (p: ActionProposal) => {
    setPending(null);
    const result = executeAction(p.action, locale);
    const reply: AssistantReply = {
      answer: result.answer,
      spoken: result.spoken,
      citedFacts: [],
      source: "data",
      navigate: result.navigate,
    };
    pushAssistant(result.answer, reply);
    runReply(reply);
  };

  const cancel = () => {
    setPending(null);
    const msg = t("assistant.action.cancelled");
    pushAssistant(msg);
    if (autoSpeakRef.current) voice.speak(msg);
  };

  const handleAsk = async (raw: string) => {
    const query = raw.trim();
    if (!query) return;

    // When an action is awaiting approval, interpret input as a yes/no decision.
    if (pendingRef.current) {
      const p = pendingRef.current;
      if (isAffirmative(query)) {
        setMessages((prev) => [...prev, { id: newMid(), role: "user", text: query }]);
        setInput("");
        approve(p);
        return;
      }
      if (isNegative(query)) {
        setMessages((prev) => [...prev, { id: newMid(), role: "user", text: query }]);
        setInput("");
        cancel();
        return;
      }
      // Ambiguous → drop the pending action and treat as a fresh request.
      setPending(null);
    }

    // Build conversation history (for Claude follow-ups) BEFORE adding this turn.
    const history = messages.slice(-6).map((m) => ({
      role: m.role,
      text: m.text,
    }));

    // Echo the user's message immediately.
    setMessages((prev) => [...prev, { id: newMid(), role: "user", text: query }]);
    setInput("");

    const dossiers = useDossierStore.getState().dossiers;
    const current = currentRef.current;

    // The local engine is deterministic and safe — let it own anything that
    // mutates state (create/advance/delete dossier) or navigates the app.
    const localReply = askAssistant({ query, dossiers, locale, current });
    if (localReply.pendingAction || localReply.navigate) {
      pushAssistant(localReply.answer, localReply);
      if (localReply.pendingAction) setPending(localReply.pendingAction);
      runReply(localReply);
      return;
    }

    // Otherwise answer with the real Claude model (grounded in dossier + process
    // data), falling back to the local rule engine if Claude is unavailable.
    setThinking(true);
    const claudeReply = await askClaude({ query, dossiers, locale, current, history });
    setThinking(false);

    const reply = claudeReply ?? localReply;
    pushAssistant(reply.answer, reply);
    runReply(reply);
  };

  const voice = useVoice(locale, (finalText) => handleAsk(finalText));

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, pending, thinking]);

  if (!hydrated) return null;

  const suggestions = [
    t("assistant.s1"),
    t("assistant.s2"),
    t("assistant.s3"),
    t("assistant.s4"),
    t("assistant.s5"),
  ];

  return (
    <>
      {/* Floating launcher */}
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          aria-label={t("assistant.fab")}
          className="group fixed bottom-6 end-6 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-brand-lg transition-transform hover:scale-105"
        >
          <span className="absolute inset-0 -z-10 animate-ping rounded-2xl bg-brand-400/40" />
          <Mic className="h-6 w-6" />
        </button>
      ) : null}

      {/* Panel */}
      {open ? (
        <div className="fixed bottom-6 end-6 z-50 flex h-[560px] max-h-[calc(100vh-6rem)] w-[380px] max-w-[calc(100vw-2rem)] animate-fade-in-up flex-col overflow-hidden rounded-2xl border border-white/50 bg-white/95 shadow-brand-lg backdrop-blur-xl">
          {/* Header */}
          <div className="relative flex items-center gap-3 bg-brand-gradient p-4 text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight">{t("assistant.title")}</p>
              <p className="truncate text-[11px] text-white/85">{t("assistant.subtitle")}</p>
            </div>
            <button
              onClick={() => setAutoSpeak((v) => !v)}
              title={autoSpeak ? t("assistant.speakOn") : t("assistant.speakOff")}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 hover:bg-white/25"
            >
              {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <button
              onClick={() => {
                voice.cancelSpeak();
                voice.stop();
                setOpen(false);
              }}
              aria-label={t("common.close")}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 hover:bg-white/25"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-ink-50/60 p-3">
            {messages.length === 0 ? (
              <div className="rounded-xl border border-brand-100 bg-brand-50/70 p-3 text-sm text-ink-700">
                <div className="mb-1 flex items-center gap-1.5 font-semibold text-brand-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t("assistant.title")}
                </div>
                {t("assistant.greeting")}
              </div>
            ) : null}

            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-ee-sm bg-brand-gradient px-3 py-2 text-sm text-white shadow-sm">
                    {m.text}
                  </div>
                </div>
              ) : (
                <AssistantBubble key={m.id} msg={m} router={router} onClose={() => setOpen(false)} />
              )
            )}

            {pending ? (
              <ActionCard proposal={pending} onApprove={() => approve(pending)} onCancel={cancel} />
            ) : null}

            {thinking ? (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-es-sm border border-ink-200 bg-white px-3 py-2 text-sm text-ink-500 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse text-brand-500" />
                  <span className="flex gap-1">
                    <Dot /> <Dot /> <Dot />
                  </span>
                </div>
              </div>
            ) : null}

            {voice.listening || voice.interim ? (
              <div className="flex items-center gap-2 px-1 text-xs text-brand-600">
                <span className="flex gap-1">
                  <Dot /> <Dot /> <Dot />
                </span>
                <span className="italic">{voice.interim || t("assistant.listening")}</span>
              </div>
            ) : null}
          </div>

          {/* Suggestions */}
          {messages.length === 0 ? (
            <div className="border-t border-ink-100 bg-white/80 px-3 py-2">
              <p className="mb-1.5 text-[11px] font-medium text-ink-500">{t("assistant.tryAsking")}</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleAsk(s)}
                    className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700 transition-colors hover:bg-brand-100"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Input row */}
          <div className="flex items-center gap-2 border-t border-ink-100 bg-white p-2.5">
            <button
              onClick={() => (voice.listening ? voice.stop() : voice.start())}
              disabled={!voice.sttSupported}
              title={voice.sttSupported ? t("assistant.tapToSpeak") : t("assistant.notSupported")}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition-all disabled:cursor-not-allowed disabled:opacity-40",
                voice.listening
                  ? "bg-danger-600 shadow-lg ring-4 ring-danger-200"
                  : "bg-brand-gradient shadow-brand hover:brightness-110"
              )}
            >
              {voice.listening ? <Square className="h-4 w-4" /> : <Mic className="h-5 w-5" />}
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAsk(input);
              }}
              placeholder={t("assistant.inputPlaceholder")}
              className="h-10 min-w-0 flex-1 rounded-xl border border-ink-200 bg-white px-3 text-sm placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
            <button
              onClick={() => handleAsk(input)}
              disabled={!input.trim()}
              aria-label={t("assistant.send")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-900 text-white transition-colors hover:bg-ink-800 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>

          {!voice.sttSupported ? (
            <p className="bg-warn-50 px-3 py-1.5 text-center text-[10px] text-warn-700">
              {t("assistant.notSupported")}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function AssistantBubble({
  msg,
  router,
  onClose,
}: {
  msg: Msg;
  router: ReturnType<typeof useRouter>;
  onClose: () => void;
}) {
  const { t } = useT();
  const [showFacts, setShowFacts] = useState(false);
  const reply = msg.reply;

  return (
    <div className="flex justify-start">
      <div className="max-w-[88%] rounded-2xl rounded-es-sm border border-ink-200 bg-white px-3 py-2 text-sm text-ink-800 shadow-sm">
        <RichText text={msg.text} />

        {reply && reply.source !== "none" ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                reply.source === "process"
                  ? "bg-violet-50 text-violet-700"
                  : "bg-emerald-50 text-emerald-700"
              )}
            >
              {reply.source === "process"
                ? t("assistant.source.process")
                : t("assistant.source.data")}
            </span>

            {reply.navigate ? (
              <button
                onClick={() => {
                  router.push(reply.navigate!);
                  onClose();
                }}
                className="inline-flex items-center gap-1 rounded-full bg-brand-gradient px-2.5 py-0.5 text-[10px] font-semibold text-white"
              >
                {t("assistant.openDossier")}
                <ArrowRight className="h-3 w-3" />
              </button>
            ) : null}
          </div>
        ) : null}

        {reply && reply.citedFacts.length > 0 ? (
          <div className="mt-2 border-t border-ink-100 pt-1.5">
            <button
              onClick={() => setShowFacts((v) => !v)}
              className="inline-flex items-center gap-1 text-[11px] text-ink-500 hover:text-ink-800"
            >
              {t("assistant.groundedOn")}
              {showFacts ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {showFacts ? (
              <ul className="mt-1 list-disc space-y-0.5 ps-4 text-[11px] text-ink-600">
                {reply.citedFacts.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// Tiny renderer for "**bold**" and newline-separated lines.
function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => (
        <p key={i} className={cn(line.startsWith("•") && "ps-1")}>
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <strong key={j} className="font-semibold text-ink-900">
                {part.slice(2, -2)}
              </strong>
            ) : (
              <span key={j}>{part}</span>
            )
          )}
        </p>
      ))}
    </div>
  );
}

function Dot() {
  return <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500" />;
}

const ACTION_ICON = {
  create_dossier: FilePlus2,
  delete_dossier: Trash2,
  advance_phase: ChevronsRight,
  add_document: Paperclip,
} as const;

function ActionCard({
  proposal,
  onApprove,
  onCancel,
}: {
  proposal: ActionProposal;
  onApprove: () => void;
  onCancel: () => void;
}) {
  const { t } = useT();
  const Icon = ACTION_ICON[proposal.action.kind];
  const danger = proposal.destructive;

  return (
    <div
      className={cn(
        "animate-fade-in-up rounded-2xl border-2 bg-white p-3 shadow-md",
        danger ? "border-danger-300" : "border-brand-300"
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white",
            danger ? "bg-danger-600" : "bg-brand-gradient"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">
            {t("assistant.action.title")}
          </p>
          <p className="truncate text-sm font-bold text-ink-900">{proposal.title}</p>
        </div>
      </div>

      <p className="text-[13px] leading-snug text-ink-700">{proposal.summary}</p>

      {proposal.details.length > 0 ? (
        <dl className="mt-2 space-y-1 rounded-lg bg-ink-50 p-2">
          {proposal.details.map((d, i) => (
            <div key={i} className="flex items-start justify-between gap-2 text-[11px]">
              <dt className="shrink-0 text-ink-500">{d.label}</dt>
              <dd className="text-end font-medium text-ink-800">{d.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {danger ? (
        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-danger-50 px-2 py-1.5 text-[11px] font-medium text-danger-700">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
          {t("assistant.action.irreversible")}
        </div>
      ) : null}

      <div className="mt-3 flex gap-2">
        <button
          onClick={onApprove}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-white shadow-sm transition-all hover:brightness-110",
            danger ? "bg-danger-600" : "bg-brand-gradient shadow-brand"
          )}
        >
          <Check className="h-4 w-4" />
          {t("assistant.action.approve")}
        </button>
        <button
          onClick={onCancel}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-50"
        >
          <X className="h-4 w-4" />
          {t("assistant.action.cancel")}
        </button>
      </div>

      <p className="mt-2 text-center text-[10px] text-ink-400">{t("assistant.action.hint")}</p>
    </div>
  );
}
