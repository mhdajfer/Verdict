import { prisma } from "./db";

export type PollWithRelations = Awaited<ReturnType<typeof fetchPollRaw>>;

async function fetchPollRaw(id: string) {
  return prisma.poll.findUnique({
    where: { id },
    include: {
      sentiment: true,
      createdBy: true,
      options: { include: { member: true } },
      votes: true,
    },
  });
}

export interface OptionResult {
  optionId: string;
  memberId: string;
  name: string;
  image: string | null;
  votes: number;
  percent: number;
  isWinner: boolean;
}

export interface SerializedPoll {
  id: string;
  question: string;
  status: string;
  anonymous: boolean;
  showLiveResults: boolean;
  createdAt: string;
  closesAt: string | null;
  createdBy: { id: string; name: string } | null;
  sentiment: { id: string; label: string; color: string; emoji: string | null };
  totalVotes: number;
  results: OptionResult[];
  // voterMemberId -> optionId (only included when not anonymous)
  voterChoices: Record<string, string> | null;
  winnerNames: string[];
  isEffectivelyClosed: boolean;
}

/** A poll is "effectively closed" if explicitly closed or its timer has passed. */
export function isEffectivelyClosed(poll: {
  status: string;
  closesAt: Date | null;
}): boolean {
  if (poll.status === "closed") return true;
  if (poll.closesAt && poll.closesAt.getTime() <= Date.now()) return true;
  return false;
}

export function serializePoll(
  poll: NonNullable<PollWithRelations>,
): SerializedPoll {
  const tally = new Map<string, number>();
  for (const opt of poll.options) tally.set(opt.id, 0);
  for (const v of poll.votes) tally.set(v.optionId, (tally.get(v.optionId) ?? 0) + 1);

  const total = poll.votes.length;
  let max = 0;
  for (const c of tally.values()) if (c > max) max = c;

  const results: OptionResult[] = poll.options
    .map((opt) => {
      const votes = tally.get(opt.id) ?? 0;
      return {
        optionId: opt.id,
        memberId: opt.memberId,
        name: opt.member.name,
        image: opt.member.image,
        votes,
        percent: total > 0 ? Math.round((votes / total) * 100) : 0,
        isWinner: max > 0 && votes === max,
      };
    })
    .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));

  const voterChoices: Record<string, string> = {};
  for (const v of poll.votes) voterChoices[v.voterMemberId] = v.optionId;

  return {
    id: poll.id,
    question: poll.question,
    status: poll.status,
    anonymous: poll.anonymous,
    showLiveResults: poll.showLiveResults,
    createdAt: poll.createdAt.toISOString(),
    closesAt: poll.closesAt ? poll.closesAt.toISOString() : null,
    createdBy: poll.createdBy
      ? { id: poll.createdBy.id, name: poll.createdBy.name }
      : null,
    sentiment: {
      id: poll.sentiment.id,
      label: poll.sentiment.label,
      color: poll.sentiment.color,
      emoji: poll.sentiment.emoji,
    },
    totalVotes: total,
    results,
    voterChoices: poll.anonymous ? null : voterChoices,
    winnerNames: max > 0 ? results.filter((r) => r.isWinner).map((r) => r.name) : [],
    isEffectivelyClosed: isEffectivelyClosed(poll),
  };
}

export async function getSerializedPoll(id: string): Promise<SerializedPoll | null> {
  const poll = await fetchPollRaw(id);
  if (!poll) return null;
  return serializePoll(poll);
}
