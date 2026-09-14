"use client";

import { useEffect, useRef, useState } from "react";
import type { CaptureProps } from "@/lib/templates/CaptureProps";
import type { VideoRecordingConfig } from "@/lib/templates/types";

type Stage = "consent" | "starting" | "recording" | "reviewing" | "uploading" | "error";

function pickMimeType(): string {
  const candidates = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(c)) return c;
  }
  return "video/webm";
}

export default function VideoRecordingCapture({ item, onSubmit }: CaptureProps) {
  const config = item.config as VideoRecordingConfig;
  const [stage, setStage] = useState<Stage>("consent");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(config.maxDurationSeconds);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    return () => {
      stopStream();
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      if (tickTimerRef.current) clearInterval(tickTimerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startRecording() {
    setStage("starting");
    setErrorMsg(null);
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: true,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      }
      streamRef.current = stream;
      if (liveVideoRef.current) liveVideoRef.current.srcObject = stream;

      const recorder = new MediaRecorder(stream, { mimeType: pickMimeType() });
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const recordedBlob = new Blob(chunksRef.current, { type: recorder.mimeType });
        setBlob(recordedBlob);
        setPreviewUrl(URL.createObjectURL(recordedBlob));
        stopStream();
        setStage("reviewing");
      };

      startedAtRef.current = Date.now();
      recorder.start();
      setStage("recording");
      setSecondsLeft(config.maxDurationSeconds);

      tickTimerRef.current = setInterval(() => {
        setSecondsLeft((s) => Math.max(0, s - 1));
      }, 1000);
      stopTimerRef.current = setTimeout(() => {
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      }, config.maxDurationSeconds * 1000);
    } catch {
      setErrorMsg(
        "Couldn't access your camera — permission was denied or none is available. Use Skip below to move on."
      );
      setStage("error");
    }
  }

  function stopNow() {
    if (tickTimerRef.current) clearInterval(tickTimerRef.current);
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  function retake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setBlob(null);
    setStage("consent");
  }

  async function submit() {
    if (!blob) return;
    setStage("uploading");
    setErrorMsg(null);
    try {
      const durationMs = Date.now() - startedAtRef.current;
      const res = await fetch("/api/uploads/recording", {
        method: "POST",
        headers: { "Content-Type": blob.type || "video/webm" },
        body: blob,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Upload failed.");
      }
      const { url } = (await res.json()) as { url: string };
      onSubmit({ mediaUrl: url, durationMs });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Upload failed. Try again.");
      setStage("reviewing");
    }
  }

  const drawPrompt = item.textContent ?? item.prompt;

  if (stage === "consent") {
    return (
      <div className="flex flex-col items-center gap-4 w-full max-w-sm text-center">
        <p className="text-lg font-medium">{drawPrompt}</p>
        <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-left">
          <p className="font-semibold mb-1">This challenge records video.</p>
          <p className="text-black/60 dark:text-white/60">
            You&apos;ll be asked for camera (and mic) access. The clip is capped at{" "}
            {config.maxDurationSeconds}s, and by recording you agree it may be stored and used as
            training/derived data, per the{" "}
            <a href="/terms" className="underline">
              terms
            </a>
            . If you can, point the camera at what you&apos;re doing rather than your face. You must
            be 13+ to continue — if you&apos;d rather not, use Skip below.
          </p>
        </div>
        <button
          onClick={startRecording}
          className="w-full rounded-full bg-emerald-500 px-6 py-3 font-semibold text-white active:scale-95 transition"
        >
          Allow camera &amp; record
        </button>
      </div>
    );
  }

  if (stage === "starting") {
    return <p className="text-black/40 dark:text-white/40">Requesting camera access…</p>;
  }

  if (stage === "error") {
    return (
      <div className="flex flex-col items-center gap-3 text-center max-w-sm">
        <p className="text-red-500 text-sm">{errorMsg}</p>
      </div>
    );
  }

  if (stage === "recording") {
    return (
      <div className="flex flex-col items-center gap-4 w-full max-w-sm">
        <p className="text-lg font-medium text-center">{drawPrompt}</p>
        <div className="relative w-full aspect-video overflow-hidden rounded-lg bg-black">
          <video ref={liveVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
          <span className="absolute top-2 right-2 rounded-full bg-red-500 text-white text-xs font-semibold px-2 py-0.5">
            ● REC {secondsLeft}s
          </span>
        </div>
        <button
          onClick={stopNow}
          className="w-full rounded-full bg-black dark:bg-white text-white dark:text-black px-6 py-3 font-semibold active:scale-95 transition"
        >
          Stop now
        </button>
      </div>
    );
  }

  if (stage === "reviewing" || stage === "uploading") {
    return (
      <div className="flex flex-col items-center gap-4 w-full max-w-sm">
        <p className="text-lg font-medium text-center">{drawPrompt}</p>
        {previewUrl && (
          <video src={previewUrl} controls playsInline className="w-full rounded-lg bg-black" />
        )}
        {errorMsg && <p className="text-red-500 text-sm">{errorMsg}</p>}
        <div className="flex w-full gap-2">
          <button
            onClick={retake}
            disabled={stage === "uploading"}
            className="flex-1 rounded-full border border-black/10 dark:border-white/20 px-4 py-3 font-medium disabled:opacity-30"
          >
            Retake
          </button>
          <button
            onClick={submit}
            disabled={stage === "uploading"}
            className="flex-1 rounded-full bg-emerald-500 px-4 py-3 font-semibold text-white disabled:opacity-30 active:scale-95 transition"
          >
            {stage === "uploading" ? "Uploading…" : "Submit"}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
