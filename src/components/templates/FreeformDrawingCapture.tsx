"use client";

import { useRef, useState } from "react";
import type { CaptureProps } from "@/lib/templates/CaptureProps";

type Point = [number, number]; // normalized 0..1, relative to the canvas box

export default function FreeformDrawingCapture({ item, onSubmit }: CaptureProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [current, setCurrent] = useState<Point[] | null>(null);
  const drawing = useRef(false);

  function normalize(clientX: number, clientY: number): Point {
    const box = boxRef.current!.getBoundingClientRect();
    return [
      Math.min(Math.max((clientX - box.left) / box.width, 0), 1),
      Math.min(Math.max((clientY - box.top) / box.height, 0), 1),
    ];
  }

  function handlePointerDown(e: React.PointerEvent) {
    drawing.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setCurrent([normalize(e.clientX, e.clientY)]);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!drawing.current) return;
    setCurrent((s) => (s ? [...s, normalize(e.clientX, e.clientY)] : s));
  }

  function handlePointerUp() {
    if (!drawing.current) return;
    drawing.current = false;
    setCurrent((s) => {
      if (s && s.length > 1) setStrokes((strokes) => [...strokes, s]);
      return null;
    });
  }

  function undo() {
    setStrokes((s) => s.slice(0, -1));
  }

  function clear() {
    setStrokes([]);
  }

  function submit() {
    if (strokes.length === 0) return;
    onSubmit({ strokes });
  }

  const drawPrompt = item.textContent ?? item.prompt;

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <p className="text-lg font-medium text-center">
        Draw: <span className="underline decoration-wavy">{drawPrompt}</span>
      </p>
      <div
        ref={boxRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative aspect-square w-full max-w-sm select-none touch-none rounded-lg border border-black/10 dark:border-white/15 bg-white cursor-crosshair overflow-hidden"
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          {strokes.map((stroke, i) => (
            <polyline
              key={i}
              points={stroke.map(([x, y]) => `${x * 100},${y * 100}`).join(" ")}
              fill="none"
              stroke="black"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {current && (
            <polyline
              points={current.map(([x, y]) => `${x * 100},${y * 100}`).join(" ")}
              fill="none"
              stroke="black"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
      </div>
      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={undo}
          disabled={strokes.length === 0}
          className="rounded-full border border-black/10 dark:border-white/20 px-4 py-1.5 disabled:opacity-30"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={strokes.length === 0}
          className="rounded-full border border-black/10 dark:border-white/20 px-4 py-1.5 disabled:opacity-30"
        >
          Clear
        </button>
      </div>
      <button
        onClick={submit}
        disabled={strokes.length === 0}
        className="w-full max-w-xs rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 px-6 py-3 font-semibold text-white disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition"
      >
        Submit drawing
      </button>
    </div>
  );
}
