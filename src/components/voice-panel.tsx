"use client";

import { Mic, MicOff, PhoneOff } from "lucide-react";
import { useRef, useState } from "react";

type VoiceStatus = "idle" | "connecting" | "live" | "error";

export function VoicePanel() {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [log, setLog] = useState<string[]>([
    "Voice mode will connect through an ephemeral OpenAI Realtime token.",
  ]);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function startVoice() {
    if (status === "connecting" || status === "live") return;
    setStatus("connecting");

    try {
      const tokenResponse = await fetch("/api/realtime-token");
      const tokenData = await tokenResponse.json();
      const ephemeralKey = tokenData?.client_secret?.value ?? tokenData?.value;

      if (!ephemeralKey) {
        throw new Error(tokenData?.error ?? "Missing realtime client secret.");
      }

      const pc = new RTCPeerConnection();
      peerRef.current = pc;

      const audioElement = document.createElement("audio");
      audioElement.autoplay = true;
      audioRef.current = audioElement;
      pc.ontrack = (event) => {
        audioElement.srcObject = event.streams[0];
      };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const dataChannel = pc.createDataChannel("oai-events");
      dataChannel.addEventListener("open", () => {
        dataChannel.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "message",
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: "Start as a concise college planning coach. Ask what the student wants to work on today.",
                },
              ],
            },
          }),
        );
        dataChannel.send(JSON.stringify({ type: "response.create" }));
      });
      dataChannel.addEventListener("message", (event) => {
        const payload = JSON.parse(event.data);
        if (payload.type === "response.output_text.delta" && payload.delta) {
          setLog((current) => [...current.slice(-6), payload.delta]);
        }
        if (payload.type === "error") {
          setLog((current) => [
            ...current.slice(-6),
            payload.error?.message ?? "Realtime error",
          ]);
        }
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp",
        },
      });

      if (!sdpResponse.ok) {
        throw new Error(await sdpResponse.text());
      }

      await pc.setRemoteDescription({
        type: "answer",
        sdp: await sdpResponse.text(),
      });

      setStatus("live");
      setLog((current) => [...current.slice(-6), "Voice session connected."]);
    } catch (error) {
      stopVoice();
      setStatus("error");
      setLog((current) => [
        ...current.slice(-6),
        error instanceof Error ? error.message : "Voice setup failed.",
      ]);
    }
  }

  function stopVoice() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    peerRef.current?.close();
    streamRef.current = null;
    peerRef.current = null;
    audioRef.current = null;
    setStatus("idle");
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border border-black/10 bg-[#fbfaf6] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="flex h-11 items-center gap-2 rounded-md bg-[#2f5d46] px-4 text-sm font-semibold text-white hover:bg-[#264b39] disabled:opacity-50"
            disabled={status === "connecting" || status === "live"}
            onClick={startVoice}
            type="button"
          >
            <Mic size={17} />
            Start
          </button>
          <button
            className="flex h-11 items-center gap-2 rounded-md border border-black/15 bg-white px-4 text-sm font-semibold text-[#17201b] hover:bg-[#f2f4ef]"
            onClick={stopVoice}
            type="button"
          >
            {status === "live" ? <PhoneOff size={17} /> : <MicOff size={17} />}
            Stop
          </button>
          <span className="rounded-md bg-white px-3 py-2 text-sm font-medium text-[#55615b]">
            {status}
          </span>
        </div>
      </div>

      <div className="min-h-28 rounded-lg border border-black/10 bg-white p-4 text-sm leading-6 text-[#55615b]">
        {log.map((entry, index) => (
          <p key={`${entry}-${index}`}>{entry}</p>
        ))}
      </div>
    </div>
  );
}
