# Task Roulette

A public feed of quick, absurd challenges — bounding boxes, taps, labels, drawings,
short video clips — completed by random visitors in ~30 seconds. Posting a challenge
and completing one both run on the same credit economy. See `AGENTS.md` for
framework-specific notes and the task-template architecture under `src/lib/templates/`.

## Local development

Requires a Postgres database (SQLite isn't used anymore — see "Why Postgres"
below). The free tier of [Neon](https://neon.tech) works well for this.

1. Copy `.env.example` to `.env` and fill in `DATABASE_URL` (and a fresh
   `ADMIN_PASSWORD` — don't reuse a production one for local dev).
2. `npm install` (also runs `prisma generate`)
3. `npx prisma migrate dev` — creates the schema in whatever database
   `DATABASE_URL` points at, and generates a migration if the schema changed.
4. `npx tsx prisma/seed.ts` — optional, populates ~20 placeholder challenges
   across a handful of fake creator accounts so the feed isn't empty. No fake
   *submissions* are ever created — every response still requires a real visitor.
5. `npm run dev` — http://localhost:3000

## Deploying (Vercel + Neon + Vercel Blob)

1. **Database — Neon.** Create a project at neon.tech (free tier). Copy the
   pooled connection string.
2. **Push this repo to GitHub**, then import it in Vercel
   ([vercel.com/new](https://vercel.com/new)).
3. **Environment variables** (Vercel project settings → Environment Variables):
   - `DATABASE_URL` — the Neon connection string from step 1.
   - `ADMIN_PASSWORD` — a fresh, strong password (this gates `/admin`, the
     moderation queue and the all-challenges view). Don't reuse the dev one.
   - `BLOB_READ_WRITE_TOKEN` — enable Vercel Blob on the project (Storage tab
     → Create → Blob) and it's added automatically. Without this set, video
     recordings fall back to local-disk storage, which does **not** work on
     Vercel (ephemeral filesystem) — so this is required before Video
     Recording challenges work in production. Every other template type
     works fine without it.
4. **Run the migration against the production database once**, before or
   right after the first deploy: `DATABASE_URL=<neon-url> npx prisma migrate deploy`.
5. **Seed data (optional):** `DATABASE_URL=<neon-url> npx tsx prisma/seed.ts`.
6. Vercel builds with `npm run build`; `postinstall` runs `prisma generate`
   automatically, so no extra build config is needed.
7. **Custom domain:** add it any time under the Vercel project's Domains tab —
   no code changes needed. The app doesn't hardcode its own origin anywhere.

### Why Postgres (not SQLite)

The app started on SQLite for zero-setup local dev. A real deploy needs a
database reachable from wherever the app runs (SQLite's a local file, which
doesn't survive or share across serverless instances), so the schema now
targets Postgres only — Prisma can't target both from one schema file. If you
don't want to depend on Neon for local dev too, ask about running a local
Postgres instead.

### Known v1 limitations worth knowing about before a real public launch

- **Video duration is soft-enforced.** The recorder auto-stops client-side
  and the server checks the claimed duration, but a modified client could
  send a longer clip. There's a hard 8MB upload cap as a backstop
  (`ECONOMY.MAX_VIDEO_UPLOAD_BYTES`), but no server-side re-encode/verify.
- **No consensus/voting on answers** — by design for v1 (see project spec),
  but means a bad-faith submission isn't caught automatically, only via the
  flag → admin review path.
- **Anonymous credits reset if cookies are cleared** — accepted tradeoff for
  the no-signup-wall feed; "claim your account" (`/account`) persists credits
  across devices if a visitor wants that.
