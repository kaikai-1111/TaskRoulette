"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { submitDrawing } from "./actions";
import { DRAWING, strokesToPath } from "@/lib/drawing";
import { DOODLE_COLORS, DOODLE_COLOR_NAMES, type DoodleColor } from "@/lib/doodle-colors";

const MIN_STEP = 0.6; // board units; skips points too close to the last one

export default function DrawTool() {
  const router = useRouter();
  const boardRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const [color, setColor] = useState<DoodleColor>("pink");
  const [strokes, setStrokes] = useState<number[][]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number>(DRAWING.SECONDS);
  const [locked, setLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const totalPoints = strokes.reduce((n, s) => n + s.length / 2, 0);

  // One minute from the first mark, then the board locks.
  useEffect(() => {
    if (startedAt === null || locked) return;
    const t = setInterval(() => {
      const left = DRAWING.SECONDS - (Date.now() - startedAt) / 1000;
      if (left <= 0) {
        setRemaining(0);
        setLocked(true);
        drawing.current = false;
      } else {
        setRemaining(left);
      }
    }, 200);
    return () => clearInterval(t);
  }, [startedAt, locked]);

  function toBoard(clientX: number, clientY: number): [number, number] {
    const box = boardRef.current!.getBoundingClientRect();
    const clamp = (n: number) => Math.min(100, Math.max(0, n));
    return [clamp(((clientX - box.left) / box.width) * 100), clamp(((clientY - box.top) / box.height) * 100)];
  }

  function onPointerDown(e: React.PointerEvent) {
    if (locked || submitting) return;
    if (strokes.length >= DRAWING.MAX_STROKES || totalPoints >= DRAWING.MAX_POINTS) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    setMessage(null);
    if (startedAt === null) setStartedAt(Date.now());
    const [x, y] = toBoard(e.clientX, e.clientY);
    setStrokes((s) => [...s, [x, y]]);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drawing.current || locked) return;
    const [x, y] = toBoard(e.clientX, e.clientY);
    setStrokes((s) => {
      const points = s.reduce((n, st) => n + st.length / 2, 0);
      if (points >= DRAWING.MAX_POINTS) return s;
      const cur = s[s.length - 1];
      if (!cur) return s;
      if (Math.hypot(x - cur[cur.length - 2], y - cur[cur.length - 1]) < MIN_STEP) return s;
      return [...s.slice(0, -1), [...cur, x, y]];
    });
  }

  function onPointerUp() {
    drawing.current = false;
  }

  function undo() {
    if (locked) return;
    setStrokes((s) => s.slice(0, -1));
  }

  function clearAll() {
    setStrokes([]);
    setStartedAt(null);
    setRemaining(DRAWING.SECONDS);
    setLocked(false);
    setMessage(null);
  }

  async function submit() {
    setSubmitting(true);
    setMessage(null);
    try {
      const result = await submitDrawing({ color, strokes });
      if (!result.ok) {
        setMessage({ kind: "error", text: result.error });
        return;
      }
      setMessage({ kind: "ok", text: "It's on the wall! It'll float around the background until midnight UTC." });
      setStrokes([]);
      setStartedAt(null);
      setRemaining(DRAWING.SECONDS);
      setLocked(false);
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: "Couldn't add your drawing right now." });
    } finally {
      setSubmitting(false);
    }
  }

  const secs = Math.ceil(remaining);
  const canSubmit = totalPoints >= DRAWING.MIN_POINTS && !submitting;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-sm items-center justify-between text-sm">
        <span className={`font-semibold tabular-nums ${secs <= 10 && startedAt !== null ? "text-red-500" : ""}`}>
          {startedAt === null ? `${DRAWING.SECONDS}s · starts when you draw` : locked ? "Time's up" : `${secs}s`}
        </span>
        <span className="text-black/40 dark:text-white">{DRAWING.SECONDS} seconds, one color</span>
      </div>

      {/* Dark board so every chalk color (white included) shows up. */}
      <div
        ref={boardRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative aspect-square w-full max-w-sm touch-none select-none overflow-hidden rounded-lg border border-black/10 dark:border-white/15 bg-[#1e293b] cursor-crosshair"
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <path
            d={strokesToPath(strokes)}
            fill="none"
            stroke={DOODLE_COLORS[color]}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {strokes.length === 0 && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-white/30">
            Draw here
          </span>
        )}
      </div>

      <div className="flex max-w-sm flex-wrap justify-center gap-2" role="radiogroup" aria-label="Chalk color">
        {DOODLE_COLOR_NAMES.map((name) => (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={color === name}
            aria-label={name}
            onClick={() => setColor(name)}
            style={{ backgroundColor: DOODLE_COLORS[name] }}
            className={`h-8 w-8 rounded-full border border-black/20 dark:border-white/30 transition ${
              color === name ? "ring-2 ring-offset-2 ring-blue-600 dark:ring-orange-400 ring-offset-white dark:ring-offset-[#0a1120] scale-110" : ""
            }`}
          />
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={undo}
          disabled={strokes.length === 0 || locked}
          className="rounded-full border border-black/15 dark:border-white/20 px-4 py-2 text-sm disabled:opacity-40"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={clearAll}
          disabled={strokes.length === 0 && startedAt === null}
          className="rounded-full border border-black/15 dark:border-white/20 px-4 py-2 text-sm disabled:opacity-40"
        >
          Start over
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 px-6 py-2 font-semibold text-white disabled:opacity-40"
        >
          {submitting ? "Adding…" : "Add to background"}
        </button>
      </div>

      {locked && !message && (
        <p className="text-sm text-black/60 dark:text-white">Time&apos;s up! Add it as it is, or start over.</p>
      )}
      {message && (
        <p className={`text-sm ${message.kind === "ok" ? "text-blue-600 dark:text-blue-400" : "text-red-500"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
