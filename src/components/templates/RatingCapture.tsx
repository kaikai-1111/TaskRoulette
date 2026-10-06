"use client";

import { useState } from "react";
import type { CaptureProps } from "@/lib/templates/CaptureProps";
import type { RatingConfig } from "@/lib/templates/types";

// Up to this many values get a tappable button row; anything wider (e.g. a
// 0–100 scale) switches to a slider, since 30+ buttons wouldn't fit a phone.
const MAX_BUTTONS = 11;

export default function RatingCapture({ item, onSubmit }: CaptureProps) {
  const config = item.config as RatingConfig;
  const [value, setValue] = useState<number | null>(null);
  const [comment, setComment] = useState("");

  const span = config.max - config.min + 1;
  const values = Array.from({ length: span }, (_, i) => config.min + i);
  const useButtons = span <= MAX_BUTTONS;

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4">
      <p className="text-lg font-medium text-center">{item.prompt}</p>

      {item.mediaUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.mediaUrl} alt="" className="max-w-full max-h-[45vh] rounded-lg" />
      )}
      {item.textContent && (
        <blockquote className="max-w-md rounded-lg bg-black/5 dark:bg-white/10 p-4 text-base italic">
          &ldquo;{item.textContent}&rdquo;
        </blockquote>
      )}

      <div className="flex w-full flex-col gap-1.5">
        {useButtons ? (
          <div className="flex gap-1.5">
            {values.map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => setValue(n)}
                className={`h-11 min-w-0 flex-1 rounded-lg border text-sm font-medium transition ${
                  value === n
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-black/10 dark:border-white/15 hover:border-blue-500"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl font-semibold tabular-nums">{value ?? "—"}</span>
            <input
              type="range"
              min={config.min}
              max={config.max}
              step={1}
              defaultValue={Math.round((config.min + config.max) / 2)}
              onChange={(e) => setValue(Number(e.currentTarget.value))}
              onPointerUp={(e) => setValue(Number(e.currentTarget.value))}
              className="w-full"
            />
          </div>
        )}

        {(config.lowLabel || config.highLabel) && (
          <div className="flex justify-between text-xs text-black/50 dark:text-white">
            <span>{config.lowLabel}</span>
            <span>{config.highLabel}</span>
          </div>
        )}
      </div>

      {config.allowComment && (
        <textarea
          rows={2}
          maxLength={500}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment (optional)"
          className="w-full rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
        />
      )}

      <button
        onClick={() => value !== null && onSubmit({ value, ...(comment.trim() ? { comment: comment.trim() } : {}) })}
        disabled={value === null}
        className="w-full rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 px-6 py-3 font-semibold text-white disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition"
      >
        Submit
      </button>
    </div>
  );
}
