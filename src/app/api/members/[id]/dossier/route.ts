import { NextRequest, NextResponse } from "next/server";
import { prisma, getDefaultGroup } from "@/lib/db";
import { computeLeaderboard, TimeWindow } from "@/lib/leaderboard";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const group = await getDefaultGroup();

  const member = await prisma.member.findUnique({ where: { id } });
  if (!member || member.groupId !== group.id) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const window = (req.nextUrl.searchParams.get("window") as TimeWindow) || "all";

  const sentiments = await prisma.sentiment.findMany({
    where: { groupId: group.id },
    orderBy: { createdAt: "asc" },
  });

  const records = [];
  for (const s of sentiments) {
    const rows = await computeLeaderboard(group.id, s.id, window);
    const total = rows.length;
    const row = rows.find((r) => r.memberId === id);
    if (!row) continue;
    records.push({
      sentiment: s,
      rank: row.rank,
      totalMembers: total,
      points: row.points,
      wins: row.wins,
      appearances: row.appearances,
    });
  }

  // Show the sentiments where they actually have a presence first.
  records.sort((a, b) => b.points - a.points || a.rank - b.rank);

  return NextResponse.json({ member, records, window });
}
