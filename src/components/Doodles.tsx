"use client";

import { useEffect, useState, type ReactNode } from "react";

// Sidewalk-chalk wallpaper: outlined doodles, one flat color each, fixed
// behind the whole app. Purely decorative — aria-hidden, no pointer events,
// and it sits below all content (see .doodle-layer in globals.css).
//
// Every page load rolls a fresh set (shape, color, size, orientation, path).
// Each doodle drifts across the screen, leaves off the opposite edge, and is
// replaced by a new random one. Rolled in an effect, not during render, so the
// server HTML and first client render match (the layer fades in after mount).
// Future: user-submitted drawings can join the pool by adding entries to
// SHAPES (or a second source) — nothing below assumes a fixed set.

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
  id: number;
  shape: string;
  color: ColorName;
  size: number; // px
  x0: number; // px, start/end of the drift (top-left of the doodle)
  y0: number;
  x1: number;
  y1: number;
  r0: number; // deg
  r1: number;
  duration: number; // s
  delay: number; // s (negative = already mid-flight on first paint)
  bob: number; // s, gentle wobble period
}

const SHAPE_NAMES = Object.keys(SHAPES);
const COLOR_NAMES = Object.keys(COLORS) as ColorName[];
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

let nextId = 0;

// A new doodle on a straight, slow path from one edge to the opposite one.
// `midFlight` puts it somewhere along that path already (first paint).
function spawn(midFlight: boolean): Doodle {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const small = W < 640;
  const size = Math.round(rand(small ? 44 : 56, small ? 80 : 108));
  const pad = size * 1.5; // far enough off-screen to hide it even when rotated
  const edge = Math.floor(Math.random() * 4);
  const along = (len: number) => rand(-0.05 * len, 1.05 * len);
  const wander = (from: number, len: number) => Math.min(1.1 * len, Math.max(-0.1 * len, from + rand(-0.35, 0.35) * len));

  let x0: number, y0: number, x1: number, y1: number;
  if (edge === 0) {
    x0 = -pad; x1 = W + pad; y0 = along(H); y1 = wander(y0, H);
  } else if (edge === 1) {
    x0 = W + pad; x1 = -pad; y0 = along(H); y1 = wander(y0, H);
  } else if (edge === 2) {
    y0 = -pad; y1 = H + pad; x0 = along(W); x1 = wander(x0, W);
  } else {
    y0 = H + pad; y1 = -pad; x0 = along(W); x1 = wander(x0, W);
  }

  const speed = rand(30, 70); // px/s — a lazy float you can actually see
  const duration = Math.hypot(x1 - x0, y1 - y0) / speed;
  const r0 = rand(-180, 180);
  return {
    id: nextId++,
    shape: pick(SHAPE_NAMES),
    color: pick(COLOR_NAMES),
    size,
    x0, y0, x1, y1,
    r0,
    r1: r0 + (Math.random() < 0.5 ? -1 : 1) * rand(120, 420), // a slow tumble
    duration,
    delay: midFlight ? -rand(0.03, 0.97) * duration : 0,
    bob: rand(3, 7),
  };
}

export default function Doodles() {
  const [doodles, setDoodles] = useState<Doodle[]>([]);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const count = window.innerWidth < 640 ? 12 : 22;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStill(reduce);
    setDoodles(Array.from({ length: count }, () => spawn(true)));
  }, []);

  // When one finishes its trip, swap in a brand-new random one.
  function replace(id: number) {
    setDoodles((list) => list.map((d) => (d.id === id ? spawn(false) : d)));
  }

  return (
    <div className="doodle-layer" aria-hidden="true">
      {/* Roughens every outline a little, like chalk on pavement. */}
      <svg width="0" height="0" className="absolute">
        <filter id="chalk" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" />
        </filter>
      </svg>
      {doodles.map((d) => {
        // Reduced motion: freeze each one where it would be mid-path.
        const t = still ? 0.5 : 0;
        const vars = {
          "--x0": `${d.x0 + (d.x1 - d.x0) * t}px`,
          "--y0": `${d.y0 + (d.y1 - d.y0) * t}px`,
          "--x1": `${d.x1}px`,
          "--y1": `${d.y1}px`,
          "--r0": `${d.r0}deg`,
          "--r1": `${d.r1}deg`,
          "--dur": `${d.duration}s`,
          "--delay": `${d.delay}s`,
          "--bob": `${d.bob}s`,
        } as React.CSSProperties;
        return (
          <div
            key={d.id}
            className={`doodle ${still ? "doodle-still" : ""}`}
            style={{ ...vars, width: d.size, height: d.size }}
            onAnimationEnd={(e) => e.target === e.currentTarget && replace(d.id)}
          >
            <svg
              viewBox="0 0 64 64"
              width={d.size}
              height={d.size}
              className={`doodle-art ${d.color === "white" ? "doodle-white" : ""}`}
              style={{ color: COLORS[d.color] }}
              fill="none"
              stroke="currentColor"
              strokeWidth="3.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {SHAPES[d.shape]}
            </svg>
          </div>
        );
      })}
    </div>
  );
}
