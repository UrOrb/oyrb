"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getRecognitionCtor,
  ttsSupported,
  sttSupported,
  pickVoice,
  warmVoices,
  wordCount,
  countFillers,
  type ISpeechRecognition,
} from "@/lib/speech";
import type { Prosody } from "@/lib/emotion";
import type { DeliverySignal } from "@/lib/session";

// Delay after the user stops speaking before we treat the turn as finished.
const SILENCE_MS = 1100;

export type VoiceStatus = "idle" | "listening" | "speaking";

export function useVoice(onUtterance: (text: string, delivery: DeliverySignal) => void) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [interim, setInterim] = useState("");
  const [micReady, setMicReady] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const recRef = useRef<ISpeechRecognition | null>(null);
  const wantListenRef = useRef(false);
  const speakingRef = useRef(false);
  const finalBufRef = useRef("");
  const startTimeRef = useRef(0);
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onUtteranceRef = useRef(onUtterance);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    onUtteranceRef.current = onUtterance;
  }, [onUtterance]);

  useEffect(() => {
    warmVoices(() => {
      voiceRef.current = pickVoice(true);
    });
    voiceRef.current = pickVoice(true);
  }, []);

  const clearSilence = () => {
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }
  };

  const emit = useCallback(() => {
    clearSilence();
    const text = finalBufRef.current.trim();
    finalBufRef.current = "";
    setInterim("");
    if (!text || speakingRef.current) return;
    const words = wordCount(text);
    const elapsed = startTimeRef.current ? (Date.now() - startTimeRef.current) / 1000 : 0;
    startTimeRef.current = 0;
    const wpm = elapsed > 0.4 ? Math.round(words / (elapsed / 60)) : undefined;
    onUtteranceRef.current(text, { words, wpm, fillers: countFillers(text) });
  }, []);

  const ensureRecognition = useCallback((): ISpeechRecognition | null => {
    if (recRef.current) return recRef.current;
    const Ctor = getRecognitionCtor();
    if (!Ctor) return null;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      if (speakingRef.current) return; // ignore our own voice bleed-through
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const alt = r[0];
        if (!alt) continue;
        if (r.isFinal) {
          finalBufRef.current += (finalBufRef.current ? " " : "") + alt.transcript.trim();
        } else {
          interimText += alt.transcript;
        }
      }
      if (!startTimeRef.current && (finalBufRef.current || interimText)) startTimeRef.current = Date.now();
      setInterim(interimText);
      clearSilence();
      silenceTimer.current = setTimeout(emit, SILENCE_MS);
    };

    rec.onerror = (ev) => {
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
        setPermissionError("Microphone access was blocked. Enable it in your browser to speak.");
        wantListenRef.current = false;
        setStatus("idle");
      }
      // 'no-speech' and 'aborted' are normal; the onend handler restarts.
    };

    rec.onend = () => {
      // Chrome ends recognition after a silence; restart if we still want it.
      if (wantListenRef.current && !speakingRef.current) {
        try {
          rec.start();
        } catch {
          /* already started */
        }
      } else if (!wantListenRef.current) {
        setStatus((s) => (s === "listening" ? "idle" : s));
      }
    };

    recRef.current = rec;
    return rec;
  }, [emit]);

  const startListening = useCallback(() => {
    setPermissionError(null);
    const rec = ensureRecognition();
    if (!rec) {
      setMicReady(false);
      return;
    }
    wantListenRef.current = true;
    if (!speakingRef.current) {
      try {
        rec.start();
      } catch {
        /* already running */
      }
      setStatus("listening");
    }
  }, [ensureRecognition]);

  const stopListening = useCallback(() => {
    wantListenRef.current = false;
    clearSilence();
    // flush anything captured
    if (finalBufRef.current.trim()) emit();
    try {
      recRef.current?.stop();
    } catch {
      /* noop */
    }
    setStatus((s) => (s === "listening" ? "idle" : s));
    setInterim("");
  }, [emit]);

  /** Speak text with emotion-driven prosody. Pauses the mic while talking. */
  const speak = useCallback((text: string, prosody: Prosody): Promise<void> => {
    return new Promise((resolve) => {
      if (!ttsSupported() || !text.trim()) {
        resolve();
        return;
      }
      const synth = window.speechSynthesis;
      synth.cancel();
      speakingRef.current = true;
      setStatus("speaking");
      // pause listening so we don't transcribe ourselves
      try {
        recRef.current?.abort();
      } catch {
        /* noop */
      }
      finalBufRef.current = "";
      setInterim("");

      const u = new SpeechSynthesisUtterance(text);
      if (voiceRef.current) u.voice = voiceRef.current;
      u.rate = prosody.rate;
      u.pitch = prosody.pitch;
      u.volume = prosody.volume;

      const finish = () => {
        speakingRef.current = false;
        if (wantListenRef.current) {
          const rec = ensureRecognition();
          try {
            rec?.start();
          } catch {
            /* noop */
          }
          setStatus("listening");
        } else {
          setStatus("idle");
        }
        resolve();
      };

      u.onend = finish;
      u.onerror = finish;
      synth.speak(u);
    });
  }, [ensureRecognition]);

  const shutUp = useCallback(() => {
    if (ttsSupported()) window.speechSynthesis.cancel();
    speakingRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      clearSilence();
      try {
        recRef.current?.abort();
      } catch {
        /* noop */
      }
      if (ttsSupported()) window.speechSynthesis.cancel();
    };
  }, []);

  return {
    status,
    interim,
    micReady,
    permissionError,
    sttSupported: sttSupported(),
    ttsSupported: ttsSupported(),
    startListening,
    stopListening,
    speak,
    shutUp,
  };
}
