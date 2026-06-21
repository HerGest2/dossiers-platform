"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Locale } from "@/lib/domain/types";
import { translate, LOCALE_FLAGS } from "@/lib/i18n/config";
import { useVoice } from "@/lib/voice/useVoice";
import { DossOrb } from "@/components/present/DossOrb";
import { cn } from "@/lib/utils/cn";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  FileSpreadsheet,
  FileText,
  Clock,
  ShieldAlert,
  FolderOpen,
  TrendingUp,
  Mic,
  Zap,
  Target,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Wand2,
  ArrowRight,
} from "lucide-react";

type Lang = "sq" | "en" | "fr";
type VisualKey =
  | "intro"
  | "problem"
  | "timeline"
  | "dashboard"
  | "summary"
  | "voice"
  | "value"
  | "cta";

// Fixed per-scene durations (ms) — the pitch is a deterministic ~60s cut,
// not gated on speech length, so the recorded video is always ≤ 1 minute.
const SCENES: { key: VisualKey; dur: number }[] = [
  { key: "intro", dur: 6000 },
  { key: "problem", dur: 7000 },
  { key: "timeline", dur: 8000 },
  { key: "dashboard", dur: 8000 },
  { key: "summary", dur: 8500 },
  { key: "voice", dur: 9000 },
  { key: "value", dur: 6500 },
  { key: "cta", dur: 7000 },
];
const TOTAL_MS = SCENES.reduce((s, x) => s + x.dur, 0); // 60000

// Condensed, punchy narration — short enough that the spoken line fits inside
// each scene's fixed duration above (the 60-second cut).
const LINES: Record<Lang, Record<VisualKey, string>> = {
  sq: {
    intro: "Përshëndetje! Unë jam Doss — IA juaj për procedurat e pronës.",
    problem: "Sot: qindra dosje në Excel dhe letra. Pa gjurmë auditimi. Vonesa të vazhdueshme.",
    timeline: "Ne ndjekim çdo dosje sipas fazave reale — dhe IA ndihmon në çdo hap.",
    dashboard: "Një panel: dosjet aktive, sinjalizimet dhe afatet që po skadojnë.",
    summary: "Hapni një dosje — IA tregon gjendjen, çfarë mungon, hapin tjetër. Ngarkoni një skedar, të dhënat nxirren menjëherë.",
    voice: "Dhe thjesht pyesni me zë: «Çfarë mungon këtu?» Përgjigjem — vetëm nga të dhënat reale.",
    value: "Më shpejt. Saktë. Transparent — për nëpunësin dhe qytetarin.",
    cta: "Platforma e Dosjeve. Mbështetur nga Claude. Le ta modernizojmë administratën.",
  },
  en: {
    intro: "Hi! I'm Doss — your AI for property procedures.",
    problem: "Today: hundreds of files in Excel and paper. No audit trail. Constant delays.",
    timeline: "We track every dossier through its real phases — and AI assists at each step.",
    dashboard: "One dashboard: active dossiers, alerts, and deadlines about to expire.",
    summary: "Open a dossier — AI shows the status, what's missing, the next step. Upload a file, data extracted instantly.",
    voice: "And just ask out loud: \"What's missing here?\" I answer — grounded only in real data.",
    value: "Faster. Accurate. Transparent — for the civil servant and the citizen.",
    cta: "The Dossiers Platform. Powered by Claude. Let's modernize the administration.",
  },
  fr: {
    intro: "Bonjour ! Je suis Doss — votre IA pour les procédures foncières.",
    problem: "Aujourd'hui : des centaines de dossiers sur Excel et papier. Sans traçabilité. Des retards constants.",
    timeline: "Nous suivons chaque dossier selon ses phases réelles — et l'IA assiste à chaque étape.",
    dashboard: "Un tableau de bord : dossiers actifs, alertes et échéances imminentes.",
    summary: "Ouvrez un dossier — l'IA montre l'état, ce qui manque, l'étape suivante. Téléversez un fichier, données extraites aussitôt.",
    voice: "Et demandez à voix haute : « Que manque-t-il ? » Je réponds — uniquement sur les données réelles.",
    value: "Plus vite. Précis. Transparent — pour l'agent et le citoyen.",
    cta: "La Plateforme des Dossiers. Propulsée par Claude. Modernisons l'administration.",
  },
};

const META: Record<Lang, Record<VisualKey, { eyebrow: string; title: string }>> = {
  sq: {
    intro: { eyebrow: "Njihu me IA-në", title: "Përshëndetje, unë jam Doss." },
    problem: { eyebrow: "Problemi", title: "Dosjet kanë mbetur në të kaluarën." },
    timeline: { eyebrow: "Zgjidhja", title: "Çdo dosje, sipas procesit të vërtetë." },
    dashboard: { eyebrow: "Me një shikim", title: "Gjithçka që kërkon vëmendje." },
    summary: { eyebrow: "IA që funksionon", title: "Përmbledhje & të dhëna, me një klik." },
    voice: { eyebrow: "Inovacioni", title: "Thjesht pyet. Me zë." },
    value: { eyebrow: "Ndikimi", title: "Më shpejt. Saktë. Transparent." },
    cta: { eyebrow: "Radha jote", title: "Le ta modernizojmë administratën." },
  },
  en: {
    intro: { eyebrow: "Meet your AI", title: "Hi, I'm Doss." },
    problem: { eyebrow: "The problem", title: "Property files are stuck in the past." },
    timeline: { eyebrow: "The solution", title: "Every dossier, guided by its real process." },
    dashboard: { eyebrow: "At a glance", title: "See everything that needs attention." },
    summary: { eyebrow: "AI that works", title: "Summaries & data, in one click." },
    voice: { eyebrow: "The innovation", title: "Just ask. Out loud." },
    value: { eyebrow: "The impact", title: "Faster. Accurate. Transparent." },
    cta: { eyebrow: "Your turn", title: "Let's modernize the administration." },
  },
  fr: {
    intro: { eyebrow: "Voici votre IA", title: "Bonjour, je suis Doss." },
    problem: { eyebrow: "Le problème", title: "Les dossiers sont bloqués dans le passé." },
    timeline: { eyebrow: "La solution", title: "Chaque dossier, guidé par son processus." },
    dashboard: { eyebrow: "En un coup d'œil", title: "Tout ce qui demande attention." },
    summary: { eyebrow: "Une IA utile", title: "Résumés & données, en un clic." },
    voice: { eyebrow: "L'innovation", title: "Demandez. À voix haute." },
    value: { eyebrow: "L'impact", title: "Plus vite. Précis. Transparent." },
    cta: { eyebrow: "À vous", title: "Modernisons l'administration." },
  },
};

const UI: Record<Lang, Record<string, string>> = {
  sq: {
    start: "Fillo prezantimin",
    replay: "Përsërit",
    exit: "Dil",
    tip: "Këshillë: zgjat nën një minutë. Shtypni Win + G për ta regjistruar si video.",
    speed: "Shpejtësi",
    accuracy: "Saktësi",
    transparency: "Transparencë",
    active: "Dosje aktive",
    alerts: "Sinjalizime",
    avgDays: "Ditë mesatare",
    ask: "Çfarë mungon te kjo dosje?",
    answer: "Mungon: Plani kadastral. Hapi tjetër: Analizë juridike.",
    extract: "Nxjerrje automatike",
    paper: "Excel & letra",
    delays: "Vonesa",
    noTrace: "Pa gjurmë",
    tagline: "Procedurat e pronës, të fuqizuara nga IA",
    tryNow: "Provojeni tani",
    poweredBy: "Mbështetur nga IA",
    presenter: "Prezantuesi juaj me IA",
  },
  en: {
    start: "Start presentation",
    replay: "Replay",
    exit: "Exit",
    tip: "Tip: it runs under a minute. Press Win + G to screen-record it as a video.",
    speed: "Speed",
    accuracy: "Accuracy",
    transparency: "Transparency",
    active: "Active dossiers",
    alerts: "Alerts",
    avgDays: "Avg. days",
    ask: "What's missing in this dossier?",
    answer: "Missing: Cadastral plan. Next step: Legal analysis.",
    extract: "Auto extraction",
    paper: "Excel & paper",
    delays: "Delays",
    noTrace: "No audit trail",
    tagline: "Property procedures, powered by AI",
    tryNow: "Try it now",
    poweredBy: "Powered by AI",
    presenter: "Your AI presenter",
  },
  fr: {
    start: "Lancer la présentation",
    replay: "Rejouer",
    exit: "Quitter",
    tip: "Astuce : moins d'une minute. Appuyez sur Win + G pour l'enregistrer en vidéo.",
    speed: "Rapidité",
    accuracy: "Précision",
    transparency: "Transparence",
    active: "Dossiers actifs",
    alerts: "Alertes",
    avgDays: "Jours moy.",
    ask: "Que manque-t-il dans ce dossier ?",
    answer: "Manquant : Plan cadastral. Prochaine étape : Analyse juridique.",
    extract: "Extraction auto",
    paper: "Excel & papier",
    delays: "Retards",
    noTrace: "Sans traçabilité",
    tagline: "Procédures foncières, propulsées par l'IA",
    tryNow: "Essayez maintenant",
    poweredBy: "Propulsé par l'IA",
    presenter: "Votre présentateur IA",
  },
};

// Deterministic particle field (avoids SSR hydration mismatch).
const PARTICLES = [
  { l: "8%", t: "22%", s: 6, d: "0s", dur: "7s" },
  { l: "18%", t: "70%", s: 4, d: "1.2s", dur: "9s" },
  { l: "30%", t: "35%", s: 8, d: "2s", dur: "8s" },
  { l: "42%", t: "80%", s: 5, d: "0.6s", dur: "10s" },
  { l: "55%", t: "18%", s: 7, d: "1.8s", dur: "7.5s" },
  { l: "66%", t: "62%", s: 4, d: "2.6s", dur: "9.5s" },
  { l: "78%", t: "30%", s: 6, d: "0.9s", dur: "8.5s" },
  { l: "88%", t: "72%", s: 5, d: "1.5s", dur: "7s" },
  { l: "12%", t: "48%", s: 3, d: "2.2s", dur: "11s" },
  { l: "50%", t: "50%", s: 3, d: "3s", dur: "10s" },
  { l: "72%", t: "12%", s: 4, d: "1s", dur: "9s" },
  { l: "92%", t: "44%", s: 6, d: "2.4s", dur: "8s" },
];

function fmtTime(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function PresentPage() {
  // Pitch Mode defaults to English (smoothest browser TTS voices).
  const [lang, setLang] = useState<Lang>("en");
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [index, setIndex] = useState(0);
  const [runKey, setRunKey] = useState(0); // bumps each start/replay → replays the open fade

  const voice = useVoice(lang as Locale);
  const finished = started && index >= SCENES.length;
  const ui = UI[lang];

  // Live countdown for the 60-second cut.
  const [nowTs, setNowTs] = useState(0);
  const sceneStartRef = useRef(0);

  // Recorded narration track (e.g. a studio TTS voice) at
  // /pitch-audio/<lang>/narration.mp3. When present it replaces the robotic
  // browser voice, and the visual timeline is SCALED to the audio's length so
  // narration and visuals start and finish together.
  const [hasNarration, setHasNarration] = useState(false);
  const [narrationPlaying, setNarrationPlaying] = useState(false);
  const [scale, setScale] = useState(1);
  const narrationRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let ok = true;
    setHasNarration(false);
    setScale(1);
    fetch(`/pitch-audio/${lang}/narration.mp3`, { method: "HEAD" })
      .then((r) => {
        if (ok) setHasNarration(r.ok);
      })
      .catch(() => {
        if (ok) setHasNarration(false);
      });
    return () => {
      ok = false;
    };
  }, [lang]);

  const stopNarration = () => {
    const a = narrationRef.current;
    if (a) {
      a.pause();
      a.onplaying = a.onpause = a.onended = a.onloadedmetadata = a.onerror = null;
      a.src = "";
    }
    narrationRef.current = null;
    setNarrationPlaying(false);
  };
  const startNarration = () => {
    stopNarration();
    if (!hasNarration) return;
    const a = new Audio(`/pitch-audio/${lang}/narration.mp3`);
    a.muted = muted;
    a.onplaying = () => setNarrationPlaying(true);
    a.onpause = () => setNarrationPlaying(false);
    a.onended = () => setNarrationPlaying(false);
    a.onerror = () => setNarrationPlaying(false);
    a.onloadedmetadata = () => {
      if (a.duration && isFinite(a.duration)) setScale(a.duration / (TOTAL_MS / 1000));
    };
    narrationRef.current = a;
    a.play().catch(() => {});
  };

  // Playback driver: advance scene-by-scene. Scene durations are scaled to the
  // narration length (scale=1 when there's no recorded track). With a track we
  // skip the browser voice; without one we speak each line best-effort.
  useEffect(() => {
    if (!started || !playing || finished) return;
    const { key } = SCENES[index];
    const dur = SCENES[index].dur * scale;
    sceneStartRef.current = Date.now();
    setNowTs(Date.now());

    if (!muted && !hasNarration && voice.ttsSupported) {
      voice.speak(LINES[lang][key]);
    }
    const id = setTimeout(() => {
      setIndex((i) => Math.min(i + 1, SCENES.length));
    }, dur);

    return () => {
      clearTimeout(id);
      voice.cancelSpeak();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, playing, index, muted, lang, finished, scale, hasNarration]);

  // Keep the narration track in sync with play/pause and mute.
  useEffect(() => {
    const a = narrationRef.current;
    if (!a) return;
    if (playing && !finished) a.play().catch(() => {});
    else a.pause();
  }, [playing, finished]);
  useEffect(() => {
    if (narrationRef.current) narrationRef.current.muted = muted;
  }, [muted]);
  useEffect(() => () => stopNarration(), []);

  // Tick the countdown clock while playing.
  useEffect(() => {
    if (!started || !playing || finished) return;
    const id = setInterval(() => setNowTs(Date.now()), 200);
    return () => clearInterval(id);
  }, [started, playing, finished]);

  const elapsedBeforeMs = SCENES.slice(0, index).reduce((s, x) => s + x.dur, 0) * scale;
  const withinSceneMs =
    started && playing && !finished
      ? Math.min((SCENES[index]?.dur ?? 0) * scale, Math.max(0, nowTs - sceneStartRef.current))
      : 0;
  const remainingMs = finished ? 0 : Math.max(0, TOTAL_MS * scale - elapsedBeforeMs - withinSceneMs);

  const cancelSpeakRef = useRef(voice.cancelSpeak);
  cancelSpeakRef.current = voice.cancelSpeak;
  useEffect(() => () => cancelSpeakRef.current(), []);

  const begin = () => {
    setIndex(0);
    setStarted(true);
    setPlaying(true);
    setRunKey((k) => k + 1);
    startNarration();
  };
  const restart = () => {
    voice.cancelSpeak();
    setIndex(0);
    setStarted(true);
    setPlaying(true);
    setRunKey((k) => k + 1);
    startNarration();
  };
  const goto = (i: number) => {
    voice.cancelSpeak();
    const clamped = Math.max(0, Math.min(i, SCENES.length - 1));
    setIndex(clamped);
    setPlaying(true);
    const a = narrationRef.current;
    if (a && a.duration && isFinite(a.duration)) {
      const frac = SCENES.slice(0, clamped).reduce((s, x) => s + x.dur, 0) / TOTAL_MS;
      a.currentTime = frac * a.duration;
      a.play().catch(() => {});
    }
  };

  const speaking =
    voice.speaking || narrationPlaying || (started && playing && !finished && muted);

  // Top progress bar fill (grows across each scene's scaled duration).
  const targetPct = finished ? 100 : ((index + 1) / SCENES.length) * 100;
  const fillDuration = playing && !finished ? SCENES[index].dur * scale : 400;

  return (
    <div
      dir="ltr"
      className="relative flex min-h-screen flex-col overflow-hidden bg-[#080b18] text-white"
    >
      {/* Deep cinematic backdrop — vignetted navy with brand light bleeding in */}
      <div
        className="pointer-events-none absolute inset-0 -z-20"
        style={{
          background:
            "radial-gradient(70% 55% at 50% 6%, rgba(99,102,241,0.16), transparent 68%)," +
            "radial-gradient(75% 55% at 50% 116%, rgba(168,85,247,0.14), transparent 68%)," +
            "radial-gradient(130% 120% at 50% 45%, #0a0d1d 38%, #05060f 100%)",
        }}
      />
      {/* Central key light — slow breathing focal glow behind the stage */}
      <div
        className="cine-keylight pointer-events-none absolute left-1/2 top-[44%] -z-10 h-[44rem] w-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(99,102,241,0.20), rgba(217,70,239,0.10) 46%, transparent 70%)",
          filter: "blur(30px)",
        }}
      />
      {/* Aurora drift */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="aurora absolute -left-40 -top-40 h-[40rem] w-[40rem] rounded-full bg-brand-600/20 blur-[150px]" />
        <div
          className="aurora absolute -right-40 top-0 h-[38rem] w-[38rem] rounded-full bg-fuchsia-600/18 blur-[150px]"
          style={{ animationDelay: "4s" }}
        />
        <div
          className="aurora absolute bottom-[-16rem] left-1/3 h-[36rem] w-[36rem] rounded-full bg-cyan-500/12 blur-[150px]"
          style={{ animationDelay: "7s" }}
        />
      </div>
      {/* Tech grid + particles */}
      <div className="tech-grid pointer-events-none absolute inset-0 -z-10" />
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white/50"
            style={{
              left: p.l,
              top: p.t,
              width: p.s,
              height: p.s,
              animation: `particle-drift ${p.dur} ease-in-out infinite`,
              animationDelay: p.d,
            }}
          />
        ))}
      </div>

      {/* Cinematic frame: color grade + vignette + film grain, letterbox while
          playing, fade-from-black on start and dip-to-black on finish. */}
      <div className="cine-grade" />
      <div className="cine-vignette" />
      <div className="cine-grain" />
      {started ? (
        <>
          <div className="cine-bar cine-bar-top" />
          <div className="cine-bar cine-bar-bottom" />
          <div key={`open-${runKey}`} className="cine-open" />
        </>
      ) : null}
      {finished ? <div key={`close-${runKey}`} className="cine-close" /> : null}

      {/* Top progress bar */}
      {started ? (
        <div className="absolute inset-x-0 top-0 z-20 h-1 bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-brand-400 via-fuchsia-400 to-cyan-400"
            style={{ width: `${targetPct}%`, transition: `width ${fillDuration}ms linear` }}
          />
        </div>
      ) : null}

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-sm font-black shadow-brand">
            D
          </div>
          <span className="text-sm font-semibold tracking-wide text-white/80">
            Doss · {ui.poweredBy}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {started ? (
            <span className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-semibold tabular-nums text-white/85">
              <Clock className="h-3.5 w-3.5 text-brand-300" />
              {fmtTime(remainingMs)}
            </span>
          ) : null}
          <div className="flex overflow-hidden rounded-lg border border-white/15">
            {(["sq", "en", "fr"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => {
                  voice.cancelSpeak();
                  stopNarration();
                  setLang(l);
                }}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold transition-colors",
                  l === lang ? "bg-white/20" : "hover:bg-white/10"
                )}
              >
                {LOCALE_FLAGS[l]} {l.toUpperCase()}
              </button>
            ))}
          </div>
          <Link
            href="/"
            className="flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10"
          >
            <X className="h-3.5 w-3.5" />
            {ui.exit}
          </Link>
        </div>
      </div>

      {/* Stage */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-28">
        {!started ? (
          <StartScreen ui={ui} lang={lang} onStart={begin} ttsSupported={voice.ttsSupported} />
        ) : finished ? (
          <FinishScreen ui={ui} onReplay={restart} />
        ) : (
          <>
            <span key={`diss-${index}`} className="scene-dissolve" />
            {/* Light streak only on the opening scene (an "ignition" flourish),
                delayed so it lands as the fade-from-black clears. */}
            {index === 0 ? <span className="scene-streak" style={{ animationDelay: "0.7s" }} /> : null}
            <div className="flex w-full max-w-5xl flex-col items-center">
            <div className="float-y">
              <DossOrb speaking={speaking} size={108} />
            </div>

            <div key={`h-${index}`} className="mt-6 flex flex-col items-center text-center">
              <span className="pop-in mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-brand-200">
                <Sparkles className="h-3 w-3" />
                {META[lang][SCENES[index].key].eyebrow}
              </span>
              <h2
                className="title-cine text-animated-gradient max-w-4xl text-3xl font-extrabold leading-tight sm:text-5xl"
                style={{ animationDelay: "0.12s" }}
              >
                {META[lang][SCENES[index].key].title}
              </h2>
            </div>

            <div key={`v-${index}`} className="mt-9 flex w-full flex-col items-center">
              <div className={cn(index % 2 === 0 ? "ken-a" : "ken-b", "flex w-full flex-col items-center")}>
                <div className="scene-cinematic flex w-full flex-col items-center">
                  <SceneVisual k={SCENES[index].key} lang={lang} ui={ui} />
                </div>
              </div>
            </div>

            <p className="caption-in mt-9 max-w-3xl text-center text-base leading-relaxed text-white/65 sm:text-lg">
              {LINES[lang][SCENES[index].key]}
            </p>
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      {started ? (
        <div className="absolute inset-x-0 bottom-0 z-20 px-6 pb-6">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <CtrlBtn onClick={() => goto(index - 1)} disabled={index <= 0}>
                <ChevronLeft className="h-4 w-4" />
              </CtrlBtn>
              <CtrlBtn onClick={() => setPlaying((p) => !p)} primary>
                {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </CtrlBtn>
              <CtrlBtn onClick={() => goto(index + 1)} disabled={index >= SCENES.length - 1}>
                <ChevronRight className="h-4 w-4" />
              </CtrlBtn>
              <CtrlBtn onClick={restart}>
                <RotateCcw className="h-4 w-4" />
              </CtrlBtn>
              <CtrlBtn onClick={() => setMuted((m) => !m)}>
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </CtrlBtn>
            </div>
            <div className="flex w-full items-center justify-center gap-1.5">
              {SCENES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goto(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === index ? "w-8 bg-brand-gradient" : i < index ? "w-4 bg-white/50" : "w-4 bg-white/15"
                  )}
                  aria-label={`Scene ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CtrlBtn({
  children,
  onClick,
  disabled,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center justify-center rounded-full transition-all disabled:opacity-30",
        primary
          ? "h-12 w-12 bg-brand-gradient text-white shadow-brand-lg hover:brightness-110"
          : "h-10 w-10 border border-white/15 bg-white/5 text-white/80 hover:bg-white/15"
      )}
    >
      {children}
    </button>
  );
}

function StartScreen({
  ui,
  lang,
  onStart,
  ttsSupported,
}: {
  ui: Record<string, string>;
  lang: Lang;
  onStart: () => void;
  ttsSupported: boolean;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="float-y">
        <DossOrb speaking={false} size={200} />
      </div>
      <p className="mt-9 text-xs font-bold uppercase tracking-[0.4em] text-brand-300">
        {translate(lang as Locale, "app.name")}
      </p>
      <h1 className="text-animated-gradient mt-4 max-w-3xl text-5xl font-extrabold leading-tight sm:text-6xl">
        {ui.tagline}
      </h1>
      <p className="mt-4 text-sm text-white/50">{ui.presenter}</p>
      <button
        onClick={onStart}
        className="mt-9 inline-flex items-center gap-2 rounded-full bg-brand-gradient px-8 py-4 text-base font-bold text-white shadow-brand-lg transition-all hover:scale-105 hover:brightness-110"
      >
        <Play className="h-5 w-5" />
        {ui.start}
      </button>
      <p className="mt-6 text-xs text-white/40">{ui.tip}</p>
      {!ttsSupported ? (
        <p className="mt-1 text-xs text-amber-300/80">
          {translate(lang as Locale, "assistant.notSupported")}
        </p>
      ) : null}
    </div>
  );
}

function FinishScreen({ ui, onReplay }: { ui: Record<string, string>; onReplay: () => void }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="float-y">
        <DossOrb speaking={false} size={150} />
      </div>
      <h2 className="text-animated-gradient mt-8 text-5xl font-extrabold sm:text-6xl">
        {ui.tryNow}
      </h2>
      <div className="mt-9 flex items-center gap-3">
        <button
          onClick={onReplay}
          className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white/90 hover:bg-white/10"
        >
          <RotateCcw className="h-4 w-4" />
          {ui.replay}
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-brand-gradient px-6 py-3 text-sm font-bold text-white shadow-brand-lg hover:brightness-110"
        >
          <Sparkles className="h-4 w-4" />
          {ui.tryNow}
        </Link>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Per-scene visuals (the "slides")                                           */
/* -------------------------------------------------------------------------- */

function Panel({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur-md",
        className
      )}
    >
      {children}
    </div>
  );
}

function CountUp({ to, suffix = "", duration = 1200 }: { to: number; suffix?: string; duration?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return (
    <>
      {n}
      {suffix}
    </>
  );
}

function SceneVisual({ k, lang, ui }: { k: VisualKey; lang: Lang; ui: Record<string, string> }) {
  const L = lang as Locale;

  if (k === "intro") {
    const cards = [
      { ref: "EXP-2024-014", phase: "intake", c: "from-blue-500 to-indigo-600", w: "70%" },
      { ref: "EKB-2024-061", phase: "appel_offres", c: "from-amber-500 to-orange-600", w: "45%" },
      { ref: "EXP-2024-027", phase: "validation", c: "from-violet-500 to-fuchsia-600", w: "88%" },
    ];
    return (
      <div className="flex flex-wrap items-center justify-center gap-4">
        {cards.map((c, i) => (
          <Panel
            key={c.ref}
            className="pop-in w-52 text-left"
            style={{ animationDelay: `${0.1 + i * 0.12}s` }}
          >
            <p className="font-mono text-xs text-white/50">{c.ref}</p>
            <span
              className={cn(
                "mt-2 inline-block rounded-full bg-gradient-to-r px-2.5 py-0.5 text-[11px] font-semibold text-white",
                c.c
              )}
            >
              {translate(L, `phase.${c.phase}`)}
            </span>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className={cn("grow-x h-full rounded-full bg-gradient-to-r", c.c)} style={{ width: c.w }} />
            </div>
          </Panel>
        ))}
      </div>
    );
  }

  if (k === "problem") {
    const items = [
      { icon: <FileSpreadsheet className="h-8 w-8" />, label: ui.paper },
      { icon: <Clock className="h-8 w-8" />, label: ui.delays },
      { icon: <FileText className="h-8 w-8" />, label: ui.noTrace },
    ];
    return (
      <div className="flex gap-5">
        {items.map((it, i) => (
          <Panel
            key={i}
            className="pop-in flex w-40 flex-col items-center gap-3 border-danger-500/40 bg-danger-500/10"
            style={{ animationDelay: `${0.1 + i * 0.14}s` }}
          >
            <div className="relative text-danger-300">
              <span className="absolute inset-0 animate-ping rounded-full bg-danger-500/20" />
              {it.icon}
              <AlertTriangle className="absolute -right-2 -top-2 h-4 w-4 text-danger-400" />
            </div>
            <span className="text-center text-sm font-semibold text-white/85">{it.label}</span>
          </Panel>
        ))}
      </div>
    );
  }

  if (k === "timeline") {
    const phases = [
      "intake",
      "reconnaissance",
      "releve_topographique",
      "analyse_juridique",
      "evaluation_domaniale",
      "validation",
      "cloture",
    ];
    return (
      <div className="flex w-full max-w-3xl items-start justify-between">
        {phases.map((p, i) => (
          <div key={p} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <span
                className={cn("grow-x h-1 flex-1 rounded-full", i === 0 ? "opacity-0" : i <= 4 ? "bg-brand-400" : "bg-white/15")}
                style={{ animationDelay: `${i * 0.12}s` }}
              />
              <span
                className={cn(
                  "pop-in flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold",
                  i === 4
                    ? "bg-brand-gradient text-white shadow-[0_0_22px_-2px_rgba(217,70,239,0.9)] ring-2 ring-white/40"
                    : i < 4
                    ? "bg-brand-gradient text-white shadow-brand"
                    : "bg-white/10 text-white/60"
                )}
                style={{ animationDelay: `${i * 0.12}s` }}
              >
                {i < 4 ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </span>
              <span
                className={cn("h-1 flex-1 rounded-full", i === phases.length - 1 ? "opacity-0" : "bg-white/15")}
              />
            </div>
            <span className="mt-2 hidden max-w-[84px] text-center text-[10px] leading-tight text-white/55 sm:block">
              {translate(L, `phase.${p}`)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (k === "dashboard") {
    const kpis = [
      { icon: <FolderOpen className="h-5 w-5" />, label: ui.active, to: 10, suffix: "", g: "from-blue-500 to-indigo-600" },
      { icon: <ShieldAlert className="h-5 w-5" />, label: ui.alerts, to: 5, suffix: "", g: "from-amber-500 to-orange-600" },
      { icon: <TrendingUp className="h-5 w-5" />, label: ui.avgDays, to: 23, suffix: "", g: "from-emerald-500 to-teal-600" },
    ];
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-4">
          {kpis.map((kpi, i) => (
            <Panel
              key={i}
              className="pop-in flex w-44 items-center gap-3"
              style={{ animationDelay: `${0.1 + i * 0.12}s` }}
            >
              <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg", kpi.g)}>
                {kpi.icon}
              </div>
              <div className="text-left">
                <p className="text-3xl font-extrabold leading-none">
                  <CountUp to={kpi.to} suffix={kpi.suffix} />
                </p>
                <p className="text-[11px] text-white/60">{kpi.label}</p>
              </div>
            </Panel>
          ))}
        </div>
        <Panel className="pop-in flex w-full max-w-md items-end gap-1.5" style={{ animationDelay: "0.45s" }}>
          {[40, 65, 30, 80, 55, 70, 45, 90, 60].map((h, i) => (
            <span
              key={i}
              className="grow-x flex-1 rounded-t bg-gradient-to-t from-brand-500 to-fuchsia-400"
              style={{ height: h, transformOrigin: "bottom", animationDelay: `${0.5 + i * 0.05}s` }}
            />
          ))}
        </Panel>
      </div>
    );
  }

  if (k === "summary") {
    const sections = [
      { t: translate(L, "ai.summary.status"), c: "bg-blue-500/15 text-blue-200", w: "85%" },
      { t: translate(L, "ai.summary.missing"), c: "bg-amber-500/15 text-amber-200", w: "60%" },
      { t: translate(L, "ai.summary.next"), c: "bg-emerald-500/15 text-emerald-200", w: "72%" },
    ];
    return (
      <Panel className="w-full max-w-md">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-bold text-brand-200">
            <Sparkles className="h-4 w-4" /> {translate(L, "ai.summary.title")}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70">
            <Wand2 className="h-3 w-3" /> {ui.extract}
          </span>
        </div>
        <div className="space-y-2.5">
          {sections.map((s, i) => (
            <div
              key={i}
              className={cn("pop-in rounded-lg px-3 py-2.5", s.c)}
              style={{ animationDelay: `${0.15 + i * 0.15}s` }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{s.t}</p>
              <div className="mt-1.5 space-y-1">
                <div className="grow-x h-1.5 rounded-full bg-white/30" style={{ width: s.w, animationDelay: `${0.3 + i * 0.15}s` }} />
                <div className="grow-x h-1.5 rounded-full bg-white/15" style={{ width: "50%", animationDelay: `${0.4 + i * 0.15}s` }} />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    );
  }

  if (k === "voice") {
    return (
      <div className="flex w-full max-w-lg flex-col items-center gap-4">
        <div className="flex items-end gap-1.5">
          {Array.from({ length: 13 }).map((_, i) => (
            <span
              key={i}
              className="eq-bar w-1.5 rounded-full bg-gradient-to-t from-brand-500 to-cyan-300"
              style={{
                height: 44,
                animationDelay: `${i * 0.07}s`,
                animationDuration: `${0.7 + (i % 4) * 0.1}s`,
              }}
            />
          ))}
        </div>
        <div className="w-full space-y-2.5">
          <div className="pop-in ms-auto w-fit max-w-[80%] rounded-2xl rounded-ee-sm bg-brand-gradient px-4 py-2.5 text-sm font-medium text-white shadow-brand">
            <Mic className="me-1 inline h-3.5 w-3.5" /> {ui.ask}
          </div>
          <div
            className="pop-in w-fit max-w-[88%] rounded-2xl rounded-es-sm border border-white/15 bg-white/10 px-4 py-2.5 text-sm text-white/90"
            style={{ animationDelay: "0.5s" } as React.CSSProperties}
          >
            {ui.answer}
          </div>
        </div>
      </div>
    );
  }

  if (k === "value") {
    const pillars = [
      { icon: <Zap className="h-8 w-8" />, label: ui.speed },
      { icon: <Target className="h-8 w-8" />, label: ui.accuracy },
      { icon: <Eye className="h-8 w-8" />, label: ui.transparency },
    ];
    return (
      <div className="flex gap-7">
        {pillars.map((p, i) => (
          <div
            key={i}
            className="pop-in flex w-32 flex-col items-center gap-3"
            style={{ animationDelay: `${0.1 + i * 0.14}s` }}
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-gradient text-white shadow-[0_0_40px_-8px_rgba(139,92,246,0.8)]">
              {p.icon}
            </div>
            <span className="text-base font-bold text-white/90">{p.label}</span>
          </div>
        ))}
      </div>
    );
  }

  // cta
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="shine flex h-24 w-24 items-center justify-center rounded-[1.75rem] bg-brand-gradient text-4xl font-black text-white shadow-brand-lg">
        D
      </div>
      <p className="text-xl font-bold">{translate(L, "app.name")}</p>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70">
        <ArrowRight className="h-3.5 w-3.5" /> {ui.tryNow}
      </span>
    </div>
  );
}
