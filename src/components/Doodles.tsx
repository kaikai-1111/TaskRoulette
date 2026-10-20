"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  isGone,
  overlaps,
  spawnEntering,
  spawnOnScreen,
  step,
  type Body,
} from "@/lib/doodle-physics";
import { DOODLE_COLORS, type DoodleColor } from "@/lib/doodle-colors";
import { DRAWING_ADDED_EVENT, strokesToPath } from "@/lib/drawing";
import { getBackgroundDrawings, type BackgroundDrawingData } from "@/app/draw/actions";

// Sidewalk-chalk wallpaper: outlined doodles, one flat color each, fixed
// behind the whole app. Purely decorative — aria-hidden, no pointer events,
// and it sits below all content (see .doodle-layer in globals.css).
//
// Every page load rolls a fresh set (shape, color, size, orientation, path).
// Doodles float and spin, bounce off each other (lib/doodle-physics.ts), drift
// off the screen, and are replaced by a new random one entering from an edge.
// Rolled in an effect, not during render, so the server HTML and first client
// render match (the layer fades in after mount). Positions are written straight
// to the DOM each frame — React only re-renders when a doodle is swapped.
// Future: user-submitted drawings can join the pool by adding entries to
// SHAPES (or a second source) — nothing below assumes a fixed set.

const COLORS = DOODLE_COLORS;
type ColorName = DoodleColor;

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
  shape: string; // key of SHAPES, unless `drawing` is set
  drawing?: BackgroundDrawingData; // a visitor's drawing from today
  color: ColorName;
  size: number; // px
  bob: number; // s, gentle wobble period
  fresh?: boolean; // a drawing just saved on this page: fade in instead of popping
}

const SHAPE_NAMES = Object.keys(SHAPES);
const COLOR_NAMES = Object.keys(COLORS) as ColorName[];
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

let nextId = 0;

// Mixes in today's visitor drawings: the more there are, the likelier one is
// picked (20% with one, up to 60%), and the same drawing is never on screen
// twice at once. `force` skips the dice (used to guarantee a few on first paint).
function newLook(pool: BackgroundDrawingData[], inUse: Set<string>, force = false): Doodle {
  const small = window.innerWidth < 640;
  const free = pool.filter((d) => !inUse.has(d.id));
  if (free.length > 0 && (force || Math.random() < Math.min(0.6, 0.1 + pool.length * 0.1))) {
    const drawing = pick(free);
    return {
      id: nextId++,
      shape: "",
      drawing,
      color: drawing.color,
      size: Math.round(rand(small ? 60 : 80, small ? 90 : 120)),
      bob: rand(3, 7),
    };
  }
  return {
    id: nextId++,
    shape: pick(SHAPE_NAMES),
    color: pick(COLOR_NAMES),
    size: Math.round(rand(small ? 44 : 56, small ? 80 : 108)),
    bob: rand(3, 7),
  };
}

// Roughly one doodle per 26,000 px² of screen: busy, but not a wall of them.
function doodleCount(): number {
  const n = Math.round((window.innerWidth * window.innerHeight) / 26000);
  return Math.max(14, Math.min(48, n));
}

export default function Doodles() {
  const [doodles, setDoodles] = useState<Doodle[]>([]);
  const [still, setStill] = useState(false);
  // Physics state and DOM nodes live outside React state: they change every frame.
  const bodies = useRef(new Map<number, Body>());
  const nodes = useRef(new Map<number, HTMLDivElement>());

  function place(id: number) {
    const b = bodies.current.get(id);
    const el = nodes.current.get(id);
    if (b && el) {
      el.style.transform = `translate(${(b.x - b.size / 2).toFixed(1)}px, ${(b.y - b.size / 2).toFixed(1)}px) rotate(${b.r.toFixed(1)}deg)`;
    }
  }

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    let onAdded: ((d: BackgroundDrawingData) => void) | null = null;
    const handleAdded = (e: Event) => onAdded?.((e as CustomEvent<BackgroundDrawingData>).detail);
    window.addEventListener(DRAWING_ADDED_EVENT, handleAdded);
    let refresh: ReturnType<typeof setInterval> | undefined;
    const live = bodies.current;
    live.clear();

    function start(pool: BackgroundDrawingData[]) {
      if (cancelled) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const W = window.innerWidth;
      const H = window.innerHeight;
      const looks = new Map<number, Doodle>();
      const inUse = () => new Set([...looks.values()].flatMap((d) => (d.drawing ? [d.drawing.id] : [])));

      // Initial set: spread over the screen, not overlapping where we can help it.
      for (let i = 0; i < doodleCount(); i++) {
        // Today's drawings are the point, so the first few slots are always theirs.
        const look = newLook(pool, inUse(), i < Math.min(pool.length, 4));
        let body = spawnOnScreen(W, H, look.size, Math.random);
        for (let t = 0; t < 25; t++) {
          if (![...live.values()].some((o) => overlaps(body, o))) break;
          body = spawnOnScreen(W, H, look.size, Math.random);
        }
        live.set(look.id, body);
        looks.set(look.id, look);
      }
      setStill(reduce);
      setDoodles([...looks.values()]);
      if (reduce) return; // frozen where they landed

      // A drawing saved while this page is open pops in right away, in place
      // of one of the built-in doodles, instead of waiting for the next load.
      onAdded = (drawing) => {
        if (!pool.some((d) => d.id === drawing.id)) pool.push(drawing);
        const victim = [...looks.values()].find((d) => !d.drawing);
        const look: Doodle = {
          id: nextId++,
          shape: "",
          drawing,
          color: drawing.color,
          size: Math.round(rand(window.innerWidth < 640 ? 70 : 90, window.innerWidth < 640 ? 95 : 120)),
          bob: rand(3, 7),
          fresh: true,
        };
        const w = window.innerWidth;
        const h = window.innerHeight;
        let body = spawnOnScreen(w, h, look.size, Math.random);
        for (let t = 0; t < 25; t++) {
          if (![...live.values()].some((o) => overlaps(body, o))) break;
          body = spawnOnScreen(w, h, look.size, Math.random);
        }
        live.set(look.id, body);
        looks.set(look.id, look);
        if (victim) {
          live.delete(victim.id);
          looks.delete(victim.id);
          setDoodles((list) => [...list.filter((d) => d.id !== victim.id), look]);
        } else {
          setDoodles((list) => [...list, look]);
        }
      };

      let last = performance.now();
      function frame(now: number) {
        const dt = Math.min((now - last) / 1000, 0.05); // a backgrounded tab shouldn't teleport them
        last = now;
        const w = window.innerWidth;
        const h = window.innerHeight;
        step([...live.values()], dt, w, h, Math.random);

        const swaps = new Map<number, Doodle>();
        for (const [id, b] of live) {
          if (isGone(b, w, h)) {
            looks.delete(id);
            const look = newLook(pool, inUse());
            looks.set(look.id, look);
            live.set(look.id, spawnEntering(w, h, look.size, Math.random));
            live.delete(id);
            swaps.set(id, look);
          } else {
            place(id);
          }
        }
        if (swaps.size) setDoodles((list) => list.map((d) => swaps.get(d.id) ?? d));
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
    }

    // Today's visitor drawings join the pool; if that fails, built-ins are fine.
    // The pool is refreshed every couple of minutes so other people's new
    // drawings (and removals) show up without a reload.
    getBackgroundDrawings()
      .catch(() => [] as BackgroundDrawingData[])
      .then((pool) => {
        start(pool);
        refresh = setInterval(() => {
          getBackgroundDrawings()
            .then((latest) => pool.splice(0, pool.length, ...latest))
            .catch(() => {});
        }, 120_000);
      });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearInterval(refresh);
      window.removeEventListener(DRAWING_ADDED_EVENT, handleAdded);
    };
  }, []);

  return (
    <div className="doodle-layer" aria-hidden="true">
      {/* Roughens every outline a little, like chalk on pavement. */}
      <svg width="0" height="0" className="absolute">
        <filter id="chalk" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" />
        </filter>
      </svg>
      {doodles.map((d) => (
        <div
          key={d.id}
          ref={(el) => {
            // Put it in place the moment it mounts, before the next frame.
            if (el) {
              nodes.current.set(d.id, el);
              place(d.id);
            } else {
              nodes.current.delete(d.id);
            }
          }}
          className={`doodle ${still ? "doodle-still" : ""} ${d.fresh ? "doodle-new" : ""}`}
          style={{ "--bob": `${d.bob}s`, width: d.size, height: d.size } as React.CSSProperties}
        >
          <svg
            viewBox={d.drawing ? "-3 -3 106 106" : "0 0 64 64"}
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
            {d.drawing ? <path d={strokesToPath(d.drawing.strokes)} /> : SHAPES[d.shape]}
          </svg>
        </div>
      ))}
    </div>
  );
}
