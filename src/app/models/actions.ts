"use server";

import { head } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getActiveUser, getCurrentUser } from "@/lib/identity";
import { isAdmin } from "@/lib/admin";
import { ECONOMY } from "@/lib/economy";
import { extensionOf, isAllowedModelFile } from "@/lib/models";
import { BLOB_HOST_SUFFIX, localFileSize, localPathFor, usingBlob } from "@/lib/model-storage";

// Note: fileUrl is deliberately absent — the only way to get a file is the
// download route, which checks entitlement.
export interface ModelSummary {
  id: string;
  name: string;
  description: string;
  format: string;
  fileName: string;
  fileSize: number;
  priceTokens: number;
  downloadCount: number;
  status: "ACTIVE" | "REMOVED";
  creatorName: string;
  createdAt: string;
  isMine: boolean;
  /** Can download right now: free, mine, already bought, or an admin. */
  canDownload: boolean;
}

type ModelRow = Awaited<ReturnType<typeof prisma.mlModel.findMany<{ include: { creator: true } }>>>[number];

function toSummary(m: ModelRow, userId: string, admin: boolean, boughtIds: Set<string>): ModelSummary {
  const isMine = m.creatorId === userId;
  return {
    id: m.id,
    name: m.name,
    description: m.description,
    format: m.format,
    fileName: m.fileName,
    fileSize: Number(m.fileSize),
    priceTokens: m.priceTokens,
    downloadCount: m.downloadCount,
    status: m.status,
    // Public-facing: never fall back to email.
    creatorName: m.creator.displayName ?? m.creator.username ?? "anonymous",
    createdAt: m.createdAt.toISOString(),
    isMine,
    canDownload: m.priceTokens === 0 || isMine || admin || boughtIds.has(m.id),
  };
}

async function boughtSet(userId: string, modelIds: string[]): Promise<Set<string>> {
  if (modelIds.length === 0) return new Set();
  const rows = await prisma.modelPurchase.findMany({
    where: { userId, modelId: { in: modelIds } },
    select: { modelId: true },
  });
  return new Set(rows.map((r) => r.modelId));
}

export async function listModels(): Promise<ModelSummary[]> {
  const user = await getCurrentUser();
  const admin = await isAdmin();
  const models = await prisma.mlModel.findMany({
    where: { status: "ACTIVE" },
    include: { creator: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const bought = await boughtSet(user.id, models.map((m) => m.id));
  return models.map((m) => toSummary(m, user.id, admin, bought));
}

export async function getMyModels(): Promise<ModelSummary[]> {
  const user = await getCurrentUser();
  const models = await prisma.mlModel.findMany({
    where: { creatorId: user.id },
    include: { creator: true },
    orderBy: { createdAt: "desc" },
  });
  return models.map((m) => toSummary(m, user.id, false, new Set()));
}

export async function getModel(id: string): Promise<ModelSummary | null> {
  const user = await getCurrentUser();
  const admin = await isAdmin();
  const m = await prisma.mlModel.findUnique({ where: { id }, include: { creator: true } });
  if (!m) return null;
  // Taken-down models are visible only to their poster (and admins).
  if (m.status !== "ACTIVE" && m.creatorId !== user.id && !admin) return null;
  const bought = await boughtSet(user.id, [m.id]);
  return toSummary(m, user.id, admin, bought);
}

export interface CreateModelInput {
  name: string;
  description: string;
  priceTokens: number;
  fileName: string;
  /** "local:<key>" from the dev upload route, or the Blob URL from a direct upload. */
  fileRef: string;
}

export async function createModel(
  input: CreateModelInput
): Promise<{ ok: true; id: string } | { ok: false; error: string; needsAccount?: true }> {
  const user = await getActiveUser();
  if (!(user.email && user.username) && !(await isAdmin())) {
    return { ok: false, needsAccount: true, error: "Create an account to upload a model." };
  }

  const name = input.name.trim();
  const description = input.description.trim();
  if (!name) return { ok: false, error: "Give the model a name." };
  if (name.length > ECONOMY.MAX_MODEL_NAME_CHARS) {
    return { ok: false, error: `Names are limited to ${ECONOMY.MAX_MODEL_NAME_CHARS} characters.` };
  }
  if (description.length > ECONOMY.MAX_MODEL_DESCRIPTION_CHARS) {
    return { ok: false, error: `Descriptions are limited to ${ECONOMY.MAX_MODEL_DESCRIPTION_CHARS} characters.` };
  }
  if (
    !Number.isInteger(input.priceTokens) ||
    input.priceTokens < 0 ||
    input.priceTokens > ECONOMY.MAX_MODEL_PRICE_TOKENS
  ) {
    return {
      ok: false,
      error: `Price must be a whole number of tokens from 0 to ${ECONOMY.MAX_MODEL_PRICE_TOKENS}.`,
    };
  }
  if (!isAllowedModelFile(input.fileName)) {
    return { ok: false, error: "That file type isn't allowed." };
  }

  // The client says where the file is; we verify it's really ours and
  // measure it ourselves rather than trusting any size it reports.
  let size: number | null = null;
  let fileUrl = input.fileRef;
  if (input.fileRef.startsWith("local:")) {
    const key = input.fileRef.slice("local:".length);
    if (!key.startsWith(`${user.id}_`) || !localPathFor(key)) {
      return { ok: false, error: "That upload isn't yours." };
    }
    size = await localFileSize(key);
  } else if (usingBlob()) {
    let url: URL;
    try {
      url = new URL(input.fileRef);
    } catch {
      return { ok: false, error: "Bad file reference." };
    }
    if (
      url.protocol !== "https:" ||
      !url.hostname.endsWith(BLOB_HOST_SUFFIX) ||
      !decodeURIComponent(url.pathname).startsWith(`/models/${user.id}/`)
    ) {
      return { ok: false, error: "That upload isn't yours." };
    }
    try {
      size = (await head(url.toString())).size;
      fileUrl = url.toString();
    } catch {
      size = null;
    }
  }
  if (size === null || size <= 0) return { ok: false, error: "We couldn't find the uploaded file. Try again." };
  if (size > ECONOMY.MAX_MODEL_BYTES) return { ok: false, error: "That file is too large." };

  const model = await prisma.mlModel.create({
    data: {
      creatorId: user.id,
      name,
      description,
      format: extensionOf(input.fileName),
      fileName: input.fileName.split(/[\\/]/).pop()!.slice(0, 200),
      fileUrl,
      fileSize: BigInt(size),
      priceTokens: input.priceTokens,
    },
  });
  revalidatePath("/models");
  return { ok: true, id: model.id };
}

export async function updateMyModel(
  id: string,
  input: { name: string; description: string; priceTokens: number }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getActiveUser();
  const name = input.name.trim();
  const description = input.description.trim();
  if (!name) return { ok: false, error: "Give the model a name." };
  if (name.length > ECONOMY.MAX_MODEL_NAME_CHARS) {
    return { ok: false, error: `Names are limited to ${ECONOMY.MAX_MODEL_NAME_CHARS} characters.` };
  }
  if (description.length > ECONOMY.MAX_MODEL_DESCRIPTION_CHARS) {
    return { ok: false, error: `Descriptions are limited to ${ECONOMY.MAX_MODEL_DESCRIPTION_CHARS} characters.` };
  }
  if (
    !Number.isInteger(input.priceTokens) ||
    input.priceTokens < 0 ||
    input.priceTokens > ECONOMY.MAX_MODEL_PRICE_TOKENS
  ) {
    return {
      ok: false,
      error: `Price must be a whole number of tokens from 0 to ${ECONOMY.MAX_MODEL_PRICE_TOKENS}.`,
    };
  }
  // Changing the price never affects people who already bought.
  const res = await prisma.mlModel.updateMany({
    where: { id, creatorId: user.id },
    data: { name, description, priceTokens: input.priceTokens },
  });
  if (res.count === 0) return { ok: false, error: "Model not found." };
  revalidatePath("/models");
  revalidatePath(`/models/${id}`);
  return { ok: true };
}

export async function setMyModelStatus(id: string, status: "ACTIVE" | "REMOVED"): Promise<void> {
  const user = await getActiveUser();
  await prisma.mlModel.updateMany({ where: { id, creatorId: user.id }, data: { status } });
  revalidatePath("/models");
  revalidatePath(`/models/${id}`);
}

export async function buyModel(
  id: string
): Promise<{ ok: true; tokensSpent: number } | { ok: false; error: string }> {
  const user = await getActiveUser();
  const model = await prisma.mlModel.findUnique({ where: { id } });
  if (!model || model.status !== "ACTIVE") return { ok: false, error: "Model not found." };
  if (model.creatorId === user.id) return { ok: false, error: "That's your own model." };
  if (model.priceTokens === 0) return { ok: false, error: "This model is free." };

  const owned = await prisma.modelPurchase.findUnique({
    where: { modelId_userId: { modelId: id, userId: user.id } },
  });
  if (owned) return { ok: false, error: "You already own this model." };

  // While "infinite tokens" is running the buyer pays nothing — and the poster
  // isn't paid either (see lib/powerups.ts), so this can't mint tokens.
  const free = user.freeTokensUntil !== null && user.freeTokensUntil.getTime() > Date.now();
  const price = free ? 0 : model.priceTokens;

  try {
    await prisma.$transaction(async (tx) => {
      if (price > 0) {
        // Conditional update: two quick clicks can't overspend the balance.
        const debited = await tx.user.updateMany({
          where: { id: user.id, tokens: { gte: price } },
          data: { tokens: { decrement: price } },
        });
        if (debited.count === 0) throw new Error("INSUFFICIENT");
        await tx.tokenTransaction.create({
          data: { userId: user.id, amount: -price, reason: "MODEL_PURCHASE", relatedModelId: id },
        });
        await tx.user.update({ where: { id: model.creatorId }, data: { tokens: { increment: price } } });
        await tx.tokenTransaction.create({
          data: { userId: model.creatorId, amount: price, reason: "MODEL_SALE", relatedModelId: id },
        });
      }
      // Unique on [modelId, userId]: a double-submit fails here and rolls back the debit.
      await tx.modelPurchase.create({ data: { modelId: id, userId: user.id, pricePaid: price } });
    });
  } catch (err) {
    if ((err as Error).message === "INSUFFICIENT") {
      return { ok: false, error: `You need ${price} tokens. Earn them by doing challenges or claiming rewards.` };
    }
    if ((err as { code?: string }).code === "P2002") return { ok: false, error: "You already own this model." };
    throw err;
  }
  revalidatePath(`/models/${id}`);
  return { ok: true, tokensSpent: price };
}
