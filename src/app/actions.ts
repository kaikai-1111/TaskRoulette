"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getActiveUser, getCurrentUser } from "@/lib/identity";
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
  if (user.isBanned) return null;

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
  if (user.isBanned) return null;

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
  purpose: "ANNOTATING" | "COLLECTING";
  creatorName: string;
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
      creator: { select: { displayName: true, username: true } },
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
      purpose: c.purpose as "ANNOTATING" | "COLLECTING",
      // Never fall back to email here — this is public-facing. Admins who
      // post without a full account (see createChallenge's admin bypass)
      // have neither, so "anonymous" is the last resort.
      creatorName: c.creator.displayName ?? c.creator.username ?? "anonymous",
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
  const user = await getActiveUser();

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
  purpose: "ANNOTATING" | "COLLECTING";
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
  const user = await getActiveUser();

  // Doing challenges never requires an account — posting one does, so
  // there's a real identity behind exported/creator-facing data. Admins
  // (authenticated via ADMIN_PASSWORD) skip this to post quickly.
  if (!user.email || !user.username) {
    if (!(await isAdmin())) {
      return { ok: false, needsAccount: true, error: "Create an account to post a challenge." };
    }
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
  if (
    input.timeLimitSeconds !== ECONOMY.NO_TIME_LIMIT &&
    (input.timeLimitSeconds < ECONOMY.MIN_TIME_LIMIT_SECONDS ||
      input.timeLimitSeconds > ECONOMY.MAX_TIME_LIMIT_SECONDS)
  ) {
    return {
      ok: false,
      error: `Time limit must be between ${ECONOMY.MIN_TIME_LIMIT_SECONDS} and ${ECONOMY.MAX_TIME_LIMIT_SECONDS} seconds, or left unlimited.`,
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
          purpose: input.purpose,
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

// ---- Remix, edit, and self-service takedown ----

export interface RemixSource {
  templateType: TemplateType;
  prompt: string;
  category: "FUN" | "PRETRAINING";
  purpose: "ANNOTATING" | "COLLECTING";
  config: unknown;
  timeLimitSeconds: number;
  targetResponsesPerItem: number;
  items: { mediaUrl: string | null; textContent: string | null }[];
}

// Deliberately NOT creator-gated — this is what powers "Remix" from the
// doer-facing feed, so anyone who has seen this challenge can read its shape
// back to build their own version. Never exposes creatorId or anything else
// about the original poster. Only live, non-removed challenges are
// remixable — same visibility a doer already has via the feed.
export async function getRemixSource(challengeId: string): Promise<RemixSource | null> {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: { items: { orderBy: { order: "asc" } } },
  });
  if (!challenge) return null;
  if (challenge.status !== "ACTIVE" && challenge.status !== "COMPLETED") return null;

  return {
    templateType: challenge.templateType as TemplateType,
    prompt: challenge.prompt,
    category: challenge.category as "FUN" | "PRETRAINING",
    purpose: challenge.purpose as "ANNOTATING" | "COLLECTING",
    config: JSON.parse(challenge.config),
    timeLimitSeconds: challenge.timeLimitSeconds,
    targetResponsesPerItem: challenge.targetResponsesPerItem,
    items: challenge.items.map((i) => ({ mediaUrl: i.mediaUrl, textContent: i.textContent })),
  };
}

export interface EditableChallenge {
  id: string;
  templateType: TemplateType;
  prompt: string;
  category: "FUN" | "PRETRAINING";
  purpose: "ANNOTATING" | "COLLECTING";
  config: unknown;
  timeLimitSeconds: number;
  targetResponsesPerItem: number;
  status: "ACTIVE" | "COMPLETED" | "FLAGGED" | "REMOVED";
  items: { mediaUrl: string | null; textContent: string | null }[];
  // Has this challenge ever received a response (even one later removed by
  // moderation)? If so, prompt/config/items/category/purpose freeze — editing
  // those would retroactively change what already-collected answers meant.
  // Time limit, target responses, and take-down/reactivate stay editable
  // regardless.
  locked: boolean;
}

export async function getMyChallengeForEdit(challengeId: string): Promise<EditableChallenge | null> {
  const user = await getCurrentUser();
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: {
      items: { orderBy: { order: "asc" } },
      _count: { select: { submissions: true } }, // any status — see `locked` doc above
    },
  });
  if (!challenge || challenge.creatorId !== user.id) return null;

  return {
    id: challenge.id,
    templateType: challenge.templateType as TemplateType,
    prompt: challenge.prompt,
    category: challenge.category as "FUN" | "PRETRAINING",
    purpose: challenge.purpose as "ANNOTATING" | "COLLECTING",
    config: JSON.parse(challenge.config),
    timeLimitSeconds: challenge.timeLimitSeconds,
    targetResponsesPerItem: challenge.targetResponsesPerItem,
    status: challenge.status,
    items: challenge.items.map((i) => ({ mediaUrl: i.mediaUrl, textContent: i.textContent })),
    locked: challenge._count.submissions > 0,
  };
}

export interface UpdateChallengeInput {
  timeLimitSeconds: number;
  targetResponsesPerItem: number;
  // Only applied when the challenge is unlocked (see EditableChallenge.locked)
  // — silently ignored otherwise rather than erroring, since the always-on
  // fields above are valid to send regardless of lock state.
  prompt?: string;
  category?: "FUN" | "PRETRAINING";
  purpose?: "ANNOTATING" | "COLLECTING";
  config?: unknown;
  items?: { mediaUrl?: string; textContent?: string }[];
}

export async function updateMyChallenge(
  challengeId: string,
  input: UpdateChallengeInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getActiveUser();
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: { _count: { select: { submissions: true } } },
  });
  if (!challenge || challenge.creatorId !== user.id) {
    return { ok: false, error: "Can't edit this challenge." };
  }

  if (
    input.targetResponsesPerItem < ECONOMY.MIN_TARGET_RESPONSES_PER_ITEM ||
    input.targetResponsesPerItem > ECONOMY.MAX_TARGET_RESPONSES_PER_ITEM
  ) {
    return {
      ok: false,
      error: `Responses per item must be between ${ECONOMY.MIN_TARGET_RESPONSES_PER_ITEM} and ${ECONOMY.MAX_TARGET_RESPONSES_PER_ITEM}.`,
    };
  }
  if (
    input.timeLimitSeconds !== ECONOMY.NO_TIME_LIMIT &&
    (input.timeLimitSeconds < ECONOMY.MIN_TIME_LIMIT_SECONDS ||
      input.timeLimitSeconds > ECONOMY.MAX_TIME_LIMIT_SECONDS)
  ) {
    return {
      ok: false,
      error: `Time limit must be between ${ECONOMY.MIN_TIME_LIMIT_SECONDS} and ${ECONOMY.MAX_TIME_LIMIT_SECONDS} seconds, or left unlimited.`,
    };
  }

  const locked = challenge._count.submissions > 0;
  const data: Prisma.ChallengeUpdateInput = {
    timeLimitSeconds: input.timeLimitSeconds,
    targetResponsesPerItem: input.targetResponsesPerItem,
  };

  if (!locked) {
    if (input.prompt !== undefined) {
      if (!input.prompt.trim()) return { ok: false, error: "Give the challenge a prompt." };
      data.prompt = input.prompt.trim();
    }
    if (input.category !== undefined) data.category = input.category;
    if (input.purpose !== undefined) data.purpose = input.purpose;
    if (input.config !== undefined) {
      let config;
      try {
        config = validateConfig(challenge.templateType as TemplateType, input.config);
      } catch (err) {
        if (err instanceof ValidationError) return { ok: false, error: err.message };
        throw err;
      }
      data.config = JSON.stringify(config);
    }
    if (input.items !== undefined) {
      if (input.items.length === 0) return { ok: false, error: "Add at least one item." };
      // Safe to fully replace — `locked` false means zero submissions
      // reference any existing item, so none would be orphaned.
      data.items = {
        deleteMany: {},
        create: input.items.map((item, order) => ({
          order,
          mediaUrl: item.mediaUrl ?? null,
          textContent: item.textContent ?? null,
        })),
      };
    }
  }

  await prisma.challenge.update({ where: { id: challengeId }, data });
  revalidatePath(`/challenges/${challengeId}`);
  revalidatePath("/mine");
  return { ok: true };
}

// Creator-scoped take-down/reactivate — same effect as the admin action in
// src/app/admin/actions.ts, but self-service and gated on ownership instead
// of ADMIN_PASSWORD.
export async function setMyChallengeStatus(
  challengeId: string,
  status: "ACTIVE" | "REMOVED"
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getActiveUser();
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge || challenge.creatorId !== user.id) {
    return { ok: false, error: "Can't change this challenge." };
  }
  await prisma.challenge.update({ where: { id: challengeId }, data: { status } });
  revalidatePath("/mine");
  revalidatePath(`/challenges/${challengeId}`);
  return { ok: true };
}

export async function flagContent(input: {
  targetType: "CHALLENGE" | "SUBMISSION";
  targetId: string;
  reason: string;
}) {
  const user = await getActiveUser();
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
