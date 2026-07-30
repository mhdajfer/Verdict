import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSerializedPoll } from "@/lib/polls";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const poll = await getSerializedPoll(id);
  if (!poll) return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  return NextResponse.json({ poll });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const data: { status?: string; closesAt?: Date | null } = {};

  if (body.status !== undefined) {
    if (body.status !== "open" && body.status !== "closed") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    data.status = body.status;
    // Reopening clears an expired timer so it doesn't immediately re-close.
    if (body.status === "open") data.closesAt = null;
  }

  try {
    await prisma.poll.update({ where: { id }, data });
  } catch {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }

  const poll = await getSerializedPoll(id);
  return NextResponse.json({ poll });
}
