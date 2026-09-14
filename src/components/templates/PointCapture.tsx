"use client";

import { useRef, useState } from "react";
import type { CaptureProps } from "@/lib/templates/CaptureProps";
import type { PointConfig } from "@/lib/templates/types";

export default function PointCapture({ item, onSubmit }: CaptureProps) {
  const config = item.config as PointConfig;
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);

  function handleClick(e: React.MouseEvent) {
    const box = containerRef.current!.getBoundingClientRect();
    setPoint({
      x: Math.min(Math.max(e.clientX - box.left, 0), box.width),
      y: Math.min(Math.max(e.clientY - box.top, 0), box.height),
    });
  }

  function submit() {
    if (!point || !imgRef.current) return;
    const displayed = containerRef.current!.getBoundingClientRect();
    const scaleX = imgRef.current.naturalWidth / displayed.width;
    const scaleY = imgRef.current.naturalHeight / displayed.height;
    onSubmit({
      x: point.x * scaleX,
      y: point.y * scaleY,
      naturalWidth: imgRef.current.naturalWidth,
      naturalHeight: imgRef.current.naturalHeight,
    });
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <p className="text-lg font-medium text-center">
        Tap <span className="underline decoration-wavy">{config.targetLabel}</span>
      </p>
      <div
        ref={containerRef}
        onClick={handleClick}
        className="relative select-none touch-none max-w-full max-h-[60vh] cursor-crosshair"
      >
        {item.mediaUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={item.mediaUrl}
            alt=""
            draggable={false}
            className="max-w-full max-h-[60vh] pointer-events-none select-none rounded-lg"
          />
        )}
        {point && (
          <div
            className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-orange-500 bg-orange-500/40 pointer-events-none"
            style={{ left: point.x, top: point.y }}
          />
        )}
      </div>
      <button
        onClick={submit}
        disabled={!point}
        className="w-full max-w-xs rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 px-6 py-3 font-semibold text-white disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition"
      >
        Submit tap
      </button>
    </div>
  );
}
