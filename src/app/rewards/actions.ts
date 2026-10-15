"use server";

import type { PowerUpKind } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getActiveUser, getCurrentUser } from "@/lib/identity";
import { ECONOMY } from "@/lib/economy";
import { POWERUP_SHOP, rollDropDuration, startOfUtcDay } from "@/lib/powerups";

export interface RewardsStatus {
  canClaim: boolean;
  nextClaimAt: number; // epoch ms of the next UTC midnight
  nextKind: "TOKENS" | "CREDITS";
  nextAmount: number;
  inventory: { id: string; kind: PowerUpKind; durationSeconds: number; source: "DAILY" | "SHOP" }[];
  credits: number;
  tokens: number;
  freeCreditsUntil: number | null;
  freeTokensUntil: number | null;
}

// Alternates by how many claims the user has made (not the calendar), so a
// missed day doesn't flip which currency is next.
function kindFor(claimCount: number): "TOKENS" | "CREDITS" {
  return claimCount % 2 === 0 ? "TOKENS" : "CREDITS";
}

function amountFor(kind: "TOKENS" | "CREDITS"): number {
  return kind === "TOKENS" ? ECONOMY.DAILY_AWARD_TOKENS : ECONOMY.DAILY_AWARD_CREDITS;
}

export async function getRewardsStatus(): Promise<RewardsStatus> {
  const user = await getCurrentUser();
  const now = new Date();
  const dayStart = startOfUtcDay(now);
  const inventory = await prisma.powerUp.findMany({
    where: { userId: user.id, usedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, kind: true, durationSeconds: true, source: true },
  });
  const active = (d: Date | null) => (d && d.getTime() > now.getTime() ? d.getTime() : null);
  const nextKind = kindFor(user.dailyClaimCount);
  return {
    canClaim: !user.lastDailyClaimAt || user.lastDailyClaimAt < dayStart,
    nextClaimAt: dayStart.getTime() + 24 * 60 * 60 * 1000,
    nextKind,
    nextAmount: amountFor(nextKind),
    inventory,
    credits: user.credits,
    tokens: user.tokens,
    freeCreditsUntil: active(user.freeCreditsUntil),
    freeTokensUntil: active(user.freeTokensUntil),
  };
}

export type ClaimResult =
  | {
      ok: true;
      kind: "TOKENS" | "CREDITS";
      amount: number;
      bonus: { kind: PowerUpKind; durationSeconds: number } | null;
    }
  | { ok: false; error: string };

export async function claimDailyAward(): Promise<ClaimResult> {
  const user = await getActiveUser();
  const now = new Date();
  const dayStart = startOfUtcDay(now);
  const kind = kindFor(user.dailyClaimCount);
  const amount = amountFor(kind);

  const bonus =
    Math.random() < ECONOMY.DAILY_POWERUP_DROP_CHANCE
      ? {
          kind: (Math.random() < 0.5 ? "INFINITE_CREDITS" : "INFINITE_TOKENS") as PowerUpKind,
          durationSeconds: rollDropDuration(),
        }
      : null;

  const claimed = await prisma.$transaction(async (tx) => {
    // One atomic conditional update decides who wins a double-click or two
    // tabs: only a row that hasn't claimed today (and whose claim count is
    // still the one we computed the currency from) matches.
    const res = await tx.user.updateMany({
      where: {
        id: user.id,
        dailyClaimCount: user.dailyClaimCount,
        OR: [{ lastDailyClaimAt: null }, { lastDailyClaimAt: { lt: dayStart } }],
      },
      data: {
        lastDailyClaimAt: now,
        dailyClaimCount: { increment: 1 },
        ...(kind === "TOKENS" ? { tokens: { increment: amount } } : { credits: { increment: amount } }),
      },
    });
    if (res.count !== 1) return false;

    if (kind === "TOKENS") {
      await tx.tokenTransaction.create({ data: { userId: user.id, amount, reason: "DAILY_AWARD" } });
    } else {
      await tx.creditTransaction.create({ data: { userId: user.id, amount, reason: "DAILY_AWARD" } });
    }
    if (bonus) {
      await tx.powerUp.create({
        data: { userId: user.id, kind: bonus.kind, durationSeconds: bonus.durationSeconds, source: "DAILY" },
      });
    }
    return true;
  });

  if (!claimed) return { ok: false, error: "You've already claimed today's award." };
  revalidatePath("/rewards");
  return { ok: true, kind, amount, bonus };
}

export async function activatePowerUp(
  powerUpId: string
): Promise<{ ok: true; kind: PowerUpKind; until: number } | { ok: false; error: string }> {
  const user = await getActiveUser();
  const now = Date.now();

  const result = await prisma.$transaction(async (tx) => {
    // Spend the inventory row first; count 0 means it's not yours or already used.
    const spent = await tx.powerUp.updateMany({
      where: { id: powerUpId, userId: user.id, usedAt: null },
      data: { usedAt: new Date(now) },
    });
    if (spent.count !== 1) return null;
    const p = await tx.powerUp.findUniqueOrThrow({ where: { id: powerUpId } });
    const fresh = await tx.user.findUniqueOrThrow({ where: { id: user.id } });

    // Stacking: activating while one is running extends it instead of replacing it.
    const field = p.kind === "INFINITE_CREDITS" ? "freeCreditsUntil" : "freeTokensUntil";
    const current = fresh[field]?.getTime() ?? 0;
    const until = new Date(Math.max(now, current) + p.durationSeconds * 1000);
    await tx.user.update({ where: { id: user.id }, data: { [field]: until } });
    return { kind: p.kind, until: until.getTime() };
  });

  if (!result) return { ok: false, error: "That power-up isn't available." };
  revalidatePath("/rewards");
  return { ok: true, ...result };
}

// Always charges the real balance — infinite effects never apply here, so a
// power-up can't be used to buy more power-ups for free.
export async function buyPowerUp(
  shopItemId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getActiveUser();
  const item = POWERUP_SHOP.find((i) => i.id === shopItemId);
  if (!item) return { ok: false, error: "That item doesn't exist." };

  const ok = await prisma.$transaction(async (tx) => {
    // Atomic "has enough and charge" in one statement — no read-then-write race.
    const charged =
      item.currency === "CREDITS"
        ? await tx.user.updateMany({
            where: { id: user.id, credits: { gte: item.price } },
            data: { credits: { decrement: item.price } },
          })
        : await tx.user.updateMany({
            where: { id: user.id, tokens: { gte: item.price } },
            data: { tokens: { decrement: item.price } },
          });
    if (charged.count !== 1) return false;

    if (item.currency === "CREDITS") {
      await tx.creditTransaction.create({
        data: { userId: user.id, amount: -item.price, reason: "SHOP_PURCHASE" },
      });
    } else {
      await tx.tokenTransaction.create({
        data: { userId: user.id, amount: -item.price, reason: "SHOP_PURCHASE" },
      });
    }
    await tx.powerUp.create({
      data: { userId: user.id, kind: item.kind, durationSeconds: item.durationSeconds, source: "SHOP" },
    });
    return true;
  });

  if (!ok) {
    return { ok: false, error: `Not enough ${item.currency === "CREDITS" ? "credits" : "tokens"}.` };
  }
  revalidatePath("/rewards");
  return { ok: true };
}
