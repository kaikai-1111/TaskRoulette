// Display names (and real first/last names) accept any characters — letters
// in any script, emoji, punctuation — unlike usernames (see username.ts).
// The only things removed are ones that can't be stored or would mislead:
//  - control characters (incl. NUL, which Postgres text columns reject, and
//    newlines, which would break one-line layouts) become spaces;
//  - bidirectional override/isolate marks, which can reverse surrounding
//    text to impersonate someone in admin lists and "by <name>" labels.
// Length is counted in characters, not UTF-16 units, so an emoji at the
// limit is kept whole instead of being cut into a broken half.
export const DISPLAY_NAME_MAX = 40;

const UNWANTED = /[\u0000-\u001F\u007F-\u009F‎‏‪-‮⁦-⁩]/g;

export function cleanText(raw: string, max: number): string {
  const collapsed = raw.replace(UNWANTED, " ").replace(/\s+/g, " ").trim();
  return Array.from(collapsed).slice(0, max).join("").trim();
}

export function cleanDisplayName(raw: string): string {
  return cleanText(raw, DISPLAY_NAME_MAX);
}

// First visible character, for avatar circles. charAt(0) would return half
// of an emoji.
export function initialOf(name: string | null | undefined): string {
  const first = Array.from((name ?? "").trim())[0];
  return first ? first.toUpperCase() : "?";
}
