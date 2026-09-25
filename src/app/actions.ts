"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/identity";
import { isAdmin } from "@/lib/admin";
import { ECONOMY, InsufficientCreditsError } from "@/lib/economy";
import { validateAnswer, validateConfig, ValidationError } from "@/lib/templates/validate";
import type { AnyChallengeConfig, FeedItem, TemplateType } from "@/lib/templates/types";
import { Prisma } from "@prisma/client";

// ---- Feed ----

// Raw-SQL because "item still needs more responses" compares two columns
// across tables (ChallengeItem.responseCount vs Challenge.targetResponsesPerItem),
// which Prisma's declarative filters can't express directly.
export async function getNextFeedItem(): Promise<FeedItem | null> {
  const user = await getCurrentUser();

  const rows = await prisma.$queryRaw<{ itemId: string }[]>`
    SELECT ci."id" as "itemId"
    FROM "ChallengeItem" ci
    JOIN "Challenge" c ON c."id" = ci."challengeId"
    WHERE c."status" = 'ACTIVE'
      AND c."creatorId" != ${user.id}
      AND ci."responseCount" < c."targetResponsesPerItem"
      AND NOT EXISTS (
        SELECT 1 FROM "Submission" s WHERE s."itemId" = ci."id" AND s."submitterId" = ${user.id}
      )
    ORDER BY RANDOM()
    LIMIT 1
  `;

  const itemId = rows[0]?.itemId;
  if (!itemId) return null;

  const item = await prisma.challengeItem.findUnique({
    where: { id: itemId },
    include: { challenge: true },
  });
  if (!item) return null;

  return {
    itemId: item.id,
    challengeId: item.challengeId,
    templateType: item.challenge.templateType as TemplateType,
    prompt: item.challenge.prompt,
    config: JSON.parse(item.challenge.config) as AnyChallengeConfig,
    mediaUrl: item.mediaUrl,
    textContent: item.textContent,
    timeLimitSeconds: item.challenge.timeLimitSeconds,
  };
}

// Same as getNextFeedItem, but scoped to one challenge — used when a doer
// jumps in directly from the browse grid instead of the random feed.
export async function getFeedItemForChallenge(challengeId: string): Promise<FeedItem | null> {
  const user = await getCurrentUser();

  const rows = await prisma.$queryRaw<{ itemId: string }[]>`
    SELECT ci."id" as "itemId"
    FROM "ChallengeItem" ci
    JOIN "Challenge" c ON c."id" = ci."challengeId"
    WHERE c."id" = ${challengeId}
      AND c."status" = 'ACTIVE'
      AND c."creatorId" != ${user.id}
      AND ci."responseCount" < c."targetResponsesPerItem"
      AND NOT EXISTS (
        SELECT 1 FROM "Submission" s WHERE s."itemId" = ci."id" AND s."submitterId" = ${user.id}
      )
    ORDER BY RANDOM()
    LIMIT 1
  `;

  const itemId = rows[0]?.itemId;
  if (!itemId) return null;

  const item = await prisma.challengeItem.findUnique({
    where: { id: itemId },
    include: { challenge: true },
  });
  if (!item) return null;

  return {
    itemId: item.id,
    challengeId: item.challengeId,
    templateType: item.challenge.templateType as TemplateType,
    prompt: item.challenge.prompt,
    config: JSON.parse(item.challenge.config) as AnyChallengeConfig,
    mediaUrl: item.mediaUrl,
    textContent: item.textContent,
    timeLimitSeconds: item.challenge.timeLimitSeconds,
  };
}

// ---- Browse ----

export interface TopChallenge {
  id: string;
  prompt: string;
  templateType: TemplateType;
  category: "FUN" | "PRETRAINING";
  thumbnailUrl: string | null;
  thumbnailText: string | null;
  responseCount: number;
  totalTarget: number;
  itemCount: number;
  isMine: boolean;
}

// "Top" = most-answered-so-far first — a simple, legible popularity proxy
// given v1 deliberately skips voting/consensus (per spec).
export async function getTopChallenges(): Promise<TopChallenge[]> {
  const user = await getCurrentUser();

  // Same eligibility rule as the random feed (an item this viewer hasn't
  // already answered, that hasn't hit its own response cap yet) — a
  // challenge with nothing left for this viewer to do shouldn't be listed,
  // same as it wouldn't be dealt to them in the feed.
  const availableRows = await prisma.$queryRaw<{ challengeId: string }[]>`
    SELECT DISTINCT ci."challengeId" as "challengeId"
    FROM "ChallengeItem" ci
    JOIN "Challenge" c ON c."id" = ci."challengeId"
    WHERE c."status" = 'ACTIVE'
      AND ci."responseCount" < c."targetResponsesPerItem"
      AND NOT EXISTS (
        SELECT 1 FROM "Submission" s WHERE s."itemId" = ci."id" AND s."submitterId" = ${user.id}
      )
  `;
  const availableChallengeIds = new Set(availableRows.map((r) => r.challengeId));

  const challenges = await prisma.challenge.findMany({
    where: { status: "ACTIVE" },
    include: {
      items: { orderBy: { order: "asc" }, take: 1 },
      _count: { select: { submissions: { where: { status: { not: "REMOVED" } } }, items: true } },
    },
    orderBy: [{ submissions: { _count: "desc" } }, { createdAt: "desc" }],
    take: 60,
  });

  return challenges
    .filter((c) => c.creatorId === user.id || availableChallengeIds.has(c.id))
    .map((c) => ({
      id: c.id,
      prompt: c.prompt,
      templateType: c.templateType as TemplateType,
      category: c.category as "FUN" | "PRETRAINING",
      thumbnailUrl: c.items[0]?.mediaUrl ?? null,
      thumbnailText: c.items[0]?.mediaUrl ? null : (c.items[0]?.textContent ?? null),
      responseCount: c._count.submissions,
      totalTarget: c._count.items * c.targetResponsesPerItem,
      itemCount: c._count.items,
      isMine: c.creatorId === user.id,
    }));
}

// ---- Submission ----

export async function submitAnswer(input: {
  itemId: string;
  challengeId: string;
  answer: unknown;
  timeTakenMs: number;
}): Promise<
  | { ok: true; creditsEarned: number; itemResponseCount: number; targetResponsesPerItem: number }
  | { ok: false; error: string }
> {
  const user = await getCurrentUser();

  const item = await prisma.challengeItem.findUnique({
    where: { id: input.itemId },
    include: { challenge: true },
  });
  if (!item || item.challengeId !== input.challengeId) {
    return { ok: false, error: "That challenge item no longer exists." };
  }
  if (item.challenge.status !== "ACTIVE") {
    return { ok: false, error: "That challenge is no longer active." };
  }

  let validated;
  try {
    const config = JSON.parse(item.challenge.config) as AnyChallengeConfig;
    validated = validateAnswer(item.challenge.templateType as TemplateType, config, input.answer);
  } catch (err) {
    if (err instanceof ValidationError) return { ok: false, error: err.message };
    throw err;
  }

  let itemResponseCount: number;
  try {
    itemResponseCount = await prisma.$transaction(async (tx) => {
      await tx.submission.create({
        data: {
          challengeId: item.challengeId,
          itemId: item.id,
          submitterId: user.id,
          answer: JSON.stringify(validated),
          timeTakenMs: input.timeTakenMs,
        },
      });

      const updatedItem = await tx.challengeItem.update({
        where: { id: item.id },
        data: { responseCount: { increment: 1 } },
      });

      if (updatedItem.responseCount >= item.challenge.targetResponsesPerItem) {
        const remainingOpenItems = await tx.challengeItem.count({
          where: {
            challengeId: item.challengeId,
            id: { not: item.id },
            responseCount: { lt: item.challenge.targetResponsesPerItem },
          },
        });
        if (remainingOpenItems === 0) {
          await tx.challenge.update({
            where: { id: item.challengeId },
            data: { status: "COMPLETED" },
          });
        }
      }

      await tx.user.update({
        where: { id: user.id },
        data: { credits: { increment: ECONOMY.CREDITS_PER_SUBMISSION } },
      });
      await tx.creditTransaction.create({
        data: {
          userId: user.id,
          amount: ECONOMY.CREDITS_PER_SUBMISSION,
          reason: "EARN_SUBMISSION",
          relatedChallengeId: item.challengeId,
        },
      });

      return updatedItem.responseCount;
    });
  } catch (err) {
    // The @@unique([itemId, submitterId]) constraint — the doer already
    // answered this exact item (double submit / race). Anything else is a
    // real failure (e.g. a DB connectivity problem) and shouldn't be
    // reported to the user as if it were this.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "You've already answered this one." };
    }
    console.error("submitAnswer failed:", err);
    return { ok: false, error: "Something went wrong submitting that — try again." };
  }

  revalidatePath("/create");
  return {
    ok: true,
    creditsEarned: ECONOMY.CREDITS_PER_SUBMISSION,
    itemResponseCount,
    targetResponsesPerItem: item.challenge.targetResponsesPerItem,
  };
}

// ---- Challenge creation ----

export interface CreateChallengeInput {
  templateType: TemplateType;
  prompt: string;
  category: "FUN" | "PRETRAINING";
  config: unknown;
  timeLimitSeconds: number;
  targetResponsesPerItem: number;
  items: { mediaUrl?: string; textContent?: string }[];
}

export async function createChallenge(
  input: CreateChallengeInput
): Promise<
  { ok: true; challengeId: string } | { ok: false; error: string; needsAccount?: true }
> {
  const user = await getCurrentUser();

  // Doing challenges never requires an account — posting one does, so
  // there's a real identity behind exported/creator-facing data.
  if (!user.email || !user.username) {
    return { ok: false, needsAccount: true, error: "Create an account to post a challenge." };
  }

  if (!input.prompt.trim()) return { ok: false, error: "Give the challenge a prompt." };
  if (input.items.length === 0) return { ok: false, error: "Add at least one item." };
  if (
    input.targetResponsesPerItem < ECONOMY.MIN_TARGET_RESPONSES_PER_ITEM ||
    input.targetResponsesPerItem > ECONOMY.MAX_TARGET_RESPONSES_PER_ITEM
  ) {
    return {
      ok: false,
      error: `Responses per item must be between ${ECONOMY.MIN_TARGET_RESPONSES_PER_ITEM} and ${ECONOMY.MAX_TARGET_RESPONSES_PER_ITEM}.`,
    };
  }

  let config;
  try {
    config = validateConfig(input.templateType, input.config);
  } catch (err) {
    if (err instanceof ValidationError) return { ok: false, error: err.message };
    throw err;
  }

  const totalCost = ECONOMY.CHALLENGE_POST_COST;

  try {
    const challenge = await prisma.$transaction(async (tx) => {
      const fresh = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      if (fresh.credits < totalCost) {
        throw new InsufficientCreditsError(totalCost, fresh.credits);
      }

      await tx.user.update({ where: { id: user.id }, data: { credits: { decrement: totalCost } } });

      const created = await tx.challenge.create({
        data: {
          creatorId: user.id,
          templateType: input.templateType,
          category: input.category,
          prompt: input.prompt.trim(),
          config: JSON.stringify(config),
          timeLimitSeconds: input.timeLimitSeconds,
          targetResponsesPerItem: input.targetResponsesPerItem,
          items: {
            create: input.items.map((item, order) => ({
              order,
              mediaUrl: item.mediaUrl ?? null,
              textContent: item.textContent ?? null,
            })),
          },
        },
      });

      await tx.creditTransaction.create({
        data: {
          userId: user.id,
          amount: -totalCost,
          reason: "SPEND_CHALLENGE_POST",
          relatedChallengeId: created.id,
        },
      });

      return created;
    });

    revalidatePath("/create");
    return { ok: true, challengeId: challenge.id };
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return {
        ok: false,
        error: `Not enough credits: this challenge costs ${err.needed}, you have ${err.have}.`,
      };
    }
    throw err;
  }
}

// ---- Misc ----

export async function getMyCredits(): Promise<number> {
  const user = await getCurrentUser();
  return user.credits;
}

export async function getMyChallenges() {
  const user = await getCurrentUser();
  return prisma.challenge.findMany({
    where: { creatorId: user.id },
    include: {
      items: true,
      _count: { select: { submissions: { where: { status: { not: "REMOVED" } } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getChallengeResults(challengeId: string) {
  const user = await getCurrentUser();
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: {
      items: {
        include: { submissions: { where: { status: { not: "REMOVED" } } } },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!challenge) return null;
  if (challenge.creatorId !== user.id && !(await isAdmin())) return null;
  return challenge;
}

export async function flagContent(input: {
  targetType: "CHALLENGE" | "SUBMISSION";
  targetId: string;
  reason: string;
}) {
  const user = await getCurrentUser();
  const data: Prisma.FlagCreateInput = {
    targetType: input.targetType,
    reason: input.reason.trim() || "unspecified",
    reporter: { connect: { id: user.id } },
  };
  if (input.targetType === "CHALLENGE") {
    data.challenge = { connect: { id: input.targetId } };
  } else {
    data.submission = { connect: { id: input.targetId } };
  }
  await prisma.flag.create({ data });
  return { ok: true };
}
