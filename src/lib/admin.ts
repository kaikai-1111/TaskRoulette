import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getCurrentUser } from "./identity";
import { prisma } from "./prisma";

const COOKIE_NAME = "admin_session";

function expectedCookieValue(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD is not set in .env");
  return createHmac("sha256", password).update("quicktask-admin").digest("hex");
}

async function hasAdminCookie(): Promise<boolean> {
  if (!process.env.ADMIN_PASSWORD) return false;
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (!value) return false;
  const expected = expectedCookieValue();
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Two independent ways in: the shared ADMIN_PASSWORD cookie (the original
// bootstrap mechanism — always works, no account needed), or a per-account
// isAdmin flag (see grantAdminAction) granted by an existing admin to a
// specific username, no secret-sharing required.
export async function isAdmin(): Promise<boolean> {
  if (await hasAdminCookie()) return true;
  const user = await getCurrentUser();
  return user.isAdmin;
}

export async function attemptAdminLogin(password: string): Promise<boolean> {
  const real = process.env.ADMIN_PASSWORD;
  if (!real) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(real);
  const ok = a.length === b.length && timingSafeEqual(a, b);
  if (!ok) return false;

  // A banned device can't talk its way back in as an admin.
  if ((await getCurrentUser()).isBanned) return false;

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, expectedCookieValue(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  // Knowing the shared password now also permanently marks this device's
  // identity as an admin (account or not), so access survives past this
  // cookie's 12h expiry instead of needing the password again each time.
  const user = await getCurrentUser();
  if (!user.isAdmin) {
    await prisma.user.update({ where: { id: user.id }, data: { isAdmin: true } });
  }

  return true;
}

export async function adminLogout() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
