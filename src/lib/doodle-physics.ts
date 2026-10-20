// Tiny 2D physics for the background doodles: each one is a circle that
// drifts, spins, and bounces off the others. No walls — doodles leave the
// screen and get replaced (see components/Doodles.tsx). Pure functions with an
// injectable RNG so the behavior can be tested without a browser.

export interface Body {
  x: number; // center, px
  y: number;
  vx: number; // px/s
  vy: number;
  r: number; // rotation, deg
  vr: number; // deg/s
  size: number; // drawn box, px
  radius: number; // collision radius, px
  mass: number;
}

export type Rng = () => number;

export const MIN_SPEED = 20;
export const MAX_SPEED = 130;
const RESTITUTION = 0.95;

const between = (rng: Rng, min: number, max: number) => min + rng() * (max - min);

export function makeBody(size: number, x: number, y: number, vx: number, vy: number, rng: Rng): Body {
  return {
    x,
    y,
    vx,
    vy,
    r: between(rng, -180, 180),
    vr: (rng() < 0.5 ? -1 : 1) * between(rng, 15, 60),
    size,
    radius: size * 0.4, // shapes fill ~80% of their box
    mass: size * size,
  };
}

// Starts just off one edge, aimed at a random point on screen.
export function spawnEntering(W: number, H: number, size: number, rng: Rng): Body {
  const edge = Math.floor(rng() * 4);
  const off = size;
  const x = edge === 0 ? -off : edge === 1 ? W + off : rng() * W;
  const y = edge === 2 ? -off : edge === 3 ? H + off : rng() * H;
  const tx = between(rng, 0.15 * W, 0.85 * W);
  const ty = between(rng, 0.15 * H, 0.85 * H);
  const d = Math.hypot(tx - x, ty - y) || 1;
  const speed = between(rng, 30, 70);
  return makeBody(size, x, y, ((tx - x) / d) * speed, ((ty - y) / d) * speed, rng);
}

// Somewhere on screen, heading in a random direction.
export function spawnOnScreen(W: number, H: number, size: number, rng: Rng): Body {
  const a = rng() * Math.PI * 2;
  const speed = between(rng, 30, 70);
  return makeBody(size, rng() * W, rng() * H, Math.cos(a) * speed, Math.sin(a) * speed, rng);
}

// Past the edge and still heading away — time to swap in a new doodle.
export function isGone(b: Body, W: number, H: number): boolean {
  const m = b.size * 1.5;
  return (
    (b.x < -m && b.vx <= 0) || (b.x > W + m && b.vx >= 0) || (b.y < -m && b.vy <= 0) || (b.y > H + m && b.vy >= 0)
  );
}

function onOrNearScreen(b: Body, W: number, H: number): boolean {
  const m = b.size;
  return b.x > -m && b.x < W + m && b.y > -m && b.y < H + m;
}

export function overlaps(a: Body, b: Body): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) < a.radius + b.radius;
}

// Advances everything by dt seconds. Returns how many collisions happened.
export function step(bodies: Body[], dt: number, W: number, H: number, rng: Rng): number {
  for (const b of bodies) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.r += b.vr * dt;
  }

  let bounces = 0;
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i];
    if (!onOrNearScreen(a, W, H)) continue; // let off-screen ones pass through
    for (let j = i + 1; j < bodies.length; j++) {
      const b = bodies[j];
      if (!onOrNearScreen(b, W, H)) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const minDist = a.radius + b.radius;
      if (dist >= minDist) continue;

      // Exactly on top of each other: pick any direction to separate along.
      const nx = dist > 1e-6 ? dx / dist : 1;
      const ny = dist > 1e-6 ? dy / dist : 0;

      // Push them apart in proportion to how light each one is.
      const overlap = minDist - dist;
      const total = a.mass + b.mass;
      a.x -= nx * overlap * (b.mass / total);
      a.y -= ny * overlap * (b.mass / total);
      b.x += nx * overlap * (a.mass / total);
      b.y += ny * overlap * (a.mass / total);

      // Bounce only if they're actually closing in on each other.
      const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (vn >= 0) continue;
      const impulse = (-(1 + RESTITUTION) * vn) / (1 / a.mass + 1 / b.mass);
      a.vx -= (impulse * nx) / a.mass;
      a.vy -= (impulse * ny) / a.mass;
      b.vx += (impulse * nx) / b.mass;
      b.vy += (impulse * ny) / b.mass;

      // A knock sets them spinning a bit differently.
      a.vr += between(rng, -50, 50);
      b.vr += between(rng, -50, 50);
      a.vr = Math.max(-120, Math.min(120, a.vr));
      b.vr = Math.max(-120, Math.min(120, b.vr));
      bounces++;
    }
  }

  // Keep everything floating: never stalled, never frantic.
  for (const b of bodies) {
    const s = Math.hypot(b.vx, b.vy);
    if (s > MAX_SPEED) {
      b.vx *= MAX_SPEED / s;
      b.vy *= MAX_SPEED / s;
    } else if (s < MIN_SPEED) {
      const k = s > 1e-6 ? MIN_SPEED / s : 0;
      if (k) {
        b.vx *= k;
        b.vy *= k;
      } else {
        b.vx = MIN_SPEED;
      }
    }
  }
  return bounces;
}
