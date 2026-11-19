"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hands-free, turn-based voice conversation for the agent (voice "Step 1"):
 *
 *   listen → detect end of speech → transcribe (/api/transcribe)
 *   → onUtterance(text) returns the agent's reply → speak it (/api/agent/speak)
 *   → listen again …
 *
 * Turn detection is a simple volume (RMS) check on the mic. Playback goes
 * through the same AudioContext the student unlocked with their tap, so
 * browsers that restrict autoplay (incl. iOS Safari) still play replies.
 * The mic is not recorded while the agent speaks, so it never hears itself.
 */

export type VoicePhase = "off" | "listening" | "hearing" | "thinking" | "speaking";

const SPEECH_RMS = 0.025; // volume above which we treat input as speech
const END_OF_TURN_MS = 1300; // silence after speech that ends the turn
const NO_SPEECH_MS = 9000; // give up on a turn if nothing is said
const MAX_TURN_MS = 60_000; // hard cap per turn
const MAX_SILENT_TURNS = 2; // pause the conversation after this many empty turns

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  for (const type of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

export function useVoiceConversation({
  onUtterance,
}: {
  /** Send the student's words to the agent; resolve with the reply to speak. */
  onUtterance: (text: string) => Promise<string | null>;
}) {
  const [phase, setPhase] = useState<VoicePhase>("off");
  const [notice, setNotice] = useState<string | null>(null);

  const onUtteranceRef = useRef(onUtterance);
  useEffect(() => {
    onUtteranceRef.current = onUtterance;
  }, [onUtterance]);

  const activeRef = useRef(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const silentTurnsRef = useRef(0);

  const stop = useCallback(() => {
    activeRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    try {
      sourceRef.current?.stop();
    } catch {
      // already stopped
    }
    sourceRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    analyserRef.current = null;
    void ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    setPhase("off");
  }, []);

  useEffect(() => stop, [stop]);

  function handleSilentTurn() {
    silentTurnsRef.current += 1;
    if (silentTurnsRef.current >= MAX_SILENT_TURNS) {
      stop();
      setNotice("Voice paused. Tap the mic whenever you want to keep talking.");
      return;
    }
    listen();
  }

  async function speak(text: string) {
    const ctx = ctxRef.current;
    if (!ctx) return;
    setPhase("speaking");
    try {
      const res = await fetch("/api/agent/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("speech failed");
      const audio = await ctx.decodeAudioData(await res.arrayBuffer());
      if (!activeRef.current || ctxRef.current !== ctx) return;
      const source = ctx.createBufferSource();
      source.buffer = audio;
      source.connect(ctx.destination);
      sourceRef.current = source;
      source.onended = () => {
        if (sourceRef.current === source) sourceRef.current = null;
        if (activeRef.current) listen();
      };
      source.start();
    } catch {
      // Speech failed — the reply is still on screen; keep the conversation going.
      if (activeRef.current) listen();
    }
  }

  async function handleRecording(blob: Blob) {
    setPhase("thinking");
    try {
      const ext = blob.type.includes("mp4") ? "mp4" : blob.type.includes("ogg") ? "ogg" : "webm";
      const form = new FormData();
      form.append("audio", new File([blob], `turn.${ext}`, { type: blob.type || "audio/webm" }));
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { text?: string };
      if (!activeRef.current) return;
      const text = typeof data.text === "string" ? data.text.trim() : "";
      if (!res.ok || !text) {
        handleSilentTurn();
        return;
      }
      silentTurnsRef.current = 0;
      const reply = await onUtteranceRef.current(text);
      if (!activeRef.current) return;
      if (reply) await speak(reply);
      else listen();
    } catch {
      if (activeRef.current) {
        stop();
        setNotice("Voice hit a problem. Tap the mic to try again.");
      }
    }
  }

  function listen() {
    const stream = streamRef.current;
    const analyser = analyserRef.current;
    if (!activeRef.current || !stream || !analyser) return;

    const mimeType = pickMimeType();
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    const chunks: Blob[] = [];
    let heard = false;

    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (!activeRef.current) return;
      if (!heard) {
        handleSilentTurn();
        return;
      }
      void handleRecording(new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" }));
    };

    recorderRef.current = recorder;
    recorder.start();
    setPhase("listening");

    const samples = new Float32Array(analyser.fftSize);
    // Timestamps come from requestAnimationFrame's own clock.
    let startedAt = 0;
    let lastVoiceAt = 0;

    const tick = (now: number) => {
      if (recorderRef.current !== recorder || recorder.state !== "recording") return;
      if (!startedAt) {
        startedAt = now;
        lastVoiceAt = now;
      }
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
      const rms = Math.sqrt(sum / samples.length);
      if (rms > SPEECH_RMS) {
        lastVoiceAt = now;
        if (!heard) {
          heard = true;
          setPhase("hearing");
        }
      }
      const turnOver = heard ? now - lastVoiceAt > END_OF_TURN_MS : now - startedAt > NO_SPEECH_MS;
      if (turnOver || now - startedAt > MAX_TURN_MS) {
        recorder.stop();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  /** Begin a hands-free conversation. Call from a tap/click. */
  async function start() {
    if (activeRef.current) return;
    setNotice(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setNotice("Voice isn't supported in this browser.");
      return;
    }
    try {
      // Created inside the tap so playback is allowed later.
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      await ctx.resume();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(analyser);
      analyserRef.current = analyser;
      activeRef.current = true;
      silentTurnsRef.current = 0;
      listen();
    } catch {
      stop();
      setNotice("Microphone access is blocked. Allow it in your browser to talk to the agent.");
    }
  }

  /** Stop the agent mid-reply and hand the turn back to the student. */
  function interrupt() {
    try {
      sourceRef.current?.stop(); // onended → listen()
    } catch {
      // nothing playing
    }
  }

  /** End the student's turn now instead of waiting for silence. */
  function finishTurn() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") recorder.stop();
  }

  return { phase, notice, start, stop, interrupt, finishTurn };
}
