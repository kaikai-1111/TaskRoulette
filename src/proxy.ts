import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ANON_COOKIE_NAME } from "@/lib/identity.constants";

// Edge-safe: only mints a stable random id for first-time visitors. The
// matching User row (and starting credit balance) is created lazily in
// lib/identity.ts the first time a server action actually needs it.
export function proxy(request: NextRequest) {
  if (request.cookies.get(ANON_COOKIE_NAME)) return NextResponse.next();

  const response = NextResponse.next();
  response.cookies.set(ANON_COOKIE_NAME, crypto.randomUUID(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
