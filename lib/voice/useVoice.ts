// Web Speech API wrapper: real speech-to-text (recognition) and text-to-speech
// (synthesis). Runs entirely in the browser — no backend, no API key. SSR-safe.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Locale } from "@/lib/domain/types";

// BCP-47 tags chosen for best browser speech support per app locale.
const SPEECH_LANG: Record<Locale, string> = {
  sq: "sq-AL",
  ar: "ar-SA",
  en: "en-US",
  fr: "fr-FR",
};

// Minimal typings for the (still vendor-prefixed) Web Speech API.
type AnyRecognition = any;

function getRecognitionCtor(): (new () => AnyRecognition) | null {
  if (typeof window === "undefined") return null;
  return (
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    null
  );
}

export interface UseVoice {
  sttSupported: boolean;
  ttsSupported: boolean;
  listening: boolean;
  speaking: boolean;
  transcript: string;
  interim: string;
  start: () => void;
  stop: () => void;
  speak: (text: string, opts?: { onEnd?: () => void }) => void;
  cancelSpeak: () => void;
  resetTranscript: () => void;
  /** Called with the final recognized phrase. */
  onResult?: (text: string) => void;
}

export function useVoice(
  locale: Locale,
  onFinal?: (text: string) => void
): UseVoice {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef<AnyRecognition | null>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  const sttSupported = typeof window !== "undefined" && !!getRecognitionCtor();
  const ttsSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  // (Re)build the recognizer whenever the locale changes.
  useEffect(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const rec: AnyRecognition = new Ctor();
    rec.lang = SPEECH_LANG[locale] ?? "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interimText += res[0].transcript;
      }
      if (interimText) setInterim(interimText);
      if (finalText) {
        setTranscript(finalText.trim());
        setInterim("");
        onFinalRef.current?.(finalText.trim());
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    return () => {
      try {
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        rec.abort?.();
      } catch {
        /* noop */
      }
    };
  }, [locale]);

  const start = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      setInterim("");
      setTranscript("");
      rec.start();
      setListening(true);
    } catch {
      // start() throws if already started; ignore.
    }
  }, []);

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    try {
      rec?.stop();
    } catch {
      /* noop */
    }
    setListening(false);
  }, []);

  const pickVoice = useCallback((): SpeechSynthesisVoice | undefined => {
    if (!ttsSupported) return undefined;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return undefined;
    const want = (SPEECH_LANG[locale] ?? "en-US").toLowerCase();
    const prefix = want.split("-")[0];

    // Score voices to prefer modern, natural-sounding ones.
    const score = (v: SpeechSynthesisVoice): number => {
      const name = v.name.toLowerCase();
      const vlang = v.lang.toLowerCase();
      let s = 0;
      if (vlang === want) s += 6;
      else if (vlang.startsWith(prefix)) s += 4;
      else if (vlang.startsWith("en")) s += 1; // graceful English fallback
      else return -1; // wrong language — avoid (mispronounces text)

      if (/natural|neural|online/.test(name)) s += 12; // MS Online Natural voices (best — use Edge)
      if (/google/.test(name)) s += 7; // Google voices (Chrome) are smooth
      if (/(aria|jenny|guy|eric|michelle|ana|libby|sonia|ryan|emma|natasha|clara)/.test(name)) s += 4;
      if (/(samantha|alex|daniel|karen|moira|tessa|fiona)/.test(name)) s += 4; // Apple
      if (/(zira|david|mark|hazel)/.test(name)) s += 1; // older local MS (robotic)
      if (!v.localService) s += 3; // cloud / online voices are far smoother
      return s;
    };

    let best: SpeechSynthesisVoice | undefined;
    let bestScore = -Infinity;
    for (const v of voices) {
      const sc = score(v);
      if (sc > bestScore) {
        bestScore = sc;
        best = v;
      }
    }
    return best ?? voices[0];
  }, [locale, ttsSupported]);

  const speak = useCallback(
    (text: string, opts?: { onEnd?: () => void }) => {
      if (!ttsSupported || !text) {
        opts?.onEnd?.();
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        const v = pickVoice();
        if (v) {
          u.voice = v;
          u.lang = v.lang;
        } else {
          u.lang = SPEECH_LANG[locale] ?? "en-US";
        }
        // Calmer cadence + neutral pitch reads more smoothly / less robotic.
        u.rate = 0.95;
        u.pitch = 1.0;
        u.volume = 1;
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          setSpeaking(false);
          opts?.onEnd?.();
        };
        u.onstart = () => setSpeaking(true);
        u.onend = finish;
        u.onerror = finish;
        window.speechSynthesis.speak(u);
      } catch {
        setSpeaking(false);
        opts?.onEnd?.();
      }
    },
    [locale, pickVoice, ttsSupported]
  );

  const cancelSpeak = useCallback(() => {
    if (!ttsSupported) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* noop */
    }
    setSpeaking(false);
  }, [ttsSupported]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
    setInterim("");
  }, []);

  // Warm up the voice list (some browsers load voices asynchronously).
  useEffect(() => {
    if (!ttsSupported) return;
    const handler = () => window.speechSynthesis.getVoices();
    handler();
    window.speechSynthesis.onvoiceschanged = handler;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [ttsSupported]);

  return {
    sttSupported,
    ttsSupported,
    listening,
    speaking,
    transcript,
    interim,
    start,
    stop,
    speak,
    cancelSpeak,
    resetTranscript,
  };
}
