// Turns a challenge's results into downloadable files. Pure functions — the
// route handler does the auth and fetching (see getChallengeResults).
import { surveyTable } from "./templates/survey";
import type { SurveyConfig } from "./templates/types";

export type ExportFormat = "json" | "jsonl" | "csv" | "tsv";

export const EXPORT_FORMATS: { id: ExportFormat; label: string; ext: string; mime: string; hint: string }[] = [
  { id: "json", label: "JSON", ext: "json", mime: "application/json", hint: "Everything in one nested file" },
  { id: "csv", label: "CSV", ext: "csv", mime: "text/csv; charset=utf-8", hint: "Spreadsheet-ready, one row per response" },
  { id: "jsonl", label: "JSON Lines", ext: "jsonl", mime: "application/x-ndjson", hint: "One JSON object per response, for data pipelines" },
  { id: "tsv", label: "TSV", ext: "tsv", mime: "text/tab-separated-values; charset=utf-8", hint: "Tab-separated, one row per response" },
];

export function parseExportFormat(raw: string | null): ExportFormat | null {
  if (raw === null) return "json"; // no ?format= keeps the original behaviour
  return EXPORT_FORMATS.some((f) => f.id === raw) ? (raw as ExportFormat) : null;
}

export interface ExportChallenge {
  id: string;
  prompt: string;
  templateType: string;
  category: string;
  purpose: string;
  status: string;
  config: string; // raw JSON string, as stored
  items: {
    id: string;
    mediaUrl: string | null;
    textContent: string | null;
    submissions: { answer: string; timeTakenMs: number; createdAt: Date }[];
  }[];
}

// Uploaded media is stored as a site-relative path (/uploads/...) when
// running without Blob storage; a downloaded file needs a usable address.
function absolutize(url: string | null, origin: string): string | null {
  return url && url.startsWith("/") ? origin + url : url;
}

// Walk an answer and absolutize any mediaUrl (photo / video answers).
function withAbsoluteMedia(answer: unknown, origin: string): unknown {
  if (answer && typeof answer === "object" && !Array.isArray(answer)) {
    const a = { ...(answer as Record<string, unknown>) };
    if (typeof a.mediaUrl === "string") a.mediaUrl = absolutize(a.mediaUrl, origin);
    return a;
  }
  return answer;
}

// Respondents control these strings and the creator will open the file in a
// spreadsheet — a leading = + - @ (or tab/CR) would run as a formula, so
// neutralize it with a leading apostrophe. Plain numbers are left alone so
// numeric columns stay numeric.
function cell(raw: string, delimiter: string): string {
  const isNumber = /^[+-]?\d+(\.\d+)?$/.test(raw);
  const v = !isNumber && /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return v.includes(delimiter) || /["\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toDelimited(rows: string[][], delimiter: "," | "\t"): string {
  return rows.map((r) => r.map((c) => cell(c, delimiter)).join(delimiter)).join("\r\n") + "\r\n";
}

function flatValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  return typeof v === "object" ? JSON.stringify(v) : String(v);
}

// Surveys: one row per respondent, one column per question. Everything
// else: one row per response with the item's context first, then the
// answer's own fields as answer_<name> columns (nested values — e.g. drawing
// strokes — are written as JSON text).
function buildTable(ch: ExportChallenge, origin: string): string[][] {
  if (ch.templateType === "SURVEY") {
    return surveyTable(
      JSON.parse(ch.config) as SurveyConfig,
      ch.items.flatMap((i) => i.submissions.map((s) => ({ answer: s.answer, createdAt: s.createdAt })))
    );
  }

  const answerKeys: string[] = [];
  const rows: { base: string[]; answer: Record<string, string> }[] = [];
  for (const item of ch.items) {
    for (const s of item.submissions) {
      let parsed: unknown;
      try {
        parsed = withAbsoluteMedia(JSON.parse(s.answer), origin);
      } catch {
        parsed = s.answer;
      }
      const fields: Record<string, string> = {};
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) fields[k] = flatValue(v);
      } else {
        fields.value = flatValue(parsed);
      }
      for (const k of Object.keys(fields)) if (!answerKeys.includes(k)) answerKeys.push(k);
      rows.push({
        base: [
          item.id,
          item.textContent ?? "",
          absolutize(item.mediaUrl, origin) ?? "",
          s.createdAt.toISOString(),
          String(s.timeTakenMs),
        ],
        answer: fields,
      });
    }
  }
  const header = ["item_id", "item_text", "item_media_url", "submitted_at", "time_taken_ms", ...answerKeys.map((k) => `answer_${k}`)];
  return [header, ...rows.map((r) => [...r.base, ...answerKeys.map((k) => r.answer[k] ?? "")])];
}

export function buildExport(
  ch: ExportChallenge,
  format: ExportFormat,
  origin: string
): { body: string; filename: string; mime: string } {
  const meta = EXPORT_FORMATS.find((f) => f.id === format)!;
  const filename = `challenge-${ch.id}.${meta.ext}`;

  if (format === "csv" || format === "tsv") {
    return { body: toDelimited(buildTable(ch, origin), format === "csv" ? "," : "\t"), filename, mime: meta.mime };
  }

  const config = JSON.parse(ch.config);
  if (format === "jsonl") {
    const lines = ch.items.flatMap((item) =>
      item.submissions.map((s) =>
        JSON.stringify({
          challengeId: ch.id,
          templateType: ch.templateType,
          itemId: item.id,
          itemText: item.textContent,
          itemMediaUrl: absolutize(item.mediaUrl, origin),
          submittedAt: s.createdAt,
          timeTakenMs: s.timeTakenMs,
          answer: withAbsoluteMedia(JSON.parse(s.answer), origin),
        })
      )
    );
    return { body: lines.join("\n") + (lines.length ? "\n" : ""), filename, mime: meta.mime };
  }

  const payload = {
    id: ch.id,
    prompt: ch.prompt,
    templateType: ch.templateType,
    category: ch.category,
    purpose: ch.purpose,
    config,
    status: ch.status,
    items: ch.items.map((item) => ({
      id: item.id,
      mediaUrl: absolutize(item.mediaUrl, origin),
      textContent: item.textContent,
      submissions: item.submissions.map((s) => ({
        answer: withAbsoluteMedia(JSON.parse(s.answer), origin),
        timeTakenMs: s.timeTakenMs,
        createdAt: s.createdAt,
      })),
    })),
  };
  return { body: JSON.stringify(payload, null, 2), filename, mime: meta.mime };
}
