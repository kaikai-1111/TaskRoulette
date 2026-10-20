import type { ReactNode } from "react";

// Sidewalk-chalk wallpaper: outlined doodles, one flat color each, fixed
// behind the whole app. Purely decorative — aria-hidden, no pointer events,
// and it sits below all content (see .doodle-layer in globals.css).

const COLORS = {
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
type ColorName = keyof typeof COLORS;

function starPath(points: number, outer: number, inner: number): string {
  const cx = 32;
  const cy = 33;
  const parts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    parts.push(`${i === 0 ? "M" : "L"}${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return parts.join(" ") + " Z";
}

function spiralPath(): string {
  const parts: string[] = [];
  for (let t = 0; t <= 4.2 * Math.PI; t += 0.25) {
    const r = 2 + t * 2.3;
    parts.push(`${t === 0 ? "M" : "L"}${(32 + r * Math.cos(t)).toFixed(1)} ${(32 + r * Math.sin(t)).toFixed(1)}`);
  }
  return parts.join(" ");
}

const SUN_RAYS = Array.from({ length: 8 }, (_, i) => {
  const a = (Math.PI * i) / 4;
  const p = (r: number) => `${(32 + r * Math.cos(a)).toFixed(1)} ${(32 + r * Math.sin(a)).toFixed(1)}`;
  return `M${p(16)} L${p(26)}`;
}).join(" ");

// Every shape is drawn in a 64x64 box, outline only.
const SHAPES: Record<string, ReactNode> = {
  flower: (
    <>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="32" cy="17" rx="7" ry="11" transform={`rotate(${a} 32 32)`} />
      ))}
      <circle cx="32" cy="32" r="5" />
    </>
  ),
  daisy: (
    <>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <ellipse key={a} cx="32" cy="15" rx="4.5" ry="9" transform={`rotate(${a} 32 32)`} />
      ))}
      <circle cx="32" cy="32" r="6" />
    </>
  ),
  pencil: (
    <>
      <path d="M16 40 L44 12 L52 20 L24 48 Z" />
      <path d="M16 40 L24 48 L9 55 Z" />
      <path d="M38 18 L46 26" />
    </>
  ),
  star: <path d={starPath(5, 27, 11)} />,
  sun: (
    <>
      <circle cx="32" cy="32" r="11" />
      <path d={SUN_RAYS} />
    </>
  ),
  heart: <path d="M32 54 C10 38 8 22 20 16 C26 13 31 16 32 21 C33 16 38 13 44 16 C56 22 54 38 32 54 Z" />,
  cloud: <path d="M18 46 C6 46 6 30 18 30 C18 19 33 15 39 24 C48 20 56 29 51 37 C60 39 57 46 48 46 Z" />,
  spiral: <path d={spiralPath()} />,
  butterfly: (
    <>
      <path d="M32 32 C20 10 4 14 9 30 C12 39 25 39 32 32 Z" />
      <path d="M32 32 C44 10 60 14 55 30 C52 39 39 39 32 32 Z" />
      <path d="M32 32 C21 41 17 55 26 53 C31 51 32 41 32 32 Z" />
      <path d="M32 32 C43 41 47 55 38 53 C33 51 32 41 32 32 Z" />
      <path d="M32 32 L27 18 M32 32 L37 18" />
    </>
  ),
  smiley: (
    <>
      <circle cx="32" cy="32" r="23" />
      <circle cx="24" cy="26" r="2.5" />
      <circle cx="40" cy="26" r="2.5" />
      <path d="M20 37 Q32 51 44 37" />
    </>
  ),
  plane: (
    <>
      <path d="M7 30 L57 9 L41 55 L30 37 Z" />
      <path d="M30 37 L57 9" />
    </>
  ),
  bolt: <path d="M37 6 L15 36 L29 36 L25 58 L49 25 L34 25 Z" />,
  note: (
    <>
      <circle cx="20" cy="47" r="7" />
      <circle cx="42" cy="41" r="7" />
      <path d="M27 47 V15 L49 9 V41" />
    </>
  ),
  hopscotch: <path d="M22 4 h20 v18 h-20 z M12 22 h20 v18 h-20 z M32 22 h20 v18 h-20 z M22 40 h20 v18 h-20 z" />,
  umbrella: (
    <>
      <path d="M6 32 C6 14 58 14 58 32 C52 26 46 26 41 32 C36 26 28 26 23 32 C18 26 12 26 6 32 Z" />
      <path d="M32 21 V52 C32 58 24 58 24 52" />
    </>
  ),
  crayon: (
    <>
      <path d="M14 42 L38 18 L46 26 L22 50 Z" />
      <path d="M38 18 L44 12 L52 20 L46 26" />
      <path d="M14 42 L8 56 L22 50" />
    </>
  ),
};

interface Doodle {
  shape: keyof typeof SHAPES;
  color: ColorName;
  x: number; // % from left (center of the doodle)
  y: number; // % from top
  size: number; // px
  rot: number; // deg
}

// Hand-placed so the colors and shapes are spread evenly. Mostly hugging the
// left/right edges where there's no text; a few in the middle for texture.
const DOODLES: Doodle[] = [
  { shape: "flower", color: "pink", x: 5, y: 14, size: 96, rot: -12 },
  { shape: "pencil", color: "yellow", x: 94, y: 10, size: 100, rot: 8 },
  { shape: "star", color: "orange", x: 14, y: 36, size: 64, rot: 14 },
  { shape: "cloud", color: "white", x: 88, y: 30, size: 104, rot: 0 },
  { shape: "heart", color: "red", x: 4, y: 58, size: 76, rot: -16 },
  { shape: "sun", color: "yellow", x: 95, y: 52, size: 90, rot: 10 },
  { shape: "butterfly", color: "violet", x: 11, y: 80, size: 92, rot: -8 },
  { shape: "spiral", color: "green", x: 92, y: 74, size: 78, rot: 20 },
  { shape: "smiley", color: "blue", x: 50, y: 93, size: 70, rot: -6 },
  { shape: "plane", color: "indigo", x: 80, y: 90, size: 84, rot: -14 },
  { shape: "bolt", color: "orange", x: 22, y: 94, size: 62, rot: 10 },
  { shape: "daisy", color: "white", x: 19, y: 50, size: 80, rot: 18 },
  { shape: "note", color: "green", x: 70, y: 5, size: 66, rot: -10 },
  { shape: "hopscotch", color: "brown", x: 3, y: 38, size: 80, rot: -6 },
  { shape: "umbrella", color: "gray", x: 97, y: 92, size: 86, rot: 14 },
  { shape: "crayon", color: "pink", x: 40, y: 98, size: 70, rot: 24 },
  { shape: "flower", color: "orange", x: 84, y: 62, size: 56, rot: 30 },
  { shape: "star", color: "violet", x: 8, y: 98, size: 52, rot: -20 },
  { shape: "heart", color: "gray", x: 60, y: 2, size: 48, rot: 12 },
  { shape: "pencil", color: "green", x: 18, y: 66, size: 70, rot: -30 },
  { shape: "spiral", color: "red", x: 52, y: 4, size: 52, rot: -8 },
  { shape: "cloud", color: "blue", x: 76, y: 44, size: 72, rot: 6 },
  { shape: "smiley", color: "brown", x: 17, y: 22, size: 50, rot: 12 },
  { shape: "sun", color: "pink", x: 66, y: 98, size: 58, rot: 0 },
];

export default function Doodles() {
  return (
    <div className="doodle-layer" aria-hidden="true">
      {/* Roughens every outline a little, like chalk on pavement. */}
      <svg width="0" height="0" className="absolute">
        <filter id="chalk" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" />
        </filter>
      </svg>
      {DOODLES.map((d, i) => (
        <svg
          key={i}
          viewBox="0 0 64 64"
          width={d.size}
          height={d.size}
          className={`doodle ${d.color === "white" ? "doodle-white" : ""}`}
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            color: COLORS[d.color],
            transform: `translate(-50%, -50%) rotate(${d.rot}deg)`,
          }}
          fill="none"
          stroke="currentColor"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <g vectorEffect="non-scaling-stroke">{SHAPES[d.shape]}</g>
        </svg>
      ))}
    </div>
  );
}
