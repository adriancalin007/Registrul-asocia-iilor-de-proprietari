// src/app/api/completare-dosar/[token]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Params { params: { token: string } }

export async function POST(req: NextRequest, { params }: Params) {
  const runda = await prisma.rundaCompletare.findUnique({
    where: { tokenCompletare: params.token },
  });

  if (!runda) return NextResponse.json({ eroare: "Link invalid" }, { status: 404 });
  if (runda.completat) return NextResponse.json({ eroare: "Dosar deja completat" }, { status: 409 });
  if (new Date(runda.tokenExpirat) < new Date()) {
    return NextResponse.json({ eroare: "Link expirat" }, { status: 410 });
  }

  const { documenteNoi, observatii } = await req.json();

  if (!documenteNoi || documenteNoi.length === 0) {
    return NextResponse.json({ eroare: "Niciun document trimis" }, { status: 400 });
  }

  await prisma.rundaCompletare.update({
    where: { id: runda.id },
    data: {
      documenteNoi,
      observatiiAsociatie: observatii,
      completatLa: new Date(),
      completat: true,
    },
  });

  // Revenim asociatia la IN_VERIFICARE pentru ca operatorul sa revada
  await prisma.asociatie.update({
    where: { id: runda.asociatieId },
    data: { stare: "IN_VERIFICARE" },
  });

  return NextResponse.json({ succes: true });
}
