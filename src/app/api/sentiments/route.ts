import { NextRequest, NextResponse } from "next/server";
import { prisma, getDefaultGroup } from "@/lib/db";
import { pickSentimentColor } from "@/lib/colors";

export const runtime = "nodejs";

export async function GET() {
  const group = await getDefaultGroup();
  const sentiments = await prisma.sentiment.findMany({
    where: { groupId: group.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ sentiments });
}

export async function POST(req: NextRequest) {
  const group = await getDefaultGroup();
  const body = await req.json();
  const label = (body.label ?? "").toString().trim();
  const emoji = body.emoji ? body.emoji.toString().trim() : null;

  if (!label) {
    return NextResponse.json({ error: "Label is required" }, { status: 400 });
  }

  // Reuse an existing tag with the same label (case-insensitive) if present.
  const existing = await prisma.sentiment.findFirst({
    where: { groupId: group.id, label: { equals: label } },
  });
  if (existing) return NextResponse.json({ sentiment: existing });

  const all = await prisma.sentiment.findMany({ where: { groupId: group.id } });
  const color = pickSentimentColor(all.map((s) => s.color), label);

  const sentiment = await prisma.sentiment.create({
    data: { groupId: group.id, label, color, emoji },
  });
  return NextResponse.json({ sentiment }, { status: 201 });
}
