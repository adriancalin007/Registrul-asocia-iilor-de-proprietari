// src/app/api/consultari/[id]/raspuns/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Rol } from "@prisma/client";

interface Params { params: { id: string } }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ eroare: "Neautentificat" }, { status: 401 });

  const { proprietateId, optiuneIndex } = await req.json();

  // Verificăm că utilizatorul este proprietarul acestei proprietăți
  const proprietate = await prisma.proprietate.findFirst({
    where: { id: proprietateId, utilizatorId: session.user.id, activ: true },
  });
  if (!proprietate) return NextResponse.json({ eroare: "Proprietate negăsită" }, { status: 403 });

  // Verificăm că consultarea este activă
  const consultare = await prisma.consultare.findUnique({ where: { id: params.id } });
  if (!consultare || consultare.stare !== "ACTIVA") {
    return NextResponse.json({ eroare: "Consultarea nu este activă" }, { status: 400 });
  }
  if (new Date(consultare.dataExpirare) < new Date()) {
    return NextResponse.json({ eroare: "Consultarea a expirat" }, { status: 400 });
  }

  // Verificăm că nu a mai votat
  const existent = await prisma.raspunsConsultare.findUnique({
    where: { consultareId_proprietateId: { consultareId: params.id, proprietateId } },
  });
  if (existent) return NextResponse.json({ eroare: "Ați exprimat deja punctul de vedere" }, { status: 409 });

  await prisma.raspunsConsultare.create({
    data: { consultareId: params.id, proprietateId, optiuneIndex },
  });

  return NextResponse.json({ succes: true });
}
