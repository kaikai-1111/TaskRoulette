"use client";

import { useState } from "react";
import { reportDrawing, type GalleryDrawing } from "./actions";
import { strokesToPath } from "@/lib/drawing";
import { DOODLE_COLORS } from "@/lib/doodle-colors";

export default function Gallery({ drawings }: { drawings: GalleryDrawing[] }) {
  const [reported, setReported] = useState<Set<string>>(
    () => new Set(drawings.filter((d) => d.reported).map((d) => d.id))
  );
  const [error, setError] = useState<string | null>(null);

  async function report(id: string) {
    setError(null);
    const result = await reportDrawing(id);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setReported((s) => new Set(s).add(id));
  }

  if (drawings.length === 0) {
    return <p className="text-sm text-black/50 dark:text-white">No drawings yet today. Be the first.</p>;
  }

  return (
    <>
      {error && <p className="mb-2 text-sm text-red-500">{error}</p>}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {drawings.map((d) => (
          <li key={d.id} className="flex flex-col gap-1">
            <div className="aspect-square overflow-hidden rounded-lg border border-black/10 dark:border-white/15 bg-[#1e293b]">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
                <path
                  d={strokesToPath(d.strokes)}
                  fill="none"
                  stroke={DOODLE_COLORS[d.color]}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
            <div className="text-center text-xs text-black/40 dark:text-white">
              {d.mine ? (
                "Yours"
              ) : reported.has(d.id) ? (
                "Reported — thanks"
              ) : (
                <button onClick={() => report(d.id)} className="underline underline-offset-2 hover:text-red-500">
                  Report
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
