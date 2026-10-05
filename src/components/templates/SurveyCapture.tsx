"use client";

import { useState } from "react";
import type { CaptureProps } from "@/lib/templates/CaptureProps";
import type { SurveyConfig, SurveyQuestion, SurveyAnswerValue } from "@/lib/templates/types";

type Values = Record<string, SurveyAnswerValue | undefined>;

function isBlank(v: SurveyAnswerValue | undefined): boolean {
  return v === undefined || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && v.length === 0);
}

export default function SurveyCapture({ item, onSubmit }: CaptureProps) {
  const { questions } = item.config as SurveyConfig;
  const [values, setValues] = useState<Values>({});
  const [error, setError] = useState<string | null>(null);

  function set(id: string, v: SurveyAnswerValue | undefined) {
    setValues((prev) => ({ ...prev, [id]: v }));
    setError(null);
  }

  function toggleMulti(q: SurveyQuestion, option: string) {
    const current = (values[q.id] as string[] | undefined) ?? [];
    set(q.id, current.includes(option) ? current.filter((o) => o !== option) : [...current, option]);
  }

  function submit() {
    const missing = questions.findIndex((q) => q.required && isBlank(values[q.id]));
    if (missing !== -1) {
      setError(`Question ${missing + 1} still needs an answer.`);
      return;
    }
    onSubmit({
      responses: questions.map((q) => ({
        questionId: q.id,
        value: isBlank(values[q.id]) ? null : (values[q.id] as SurveyAnswerValue),
      })),
    });
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-5">
      <p className="text-lg font-semibold text-center">{item.prompt}</p>

      {questions.map((q, i) => (
        <fieldset key={q.id} className="flex flex-col gap-2">
          <legend className="text-sm font-medium">
            {i + 1}. {q.text}
            {!q.required && <span className="ml-1 text-xs text-black/40 dark:text-white">(optional)</span>}
          </legend>

          {q.kind === "SINGLE" &&
            q.options?.map((o) => (
              <label
                key={o}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  values[q.id] === o ? "border-blue-500 bg-blue-500/10" : "border-black/10 dark:border-white/15"
                }`}
              >
                <input type="radio" name={q.id} checked={values[q.id] === o} onChange={() => set(q.id, o)} />
                {o}
              </label>
            ))}

          {q.kind === "MULTI" &&
            q.options?.map((o) => {
              const checked = ((values[q.id] as string[] | undefined) ?? []).includes(o);
              return (
                <label
                  key={o}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    checked ? "border-blue-500 bg-blue-500/10" : "border-black/10 dark:border-white/15"
                  }`}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggleMulti(q, o)} />
                  {o}
                </label>
              );
            })}

          {q.kind === "SCALE" && (
            <div className="flex gap-1.5">
              {Array.from({ length: q.scaleMax ?? 5 }, (_, n) => n + 1).map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => set(q.id, n)}
                  className={`h-10 flex-1 rounded-lg border text-sm font-medium ${
                    values[q.id] === n
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-black/10 dark:border-white/15"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}

          {q.kind === "TEXT" && (
            <textarea
              rows={3}
              maxLength={2000}
              value={(values[q.id] as string | undefined) ?? ""}
              onChange={(e) => set(q.id, e.target.value)}
              className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
            />
          )}
        </fieldset>
      ))}

      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</p>}
      <button
        onClick={submit}
        className="rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 px-6 py-3 font-semibold text-white active:scale-95 transition"
      >
        Submit
      </button>
    </div>
  );
}
