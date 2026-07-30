import { NextRequest, NextResponse } from "next/server";
import { prisma, getDefaultGroup } from "@/lib/db";
import { computeLeaderboard, computeHallOfFame, TimeWindow } from "@/lib/leaderboard";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const group = await getDefaultGroup();
  const sp = req.nextUrl.searchParams;
  const window = (sp.get("window") as TimeWindow) || "all";
  const sentimentId = sp.get("sentimentId");

  const sentiments = await prisma.sentiment.findMany({
    where: { groupId: group.id },
    orderBy: { createdAt: "asc" },
  });

  // Hall of Fame is always all-time #1 per sentiment.
  const hallOfFame = await computeHallOfFame(group.id);

  // Default to the first sentiment if none specified.
  const activeId = sentimentId || sentiments[0]?.id || null;
  const rows = activeId ? await computeLeaderboard(group.id, activeId, window) : [];

  return NextResponse.json({
    sentiments,
    activeSentimentId: activeId,
    window,
    rows,
    hallOfFame,
  });
}
