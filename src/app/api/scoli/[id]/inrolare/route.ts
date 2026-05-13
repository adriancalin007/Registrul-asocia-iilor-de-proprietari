// src/app/api/scoli/[id]/inrolare/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clasaId, numeElev } = await req.json();
  if (!clasaId || !numeElev?.trim()) {
    return NextResponse.json({ error: "clasaId și numeElev sunt obligatorii" }, { status: 400 });
  }

  // Verify class belongs to school
  const clasa = await prisma.clasa.findFirst({
    where: { id: clasaId, scoalaId: params.id },
  });
  if (!clasa) return NextResponse.json({ error: "Clasa negăsită" }, { status: 404 });

  // Upsert enrollment
  const inrolare = await prisma.inrolare.upsert({
    where: { userId_clasaId: { userId: session.user.id, clasaId } },
    update: { numeElev: numeElev.trim(), status: "PENDING" },
    create: {
      userId: session.user.id,
      clasaId,
      numeElev: numeElev.trim(),
      status: "PENDING",
    },
  });

  return NextResponse.json(inrolare, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { clasaId } = await req.json();

  await prisma.inrolare.deleteMany({
    where: {
      userId: session.user.id,
      clasaId,
      clasa: { scoalaId: params.id },
    },
  });

  return NextResponse.json({ ok: true });
}
