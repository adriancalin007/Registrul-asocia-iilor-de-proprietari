// src/app/api/consultari/[id]/raspuns/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ConsultationStatus } from "@prisma/client";

interface Params { params: { id: string } }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ownershipId, optionIndex } = await req.json();

  // Verify user owns this ownership record
  const ownership = await prisma.ownership.findFirst({
    where: { id: ownershipId, userId: session.user.id, isActive: true },
  });
  if (!ownership) return NextResponse.json({ error: "Ownership not found" }, { status: 403 });

  // Verify consultation is active
  const consultation = await prisma.consultation.findUnique({ where: { id: params.id } });
  if (!consultation || consultation.status !== ConsultationStatus.ACTIVE) {
    return NextResponse.json({ error: "Consultation is not active" }, { status: 400 });
  }
  if (new Date(consultation.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Consultation has expired" }, { status: 400 });
  }

  // Check not already responded
  const existing = await prisma.consultationResponse.findUnique({
    where: { consultationId_ownershipId: { consultationId: params.id, ownershipId } },
  });
  if (existing) return NextResponse.json({ error: "You have already responded" }, { status: 409 });

  await prisma.consultationResponse.create({
    data: { consultationId: params.id, ownershipId, optionIndex },
  });

  return NextResponse.json({ success: true });
}
