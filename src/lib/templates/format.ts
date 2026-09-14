// Shared answer-rendering helpers for the results page and admin views, kept
// in one place so every consumer stays in sync as template types are added.
import type { TemplateType } from "./types";

function round(n: unknown): number {
  return typeof n === "number" ? Math.round(n) : NaN;
}

export function formatAnswerSummary(templateType: TemplateType, raw: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return raw;
  }
  const a = parsed as Record<string, unknown>;

  switch (templateType) {
    case "LABELING":
      return String(a.value ?? raw);
    case "BOUNDING_BOX":
      return `box [${round(a.x)}, ${round(a.y)}, ${round(a.width)}, ${round(a.height)}]`;
    case "POINT":
      return `point (${round(a.x)}, ${round(a.y)})`;
    case "FREEFORM_DRAWING": {
      const strokes = Array.isArray(a.strokes) ? a.strokes.length : 0;
      return `sketch (${strokes} stroke${strokes === 1 ? "" : "s"})`;
    }
    case "VIDEO_RECORDING": {
      const ms = typeof a.durationMs === "number" ? a.durationMs : 0;
      return `video (${(ms / 1000).toFixed(1)}s)`;
    }
    default:
      return raw;
  }
}

export function drawingStrokes(raw: string): [number, number][][] | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Array.isArray(parsed.strokes) ? (parsed.strokes as [number, number][][]) : null;
  } catch {
    return null;
  }
}

export function videoAnswerUrl(raw: string): string | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return typeof parsed.mediaUrl === "string" ? parsed.mediaUrl : null;
  } catch {
    return null;
  }
}
