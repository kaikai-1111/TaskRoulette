"use server";

import { cookies } from "next/headers";
import { OAuth2Client } from "google-auth-library";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, ANON_COOKIE_NAME } from "@/lib/identity";
import { isAdmin } from "@/lib/admin";
import { generateRecoveryCode, hashRecoveryCode } from "@/lib/recovery";
import { isValidUsername, normalizeUsername, USERNAME_HINT } from "@/lib/username";

export async function getAccountStatus() {
  const user = await getCurrentUser();
  return {
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    credits: user.credits,
    hasAccount: !!(user.email && user.username),
    // Admins (ADMIN_PASSWORD) can post challenges without an account too.
    canPostWithoutAccount: await isAdmin(),
  };
}

export async function getAccountStats() {
  const user = await getCurrentUser();
  const [challengesPosted, submissionsGiven, earned, spent] = await Promise.all([
    prisma.challenge.count({ where: { creatorId: user.id } }),
    prisma.submission.count({ where: { submitterId: user.id, status: { not: "REMOVED" } } }),
    prisma.creditTransaction.aggregate({
      where: { userId: user.id, amount: { gt: 0 } },
      _sum: { amount: true },
    }),
    prisma.creditTransaction.aggregate({
      where: { userId: user.id, amount: { lt: 0 } },
      _sum: { amount: true },
    }),
  ]);
  return {
    challengesPosted,
    submissionsGiven,
    creditsEarned: earned._sum.amount ?? 0,
    creditsSpent: Math.abs(spent._sum.amount ?? 0),
    memberSince: user.createdAt,
  };
}

// Creates the username/email/recoveryCode identity needed to post a
// challenge. Doing challenges never requires this — only posting does.
export async function createAccount(input: {
  email: string;
  username: string;
  displayName: string;
}): Promise<{ ok: true; recoveryCode: string } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const username = normalizeUsername(input.username);
  if (!isValidUsername(username)) {
    return { ok: false, error: `Invalid username. ${USERNAME_HINT}` };
  }

  const displayName = input.displayName.trim().slice(0, 40) || username;

  const user = await getCurrentUser();
  const code = generateRecoveryCode();

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { email, username, displayName, recoveryCodeHash: hashRecoveryCode(code) },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = (err.meta?.target as string[] | undefined)?.join(",") ?? "";
      if (target.includes("username")) return { ok: false, error: "That username is taken." };
      if (target.includes("email")) return { ok: false, error: "That email is already registered." };
    }
    return { ok: false, error: "Couldn't create the account — try again." };
  }

  return { ok: true, recoveryCode: code };
}

// Rotates the recovery code on an already-created account. Invalidates the
// old code immediately (it's a hash overwrite, not an additional valid one).
export async function regenerateRecoveryCode(): Promise<
  { ok: true; recoveryCode: string } | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user.email || !user.username) {
    return { ok: false, error: "Create an account first." };
  }
  const code = generateRecoveryCode();
  await prisma.user.update({
    where: { id: user.id },
    data: { recoveryCodeHash: hashRecoveryCode(code) },
  });
  return { ok: true, recoveryCode: code };
}

export async function updateDisplayName(
  displayName: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = displayName.trim().slice(0, 40);
  if (!trimmed) return { ok: false, error: "Display name can't be empty." };
  const user = await getCurrentUser();
  await prisma.user.update({ where: { id: user.id }, data: { displayName: trimmed } });
  return { ok: true };
}

// Points this browser's anon_token cookie at the account matching
// email + recovery code, so its credits (and history) become "this device's".
export async function restoreAccount(
  email: string,
  code: string
): Promise<{ ok: true; credits: number } | { ok: false; error: string }> {
  const trimmed = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: trimmed } });
  if (!user || !user.recoveryCodeHash || user.recoveryCodeHash !== hashRecoveryCode(code)) {
    return { ok: false, error: "No account matches that email + recovery code." };
  }

  const cookieStore = await cookies();
  cookieStore.set(ANON_COOKIE_NAME, user.anonToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return { ok: true, credits: user.credits };
}

// "Continue with Google" — verifies the ID token Google's own Identity
// Services JS library hands back client-side (no client secret needed for
// this flow, unlike a full OAuth redirect exchange). Three cases:
//  1. This Google account is already linked here -> switch this device to it.
//  2. Its email matches an existing (non-Google) account -> link + switch.
//  3. Neither -> upgrade *this* browser's current anonymous session in
//     place, so any credits already earned anonymously carry over, same as
//     the plain createAccount flow above.
export async function signInWithGoogle(
  idToken: string
): Promise<{ ok: true; credits: number } | { ok: false; error: string }> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) return { ok: false, error: "Google sign-in isn't configured yet." };

  let payload;
  try {
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken, audience: clientId });
    payload = ticket.getPayload();
  } catch {
    return { ok: false, error: "Couldn't verify that Google sign-in — try again." };
  }
  if (!payload?.sub || !payload.email) {
    return { ok: false, error: "Google didn't return the expected account info." };
  }

  const googleId = payload.sub;
  const email = payload.email.toLowerCase();
  const name = payload.name?.trim();

  let user = await prisma.user.findUnique({ where: { googleId } });

  if (!user) {
    const existingByEmail = await prisma.user.findUnique({ where: { email } });
    if (existingByEmail) {
      user = await prisma.user.update({ where: { id: existingByEmail.id }, data: { googleId } });
    }
  }

  if (!user) {
    const current = await getCurrentUser();
    const base =
      normalizeUsername(email.split("@")[0]).replace(/[^a-z0-9_]/g, "_").slice(0, 20) || "user";
    let username = base.length >= 3 ? base : `${base}_user`.slice(0, 20);

    for (let attempt = 0; attempt < 20; attempt++) {
      try {
        user = await prisma.user.update({
          where: { id: current.id },
          data: { email, username, displayName: name || username, googleId },
        });
        break;
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          const target = (err.meta?.target as string[] | undefined)?.join(",") ?? "";
          if (target.includes("username")) {
            username = `${base}${Math.floor(Math.random() * 10000)}`.slice(0, 20);
            continue;
          }
        }
        throw err;
      }
    }
    if (!user) return { ok: false, error: "Couldn't create an account — try again." };
  }

  const cookieStore = await cookies();
  cookieStore.set(ANON_COOKIE_NAME, user.anonToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return { ok: true, credits: user.credits };
}

export async function getAgeAttested(): Promise<boolean> {
  const user = await getCurrentUser();
  return user.ageAttested;
}

export async function attestAge(): Promise<void> {
  const user = await getCurrentUser();
  await prisma.user.update({ where: { id: user.id }, data: { ageAttested: true } });
}
