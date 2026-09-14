"use client";

import { useState } from "react";
import type { CaptureProps } from "@/lib/templates/CaptureProps";
import type { LabelingConfig } from "@/lib/templates/types";

export default function LabelingCapture({ item, onSubmit }: CaptureProps) {
  const config = item.config as LabelingConfig;
  const [text, setText] = useState("");

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <p className="text-lg font-medium text-center">{item.prompt}</p>

      {item.mediaUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.mediaUrl}
          alt=""
          className="max-w-full max-h-[50vh] rounded-lg"
        />
      )}
      {item.textContent && (
        <blockquote className="max-w-md rounded-lg bg-black/5 dark:bg-white/10 p-4 text-base italic">
          &ldquo;{item.textContent}&rdquo;
        </blockquote>
      )}

      {config.options ? (
        <div className="flex flex-wrap justify-center gap-2 max-w-md">
          {config.options.map((opt) => (
            <button
              key={opt}
              onClick={() => onSubmit({ value: opt })}
              className="rounded-full border border-black/10 dark:border-white/20 px-5 py-2.5 font-medium hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 active:scale-95 transition"
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <form
          className="flex w-full max-w-xs flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) onSubmit({ value: text.trim() });
          }}
        >
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your answer..."
            className="rounded-full border border-black/10 dark:border-white/20 bg-transparent px-5 py-3 text-center outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="w-full rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 px-6 py-3 font-semibold text-white disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition"
          >
            Submit
          </button>
        </form>
      )}
    </div>
  );
}
