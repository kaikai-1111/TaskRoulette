"use client";

import { useEffect, useRef, useState } from "react";
import type { CaptureProps } from "@/lib/templates/CaptureProps";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type Stage = "consent" | "starting" | "ready" | "reviewing" | "uploading" | "error";

export default function PhotoCaptureCapture({ item, onSubmit }: CaptureProps) {
  const [stage, setStage] = useState<Stage>("consent");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    return () => {
      stopStream();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCamera() {
    setStage("starting");
    setErrorMsg(null);
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      streamRef.current = stream;
      if (liveVideoRef.current) liveVideoRef.current.srcObject = stream;
      setStage("ready");
    } catch {
      setErrorMsg(
        "Couldn't access your camera — permission was denied or none is available. You can upload a photo instead, or use Skip below to move on."
      );
      setStage("error");
    }
  }

  function takePhoto() {
    const video = liveVideoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (b) => {
        if (!b) return;
        setBlob(b);
        setPreviewUrl(URL.createObjectURL(b));
        stopStream();
        setStage("reviewing");
      },
      "image/jpeg",
      0.9
    );
  }

  // Alternative to the camera: pick an existing photo from the device. Goes
  // through the same review/submit step as a camera shot.
  function handleFileChosen(file: File | undefined) {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setErrorMsg("That file isn't a JPEG, PNG, WebP or GIF image.");
      setStage("error");
      return;
    }
    stopStream();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setErrorMsg(null);
    setBlob(file);
    setPreviewUrl(URL.createObjectURL(file));
    setStage("reviewing");
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
      const res = await fetch("/api/uploads/image", {
        method: "POST",
        headers: { "Content-Type": blob.type || "image/jpeg" },
        body: blob,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Upload failed.");
      }
      const { url } = (await res.json()) as { url: string };
      onSubmit({ mediaUrl: url });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Upload failed. Try again.");
      setStage("reviewing");
    }
  }

  const photoPrompt = item.textContent ?? item.prompt;

  const uploadControl = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          handleFileChosen(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="w-full rounded-full border border-black/10 dark:border-white/20 px-6 py-3 font-medium active:scale-95 transition"
      >
        Upload a photo instead
      </button>
    </>
  );

  if (stage === "consent") {
    return (
      <div className="flex flex-col items-center gap-4 w-full max-w-sm text-center">
        <p className="text-lg font-medium">{photoPrompt}</p>
        <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-left">
          <p className="font-semibold mb-1">This challenge collects a photo.</p>
          <p className="text-black/60 dark:text-white">
            You&apos;ll be asked for camera access, or you can upload a photo you already have. By submitting you agree the photo may be stored
            and used as training/derived data, per the{" "}
            <a href="/terms" className="underline">
              terms
            </a>
            . Avoid photos of other identifiable people if you can. If you&apos;d rather not, use Skip
            below.
          </p>
        </div>
        <button
          onClick={startCamera}
          className="w-full rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 px-6 py-3 font-semibold text-white active:scale-95 transition"
        >
          Allow camera &amp; take photo
        </button>
        {uploadControl}
      </div>
    );
  }

  if (stage === "starting") {
    return <p className="text-black/40 dark:text-white">Requesting camera access…</p>;
  }

  if (stage === "error") {
    return (
      <div className="flex flex-col items-center gap-3 text-center max-w-sm">
        <p className="text-red-500 text-sm">{errorMsg}</p>
        {uploadControl}
      </div>
    );
  }

  if (stage === "ready") {
    return (
      <div className="flex flex-col items-center gap-4 w-full max-w-sm">
        <p className="text-lg font-medium text-center">{photoPrompt}</p>
        <div className="relative w-full aspect-video overflow-hidden rounded-lg bg-black">
          <video ref={liveVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
        </div>
        <button
          onClick={takePhoto}
          className="w-full rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 px-6 py-3 font-semibold text-white active:scale-95 transition"
        >
          Take photo
        </button>
      </div>
    );
  }

  if (stage === "reviewing" || stage === "uploading") {
    return (
      <div className="flex flex-col items-center gap-4 w-full max-w-sm">
        <p className="text-lg font-medium text-center">{photoPrompt}</p>
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className="w-full rounded-lg bg-black" />
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
            className="flex-1 rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 px-4 py-3 font-semibold text-white disabled:opacity-30 active:scale-95 transition"
          >
            {stage === "uploading" ? "Uploading…" : "Submit"}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
