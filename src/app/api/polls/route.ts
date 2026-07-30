import { NextRequest, NextResponse } from "next/server";
import { prisma, getDefaultGroup } from "@/lib/db";
import { serializePoll } from "@/lib/polls";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const group = await getDefaultGroup();
  const sp = req.nextUrl.searchParams;
  const sentimentId = sp.get("sentimentId");
  const status = sp.get("status"); // "open" | "closed" | null

  const polls = await prisma.poll.findMany({
    where: {
      groupId: group.id,
      ...(sentimentId ? { sentimentId } : {}),
    },
    include: {
      sentiment: true,
      createdBy: true,
      options: { include: { member: true } },
      votes: true,
    },
    orderBy: { createdAt: "desc" },
  });

  let serialized = polls.map(serializePoll);

  // Filter by effective status (respects expired timers) after serialization.
  if (status === "open") serialized = serialized.filter((p) => !p.isEffectivelyClosed);
  if (status === "closed") serialized = serialized.filter((p) => p.isEffectivelyClosed);

  return NextResponse.json({ polls: serialized });
}

export async function POST(req: NextRequest) {
  const group = await getDefaultGroup();
  const body = await req.json();

  const question = (body.question ?? "").toString().trim();
  const sentimentId = (body.sentimentId ?? "").toString();
  const memberIds: string[] = Array.isArray(body.memberIds) ? body.memberIds : [];
  const createdById = body.createdById ? body.createdById.toString() : null;
  const anonymous = Boolean(body.anonymous);
  const showLiveResults = body.showLiveResults === undefined ? true : Boolean(body.showLiveResults);
  const closesAt = body.closesAt ? new Date(body.closesAt) : null;

  if (!question) return NextResponse.json({ error: "Question is required" }, { status: 400 });
  if (!sentimentId) return NextResponse.json({ error: "Sentiment is required" }, { status: 400 });
  if (memberIds.length < 2) {
    return NextResponse.json({ error: "Pick at least 2 members as options" }, { status: 400 });
  }

  const sentiment = await prisma.sentiment.findUnique({ where: { id: sentimentId } });
  if (!sentiment || sentiment.groupId !== group.id) {
    return NextResponse.json({ error: "Invalid sentiment" }, { status: 400 });
  }

  // Validate members belong to the group.
  const members = await prisma.member.findMany({
    where: { id: { in: memberIds }, groupId: group.id },
  });
  if (members.length !== memberIds.length) {
    return NextResponse.json({ error: "One or more members are invalid" }, { status: 400 });
  }

  const poll = await prisma.poll.create({
    data: {
      groupId: group.id,
      question,
      sentimentId,
      createdById,
      anonymous,
      showLiveResults,
      closesAt: closesAt && !isNaN(closesAt.getTime()) ? closesAt : null,
      options: { create: memberIds.map((memberId) => ({ memberId })) },
    },
    include: {
      sentiment: true,
      createdBy: true,
      options: { include: { member: true } },
      votes: true,
    },
  });

  return NextResponse.json({ poll: serializePoll(poll) }, { status: 201 });
}
