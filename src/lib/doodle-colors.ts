// The chalk palette: one flat color per doodle. Shared by the background,
// the drawing tool, and the server (which only accepts these names).
export const DOODLE_COLORS = {
  pink: "#ff2e93",
  red: "#ef2b2b",
  orange: "#ff8a1f",
  yellow: "#ffc400",
  green: "#22c55e",
  blue: "#2b7bff",
  indigo: "#5b4bff",
  violet: "#b44bff",
  brown: "#8a5a34",
  gray: "#9aa3b2",
  white: "#ffffff",
} as const;

export type DoodleColor = keyof typeof DOODLE_COLORS;

export const DOODLE_COLOR_NAMES = Object.keys(DOODLE_COLORS) as DoodleColor[];

export function isDoodleColor(value: unknown): value is DoodleColor {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(DOODLE_COLORS, value);
}
