import { NextRequest, NextResponse } from "next/server";
import { prisma, getDefaultGroup } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const group = await getDefaultGroup();
  const members = await prisma.member.findMany({
    where: { groupId: group.id },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ groupId: group.id, groupName: group.name, members });
}

export async function POST(req: NextRequest) {
  const group = await getDefaultGroup();
  const body = await req.json();
  const name = (body.name ?? "").toString().trim();
  const image = body.image ? body.image.toString() : null;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const member = await prisma.member.create({
    data: { groupId: group.id, name, image },
  });
  return NextResponse.json({ member }, { status: 201 });
}
