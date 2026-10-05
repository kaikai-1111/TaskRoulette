// Pure helpers for reading survey results — shared by the results page and
// the CSV export. Tolerant of malformed rows: a bad stored answer is skipped,
// never thrown on.
import type { SurveyConfig, SurveyQuestion, SurveyAnswerValue } from "./types";

export interface QuestionResult {
  question: SurveyQuestion;
  answered: number;
  counts?: { label: string; count: number }[]; // SINGLE / MULTI / SCALE (one bucket per rating)
  average?: number; // SCALE
  texts?: string[]; // TEXT
}

type ParsedAnswers = Map<string, SurveyAnswerValue | null>;

export function parseSurveyAnswer(raw: string): ParsedAnswers | null {
  try {
    const parsed = JSON.parse(raw) as { responses?: { questionId?: unknown; value?: unknown }[] };
    if (!Array.isArray(parsed.responses)) return null;
    const m: ParsedAnswers = new Map();
    for (const r of parsed.responses) {
      if (typeof r?.questionId === "string") m.set(r.questionId, (r.value ?? null) as SurveyAnswerValue | null);
    }
    return m;
  } catch {
    return null;
  }
}

export function aggregateSurvey(config: SurveyConfig, rawAnswers: string[]): QuestionResult[] {
  const all = rawAnswers.map(parseSurveyAnswer).filter((a): a is ParsedAnswers => a !== null);

  return config.questions.map((question): QuestionResult => {
    const values = all
      .map((a) => a.get(question.id))
      .filter((v): v is SurveyAnswerValue => v !== undefined && v !== null);
    const result: QuestionResult = { question, answered: values.length };

    if (question.kind === "SINGLE" || question.kind === "MULTI") {
      const tally = new Map<string, number>((question.options ?? []).map((o) => [o, 0]));
      for (const v of values) {
        for (const pick of Array.isArray(v) ? v : [v]) {
          if (typeof pick === "string" && tally.has(pick)) tally.set(pick, (tally.get(pick) ?? 0) + 1);
        }
      }
      result.counts = [...tally].map(([label, count]) => ({ label, count }));
    } else if (question.kind === "SCALE") {
      const max = question.scaleMax ?? 5;
      const nums = values.filter((v): v is number => typeof v === "number");
      result.counts = Array.from({ length: max }, (_, i) => ({
        label: String(i + 1),
        count: nums.filter((n) => n === i + 1).length,
      }));
      result.average = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : undefined;
    } else {
      result.texts = values.filter((v): v is string => typeof v === "string");
    }
    return result;
  });
}

// Respondents control these strings, and the creator will open the file in a
// spreadsheet — a leading = + - @ (or tab/CR) would be run as a formula, so
// neutralize it with a leading apostrophe (the standard mitigation).
function csvCell(raw: string): string {
  const v = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

// One row per respondent, one column per question. MULTI answers are joined
// with " | ". Respondents are anonymous — no identifying column on purpose.
export function surveyToCsv(
  config: SurveyConfig,
  submissions: { answer: string; createdAt: Date }[]
): string {
  const header = ["submitted_at", ...config.questions.map((q) => q.text)];
  const rows = submissions.map((s) => {
    const parsed = parseSurveyAnswer(s.answer);
    return [
      s.createdAt.toISOString(),
      ...config.questions.map((q) => {
        const v = parsed?.get(q.id);
        if (v === undefined || v === null) return "";
        return Array.isArray(v) ? v.join(" | ") : String(v);
      }),
    ];
  });
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
