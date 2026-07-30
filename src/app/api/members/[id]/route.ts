import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const data: { name?: string; image?: string | null } = {};

  if (body.name !== undefined) {
    const name = body.name.toString().trim();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    data.name = name;
  }
  if (body.image !== undefined) {
    data.image = body.image ? body.image.toString() : null;
  }

  try {
    const member = await prisma.member.update({ where: { id }, data });
    return NextResponse.json({ member });
  } catch {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await prisma.member.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
}
