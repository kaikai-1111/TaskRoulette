"use client";

import { useRef, useState } from "react";
import type { CaptureProps } from "@/lib/templates/CaptureProps";
import type { BoundingBoxConfig } from "@/lib/templates/types";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function BoundingBoxCapture({ item, onSubmit }: CaptureProps) {
  const config = item.config as BoundingBoxConfig;
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);

  function relativePoint(clientX: number, clientY: number) {
    const box = containerRef.current!.getBoundingClientRect();
    return {
      x: Math.min(Math.max(clientX - box.left, 0), box.width),
      y: Math.min(Math.max(clientY - box.top, 0), box.height),
    };
  }

  function handlePointerDown(e: React.PointerEvent) {
    const p = relativePoint(e.clientX, e.clientY);
    setDrawStart(p);
    setRect({ x: p.x, y: p.y, width: 0, height: 0 });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!drawStart) return;
    const p = relativePoint(e.clientX, e.clientY);
    setRect({
      x: Math.min(drawStart.x, p.x),
      y: Math.min(drawStart.y, p.y),
      width: Math.abs(p.x - drawStart.x),
      height: Math.abs(p.y - drawStart.y),
    });
  }

  function handlePointerUp() {
    setDrawStart(null);
  }

  function submit() {
    if (!rect || !imgRef.current || rect.width < 4 || rect.height < 4) return;
    const displayed = containerRef.current!.getBoundingClientRect();
    const scaleX = imgRef.current.naturalWidth / displayed.width;
    const scaleY = imgRef.current.naturalHeight / displayed.height;
    onSubmit({
      x: rect.x * scaleX,
      y: rect.y * scaleY,
      width: rect.width * scaleX,
      height: rect.height * scaleY,
      naturalWidth: imgRef.current.naturalWidth,
      naturalHeight: imgRef.current.naturalHeight,
    });
  }

  const canSubmit = !!rect && rect.width >= 4 && rect.height >= 4;

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <p className="text-lg font-medium text-center">
        Draw a box around <span className="underline decoration-wavy">{config.targetLabel}</span>
      </p>
      <div
        ref={containerRef}
        className="relative select-none touch-none max-w-full max-h-[60vh] cursor-crosshair"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
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
        {rect && (
          <div
            className="absolute border-2 border-emerald-400 bg-emerald-400/20 pointer-events-none"
            style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
          />
        )}
      </div>
      <button
        onClick={submit}
        disabled={!canSubmit}
        className="w-full max-w-xs rounded-full bg-emerald-500 px-6 py-3 font-semibold text-white disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition"
      >
        Submit box
      </button>
    </div>
  );
}
