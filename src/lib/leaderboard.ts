import { prisma } from "./db";

export type TimeWindow = "all" | "month" | "week";

export interface LeaderboardRow {
  rank: number;
  memberId: string;
  name: string;
  image: string | null;
  points: number; // 1 per vote received under this sentiment (in window)
  wins: number; // # polls under this sentiment where they got the most votes
  appearances: number; // # polls under this sentiment they were an option in
  lastVoteAt: string | null;
}

/** Rolling window start. `all` => null (no lower bound). */
export function windowStart(window: TimeWindow): Date | null {
  if (window === "all") return null;
  const now = Date.now();
  const days = window === "week" ? 7 : 30;
  return new Date(now - days * 24 * 60 * 60 * 1000);
}

/**
 * The core mechanic. Points are derived directly from raw votes, NOT from
 * any pre-tallied poll result — aggregated across every poll ever tagged with
 * the sentiment in this group.
 *
 * Scoring: each vote a member RECEIVES = 1 point, credited under the poll's
 * sentiment. A member's score = sum over every poll under that sentiment.
 *
 * The returned list ALWAYS contains every member of the group, including
 * those with 0 points (ranked last). Never filtered.
 *
 * Sort: points desc, then most-recent-vote desc, then name asc (consistent).
 */
export async function computeLeaderboard(
  groupId: string,
  sentimentId: string,
  window: TimeWindow = "all",
): Promise<LeaderboardRow[]> {
  const since = windowStart(window);

  const members = await prisma.member.findMany({
    where: { groupId },
    orderBy: { name: "asc" },
  });

  const polls = await prisma.poll.findMany({
    where: { groupId, sentimentId },
    include: { options: true, votes: true },
  });

  // Seed every member at zero so no one is ever dropped.
  const agg = new Map<
    string,
    { points: number; wins: number; appearances: number; lastVoteAt: number | null }
  >();
  for (const m of members) {
    agg.set(m.id, { points: 0, wins: 0, appearances: 0, lastVoteAt: null });
  }

  for (const poll of polls) {
    const optionToMember = new Map<string, string>();
    for (const opt of poll.options) optionToMember.set(opt.id, opt.memberId);

    // Appearances: being listed as an option counts, regardless of votes.
    for (const opt of poll.options) {
      const a = agg.get(opt.memberId);
      if (a) a.appearances += 1;
    }

    // Tally votes for this poll within the window.
    const perMember = new Map<string, number>();
    for (const vote of poll.votes) {
      if (since && vote.createdAt < since) continue;
      const memberId = optionToMember.get(vote.optionId);
      if (!memberId) continue;
      perMember.set(memberId, (perMember.get(memberId) ?? 0) + 1);

      const a = agg.get(memberId);
      if (a) {
        a.points += 1;
        const t = vote.createdAt.getTime();
        if (a.lastVoteAt === null || t > a.lastVoteAt) a.lastVoteAt = t;
      }
    }

    // Wins: everyone tied at the (non-zero) max for this poll gets a win.
    let max = 0;
    for (const c of perMember.values()) if (c > max) max = c;
    if (max > 0) {
      for (const [memberId, c] of perMember) {
        if (c === max) {
          const a = agg.get(memberId);
          if (a) a.wins += 1;
        }
      }
    }
  }

  const rows = members.map((m) => {
    const a = agg.get(m.id)!;
    return {
      memberId: m.id,
      name: m.name,
      image: m.image,
      points: a.points,
      wins: a.wins,
      appearances: a.appearances,
      lastVoteAt: a.lastVoteAt,
    };
  });

  rows.sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    const xl = x.lastVoteAt ?? 0;
    const yl = y.lastVoteAt ?? 0;
    if (yl !== xl) return yl - xl;
    return x.name.localeCompare(y.name);
  });

  return rows.map((r, i) => ({
    rank: i + 1,
    memberId: r.memberId,
    name: r.name,
    image: r.image,
    points: r.points,
    wins: r.wins,
    appearances: r.appearances,
    lastVoteAt: r.lastVoteAt ? new Date(r.lastVoteAt).toISOString() : null,
  }));
}

/** #1 for every sentiment in the group (all-time) — powers the Hall of Fame. */
export async function computeHallOfFame(groupId: string) {
  const sentiments = await prisma.sentiment.findMany({
    where: { groupId },
    orderBy: { createdAt: "asc" },
  });

  const cards = [];
  for (const s of sentiments) {
    const rows = await computeLeaderboard(groupId, s.id, "all");
    const leader = rows.find((r) => r.points > 0) ?? null;
    cards.push({
      sentiment: s,
      leader,
    });
  }
  return cards;
}
