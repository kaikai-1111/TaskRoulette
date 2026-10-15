// Power-ups: while active, spending one currency is free. Shared by the
// server actions and the rewards UI.
//
// Deliberate limits (they exist to stop the currencies being minted):
//  - An "infinite tokens" window makes a paid model free for the BUYER, but
//    the poster isn't paid for that sale — otherwise two accounts could mint
//    unlimited tokens by trading models.
//  - Infinite effects never apply to shop purchases, so power-ups can't be
//    used to buy more power-ups for free and chain themselves forever.
import type { PowerUpKind } from "@prisma/client";

export const POWERUP_LABELS: Record<PowerUpKind, { name: string; blurb: string }> = {
  INFINITE_CREDITS: {
    name: "Infinite credits",
    blurb: "Posting challenges costs nothing while it's active.",
  },
  INFINITE_TOKENS: {
    name: "Infinite tokens",
    blurb: "Paid models are free for you while it's active.",
  },
};

// Rolled for the bonus drop on a daily claim: shorter windows are likelier.
export const DROP_DURATIONS: { seconds: number; weight: number }[] = [
  { seconds: 60, weight: 50 },
  { seconds: 120, weight: 25 },
  { seconds: 300, weight: 17 },
  { seconds: 600, weight: 8 },
];

export interface ShopItem {
  id: string;
  kind: PowerUpKind;
  durationSeconds: number;
  currency: "CREDITS" | "TOKENS";
  price: number;
}

// Each power-up is bought with the *other* currency than the one it frees.
export const POWERUP_SHOP: ShopItem[] = [
  { id: "inf-tokens-60", kind: "INFINITE_TOKENS", durationSeconds: 60, currency: "CREDITS", price: 40 },
  { id: "inf-tokens-300", kind: "INFINITE_TOKENS", durationSeconds: 300, currency: "CREDITS", price: 150 },
  { id: "inf-credits-60", kind: "INFINITE_CREDITS", durationSeconds: 60, currency: "TOKENS", price: 10 },
  { id: "inf-credits-300", kind: "INFINITE_CREDITS", durationSeconds: 300, currency: "TOKENS", price: 30 },
];

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}m ${s}s` : `${m} min`;
}

export function rollDropDuration(random: number = Math.random()): number {
  const total = DROP_DURATIONS.reduce((n, d) => n + d.weight, 0);
  let roll = random * total;
  for (const d of DROP_DURATIONS) {
    roll -= d.weight;
    if (roll < 0) return d.seconds;
  }
  return DROP_DURATIONS[0].seconds;
}

// Start of the current UTC day — the daily claim resets here.
export function startOfUtcDay(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
