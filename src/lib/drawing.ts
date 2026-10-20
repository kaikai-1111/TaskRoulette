// Visitor-drawn background doodles. A drawing is a set of strokes on a
// 100x100 board; each stroke is a flat [x0, y0, x1, y1, ...] list. Shared by
// the drawing tool (client) and the server action that validates what arrives.

export const DRAWING = {
  SECONDS: 60, // how long the tool gives you
  MAX_STROKES: 150,
  MAX_POINTS: 4000, // across all strokes
  MIN_POINTS: 3, // enough to be a drawing, not a stray tap
  SHOWN_ON_BACKGROUND: 40, // random pick from today's drawings
  GALLERY_SIZE: 60,
  // One report isn't enough to hide a drawing: anyone can mint a fresh
  // anonymous visitor, so a single report would let one person blank the set.
  REPORTS_TO_HIDE: 2,
  MIN_GAP_MS: 3000, // a human can't finish a drawing faster; stops scripted floods
} as const;

export type Strokes = number[][];

const round1 = (n: number) => Math.round(n * 10) / 10;

// Returns a cleaned copy, or null if the input isn't a plausible drawing.
export function cleanStrokes(input: unknown): Strokes | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > DRAWING.MAX_STROKES) return null;
  const out: Strokes = [];
  let points = 0;
  for (const stroke of input) {
    if (!Array.isArray(stroke) || stroke.length < 2 || stroke.length % 2 !== 0) return null;
    const cleaned: number[] = [];
    for (const n of stroke) {
      if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 100) return null;
      cleaned.push(round1(n));
    }
    points += cleaned.length / 2;
    if (points > DRAWING.MAX_POINTS) return null;
    out.push(cleaned);
  }
  return points >= DRAWING.MIN_POINTS ? out : null;
}

// SVG path data for the strokes. A lone tap becomes a zero-length segment,
// which a round line cap draws as a dot.
export function strokesToPath(strokes: Strokes): string {
  return strokes
    .map((s) => {
      let d = `M${s[0]} ${s[1]}`;
      if (s.length === 2) return `${d}l0.01 0.01`;
      for (let i = 2; i < s.length; i += 2) d += `L${s[i]} ${s[i + 1]}`;
      return d;
    })
    .join("");
}
