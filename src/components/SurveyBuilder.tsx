"use client";

import { ECONOMY } from "@/lib/economy";
import type { SurveyConfig, SurveyQuestion, SurveyQuestionKind } from "@/lib/templates/types";

export interface QuestionDraft {
  id: string;
  text: string;
  kind: SurveyQuestionKind;
  optionsInput: string; // one option per line, SINGLE / MULTI only
  scaleMax: number; // SCALE only
  required: boolean;
}

const KIND_LABELS: Record<SurveyQuestionKind, string> = {
  SINGLE: "Multiple choice (pick one)",
  MULTI: "Checkboxes (pick any)",
  SCALE: "Rating scale",
  TEXT: "Free text",
};

export function newQuestion(): QuestionDraft {
  return {
    id: `q_${Math.random().toString(36).slice(2, 8)}`,
    text: "",
    kind: "SINGLE",
    optionsInput: "",
    scaleMax: 5,
    required: true,
  };
}

export function draftsFromConfig(config: unknown): QuestionDraft[] {
  const questions = (config as Partial<SurveyConfig>)?.questions;
  if (!Array.isArray(questions) || questions.length === 0) return [newQuestion()];
  return questions.map((q) => ({
    id: q.id,
    text: q.text,
    kind: q.kind,
    optionsInput: (q.options ?? []).join("\n"),
    scaleMax: q.scaleMax ?? 5,
    required: q.required,
  }));
}

// Server-side validateConfig is the real check; this just shapes the payload.
export function draftsToConfig(drafts: QuestionDraft[]): SurveyConfig {
  return {
    questions: drafts.map((d): SurveyQuestion => {
      const base = { id: d.id, text: d.text.trim(), kind: d.kind, required: d.required };
      if (d.kind === "SINGLE" || d.kind === "MULTI") {
        return {
          ...base,
          options: d.optionsInput
            .split("\n")
            .map((o) => o.trim())
            .filter(Boolean),
        };
      }
      if (d.kind === "SCALE") return { ...base, scaleMax: d.scaleMax };
      return base;
    }),
  };
}

export default function SurveyBuilder({
  questions,
  onChange,
  disabled,
}: {
  questions: QuestionDraft[];
  onChange: (next: QuestionDraft[]) => void;
  disabled?: boolean;
}) {
  function update(id: string, patch: Partial<QuestionDraft>) {
    onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  function move(index: number, delta: -1 | 1) {
    const next = [...questions];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <fieldset disabled={disabled} className="flex flex-col gap-3 disabled:opacity-50">
      <legend className="mb-1.5 text-sm font-medium">Questions</legend>

      {questions.map((q, i) => (
        <div
          key={q.id}
          className="flex flex-col gap-2 rounded-lg border border-black/10 dark:border-white/15 p-3"
        >
          <div className="flex items-center justify-between text-xs text-black/50 dark:text-white">
            <span className="font-semibold">Question {i + 1}</span>
            <span className="flex items-center gap-3">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="disabled:opacity-30">
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === questions.length - 1}
                className="disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => onChange(questions.filter((x) => x.id !== q.id))}
                disabled={questions.length === 1}
                className="text-red-500 disabled:opacity-30"
              >
                Remove
              </button>
            </span>
          </div>

          <input
            required
            value={q.text}
            maxLength={300}
            onChange={(e) => update(q.id, { text: e.target.value })}
            placeholder="e.g. How often do you eat lunch at school?"
            className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
          />

          <select
            value={q.kind}
            onChange={(e) => update(q.id, { kind: e.target.value as SurveyQuestionKind })}
            className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
          >
            {(Object.keys(KIND_LABELS) as SurveyQuestionKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>

          {(q.kind === "SINGLE" || q.kind === "MULTI") && (
            <textarea
              required
              rows={3}
              value={q.optionsInput}
              onChange={(e) => update(q.id, { optionsInput: e.target.value })}
              placeholder={"One answer option per line\nEvery day\nSometimes\nNever"}
              className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm"
            />
          )}

          {q.kind === "SCALE" && (
            <label className="flex items-center gap-2 text-sm">
              Scale from 1 to
              <select
                value={q.scaleMax}
                onChange={(e) => update(q.id, { scaleMax: Number(e.target.value) })}
                className="rounded-lg border border-black/10 dark:border-white/15 bg-transparent px-2 py-1"
              >
                {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="flex items-center gap-2 text-xs text-black/60 dark:text-white">
            <input
              type="checkbox"
              checked={q.required}
              onChange={(e) => update(q.id, { required: e.target.checked })}
            />
            Required
          </label>
        </div>
      ))}

      {questions.length < ECONOMY.MAX_SURVEY_QUESTIONS && (
        <button
          type="button"
          onClick={() => onChange([...questions, newQuestion()])}
          className="self-start rounded-full border border-black/10 dark:border-white/15 px-4 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10"
        >
          + Add question
        </button>
      )}
      <p className="text-xs text-black/40 dark:text-white">
        Respondents answer every question on one card. Results are summarized for you per question,
        with CSV and JSON export.
      </p>
    </fieldset>
  );
}
