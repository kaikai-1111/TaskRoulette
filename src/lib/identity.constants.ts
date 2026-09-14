// Split out from identity.ts so middleware.ts (Edge runtime) can import the
// cookie name without pulling in prisma / server-only.
export const ANON_COOKIE_NAME = "anon_token";
