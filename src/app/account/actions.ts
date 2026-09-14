"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, ANON_COOKIE_NAME } from "@/lib/identity";
import { generateRecoveryCode, hashRecoveryCode } from "@/lib/recovery";

export async function getAccountStatus() {
  const user = await getCurrentUser();
  return { email: user.email, credits: user.credits };
}

// Ties an email + a freshly-generated recovery code to the current device's
// account. The code is shown to the user exactly once here and never again —
// only its hash is stored. Whoever later presents email + code can pull this
// account's credits onto a different device (see restoreAccount below).
export async function claimAccount(
  email: string
): Promise<{ ok: true; recoveryCode: string } | { ok: false; error: string }> {
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const user = await getCurrentUser();
  const code = generateRecoveryCode();

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { email: trimmed, recoveryCodeHash: hashRecoveryCode(code) },
    });
  } catch {
    return { ok: false, error: "That email is already claimed on another account." };
  }

  return { ok: true, recoveryCode: code };
}

// Points this browser's anon_token cookie at the claimed account matching
// email + code, so its credits (and history) become "this device's" account.
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

export async function getAgeAttested(): Promise<boolean> {
  const user = await getCurrentUser();
  return user.ageAttested;
}

export async function attestAge(): Promise<void> {
  const user = await getCurrentUser();
  await prisma.user.update({ where: { id: user.id }, data: { ageAttested: true } });
}
