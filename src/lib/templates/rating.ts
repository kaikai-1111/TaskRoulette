// Pure helper for the "Rate it" results view. Tolerant of malformed stored
// answers: a bad row is skipped, never thrown on.
import type { RatingConfig } from "./types";

export interface RatingSummary {
  count: number;
  average: number | null;
  distribution: { value: number; count: number }[]; // one bucket per rating value, low to high
  comments: string[];
}

export function summarizeRatings(config: RatingConfig, rawAnswers: string[]): RatingSummary {
  const span = Math.max(0, config.max - config.min + 1);
  const buckets = new Map<number, number>(Array.from({ length: span }, (_, i) => [config.min + i, 0]));
  const comments: string[] = [];
  let total = 0;
  let count = 0;

  for (const raw of rawAnswers) {
    try {
      const a = JSON.parse(raw) as { value?: unknown; comment?: unknown };
      if (typeof a.value !== "number" || !buckets.has(a.value)) continue;
      buckets.set(a.value, (buckets.get(a.value) ?? 0) + 1);
      total += a.value;
      count++;
      if (typeof a.comment === "string" && a.comment.trim()) comments.push(a.comment.trim());
    } catch {
      // skip
    }
  }

  return {
    count,
    average: count ? total / count : null,
    distribution: [...buckets].map(([value, n]) => ({ value, count: n })),
    comments,
  };
}
