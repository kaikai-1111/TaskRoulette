import "server-only";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { ECONOMY } from "./economy";
import { ANON_COOKIE_NAME } from "./identity.constants";

export { ANON_COOKIE_NAME };

// The anon_token cookie itself is set in middleware.ts (Edge-safe, no DB access).
// This lazily materializes the matching User row + signup bonus the first time
// a request actually needs a user (a server action, not just a page view).
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ANON_COOKIE_NAME)?.value;
  if (!token) {
    throw new Error(
      "Missing anon_token cookie — request bypassed middleware.ts"
    );
  }

  const existing = await prisma.user.findUnique({ where: { anonToken: token } });
  if (existing) return existing;

  try {
    return await prisma.user.create({
      data: {
        anonToken: token,
        credits: ECONOMY.STARTING_CREDITS,
        transactions: {
          create: { amount: ECONOMY.STARTING_CREDITS, reason: "SIGNUP_BONUS" },
        },
      },
    });
  } catch {
    // Lost a create race against a concurrent request for the same token.
    return prisma.user.findUniqueOrThrow({ where: { anonToken: token } });
  }
}
