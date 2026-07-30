# Verdict

A sentiment-tagged poll & all-time leaderboard app for friend groups. The
**question** is arbitrary, the **choices are always your group's members**
(tap-to-vote on their photos), and every poll carries a **sentiment tag**
(Cringe, Baddie, Fool of the Week — fully custom). Votes across every poll
sharing a tag feed a **persistent, cross-session leaderboard per sentiment**.

Built mobile-first (390px primary target) — it's a phone app that runs in a
browser.

## Stack (everything free, no credit card, runs end-to-end locally)

| Concern    | Choice                         | Why |
|------------|--------------------------------|-----|
| Framework  | **Next.js 15 (App Router) + TS** | One process for UI + API routes; deploys free on Vercel or self-host. |
| Database   | **libSQL via Prisma driver adapter** | One code path for a local `file:` SQLite DB (dev) and **Turso** (Vercel). libSQL is SQLite-compatible, so the schema is unchanged; move to Postgres by swapping the datasource. |
| Styling    | **Tailwind CSS**               | Restrained, consistent, fast. |
| Animation  | **Framer Motion**              | Spring vote taps, staggered result bars, FLIP leaderboard reordering, route transitions. |
| Images     | **base64 data-URL in the DB**  | Photos are downscaled client-side (~400px) and stored in the `Member.image` column — no cloud storage, and works on serverless where there's no writable disk. |
| Identity   | **"Select who you are"** in `localStorage` | No paid auth; private-link model for a friend group. |

It runs entirely on your machine for dev, and deploys to Vercel on free tiers.
⚠️ **Free-tier caveat:** Turso's free tier is free to start but can require
payment at very large scale — the one known tradeoff of going serverless instead
of self-hosting the SQLite file.

## Getting started

```bash
npm install                 # installs deps + generates Prisma client
npx prisma migrate dev      # creates prisma/dev.db from the schema
npm run db:seed             # 4 members, 3 sentiments, 4 polls, 15 votes
npm run dev                 # http://localhost:3000
```

The libSQL adapter points at `prisma/dev.db` locally whenever the `TURSO_*` env
vars are unset, so local dev needs no Turso account.

## Deploy to Vercel (free)

The app writes to the database on every vote, so it needs a hosted DB (Vercel's
filesystem is ephemeral). Images are already base64-in-DB, so there's nothing else
to host.

1. **Create a free Turso database** and put the URL + token in `.env`:
   ```bash
   turso db create verdict
   turso db show verdict --url       # -> TURSO_DATABASE_URL (libsql://…)
   turso db tokens create verdict    # -> TURSO_AUTH_TOKEN
   ```
2. **Apply the schema + seed** (no Turso CLI needed — these use the libSQL client
   and read `TURSO_*` from `.env`):
   ```bash
   npm run turso:apply    # creates the tables on Turso (idempotent)
   npm run turso:seed     # optional demo data
   ```
3. **Deploy:** push to GitHub, import the repo in Vercel, and set the same two env
   vars (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`) in the Vercel project. The build
   runs `prisma generate && next build`.

> `.env` is gitignored — the auth token is never committed. Set it in the Vercel
> dashboard, not in the repo.

> ⚠️ **Heads-up:** with `TURSO_*` set in your local `.env`, local `npm run dev`
> reads/writes the **same Turso DB** as production. For an isolated local database,
> comment out the two `TURSO_*` lines — the adapter then falls back to
> `prisma/dev.db`.

**Self-host instead?** Because the adapter falls back to a local SQLite file when
`TURSO_*` is absent, `npm run build && npm run start` runs the whole app on any
persistent Node host (your machine, Railway, Render, Fly, a VPS) with no Turso.

## Screens (bottom tab bar: Polls / Create / Ranks / Circle)

- **Polls** (`/`) — feed of all polls, filter by status and sentiment, winner crown on closed polls.
- **Create** (`/create`) — question, sentiment picker (+ create-new inline with emoji & auto-assigned color), member picker (all selected by default), anonymous / live-results / auto-close toggles, preview before publishing.
- **Voting** (`/polls/[id]`) — tap a member to vote (spring feedback + checkmark), animated result bars, live-vs-after-close results, visible/anonymous voter breakdown, editable vote until close.
- **Leaderboard** (`/leaderboard`) — Hall of Fame cards, sentiment tabs, all-time/month/week windows, full ranked list with FLIP reordering. **Every member is always listed**, including 0-point members ranked last.
- **Circle** (`/members`) — member CRUD with photo upload (or URL).
- **Profile** (`/profile/[id]`) — a member's "roast record": rank + points + wins across every sentiment.

## The scoring model (the core mechanic)

- **1 vote received = 1 point**, credited to that member under the poll's sentiment.
- A member's score for a sentiment = **sum of points across every poll ever run under that sentiment** in the group (narrowed by the time window if not "all-time").
- **Win** = a member got the most votes in a poll under that sentiment (ties all count).
- Leaderboard is **derived directly from raw votes on every read** (see `src/lib/leaderboard.ts`), never from pre-tallied poll results — so it can't drift. Because reads recompute from votes, casting/editing a vote is reflected everywhere immediately.
- The leaderboard query **always returns the full member list**; zero-scorers appear last at 0 points and are never filtered out.
- Sort: points desc → most-recent-vote desc → name asc (consistent tie-break).

## Assumptions & tradeoffs (stated, not hidden)

- **Single group.** The schema is fully `groupId`-scoped and the app auto-creates one default group ("The Circle"), so multi-group is an additive change, not a rewrite. Scoped down to keep it shippable end-to-end.
- **LeaderboardEntry is computed, not materialized.** The data model lists it as derived/materialized; correctness is the priority, so it's computed on read from raw votes. For a friend-group scale this is instant; at larger scale you'd cache/materialize it with the same query as the source of truth.
- **Images are base64 data-URLs in the DB**, downscaled to ~400px client-side (JPEG q0.8) so rows stay small (~1–15 KB). This trades a little DB size for zero storage infrastructure and serverless compatibility. At larger scale you'd move these to object storage (e.g. Vercel Blob) and keep only a URL in the column.
- **Identity is device-local**, by design (no auth). Anyone with the link picks who they are; the choice lives in `localStorage`. For anonymous polls the voter's own pick is also remembered locally so they can edit it, while the server never exposes who-voted-for-whom.
- **Time windows are rolling** ("this week" = last 7 days, "this month" = last 30 days).
- **Editing a vote updates its timestamp**, so the recency tie-break and window filter reflect the current vote.

## Project layout

```
prisma/schema.prisma      data model (Group, Member, Sentiment, Poll, PollOption, Vote)
prisma/seed.mjs           demo data
src/lib/leaderboard.ts    cross-poll aggregation (the core mechanic)
src/lib/polls.ts          poll serialization + winner/result tallies
src/app/api/*             REST endpoints
src/app/*                 pages
src/components/*           UI (BottomNav, Avatar, SentimentBadge, sheets, cards)
```
