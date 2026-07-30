import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSerializedPoll, isEffectivelyClosed } from "@/lib/polls";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const pollId = (body.pollId ?? "").toString();
  const optionId = (body.optionId ?? "").toString();
  const voterMemberId = (body.voterMemberId ?? "").toString();

  if (!pollId || !optionId || !voterMemberId) {
    return NextResponse.json({ error: "pollId, optionId and voterMemberId are required" }, { status: 400 });
  }

  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: { options: true },
  });
  if (!poll) return NextResponse.json({ error: "Poll not found" }, { status: 404 });

  if (isEffectivelyClosed(poll)) {
    return NextResponse.json({ error: "This poll is closed" }, { status: 409 });
  }

  const option = poll.options.find((o) => o.id === optionId);
  if (!option) return NextResponse.json({ error: "Invalid option for this poll" }, { status: 400 });

  const voter = await prisma.member.findFirst({
    where: { id: voterMemberId, groupId: poll.groupId },
  });
  if (!voter) return NextResponse.json({ error: "Invalid voter" }, { status: 400 });

  // One vote per member per poll; editable while open -> upsert on the unique key.
  await prisma.vote.upsert({
    where: { pollId_voterMemberId: { pollId, voterMemberId } },
    create: { pollId, optionId, voterMemberId },
    update: { optionId, createdAt: new Date() },
  });

  // Leaderboard is derived on read, so returning the fresh poll is enough to
  // reflect the new vote everywhere immediately.
  const serialized = await getSerializedPoll(pollId);
  return NextResponse.json({ poll: serialized });
}
