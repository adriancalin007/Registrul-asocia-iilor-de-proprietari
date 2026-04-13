import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Params { params: { token: string } }

export async function POST(req: NextRequest, { params }: Params) {
  const round = await prisma.completionRound.findUnique({ where: { completionToken: params.token } });
  if (!round) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  if (round.isCompleted) return NextResponse.json({ error: "Already completed" }, { status: 409 });
  if (new Date(round.tokenExpiresAt) < new Date()) return NextResponse.json({ error: "Link expired" }, { status: 410 });

  const { newDocuments, associationNotes } = await req.json();
  if (!newDocuments?.length) return NextResponse.json({ error: "No documents submitted" }, { status: 400 });

  await prisma.completionRound.update({
    where: { id: round.id },
    data: { newDocuments, associationNotes, completedAt: new Date(), isCompleted: true },
  });

  await prisma.association.update({
    where: { id: round.associationId },
    data: { status: "UNDER_REVIEW" },
  });

  return NextResponse.json({ success: true });
}
