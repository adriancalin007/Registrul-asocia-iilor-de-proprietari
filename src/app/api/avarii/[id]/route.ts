// src/app/api/avarii/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Rol, StareAvarie } from "@prisma/client";
import { inregistreazaAudit } from "@/lib/audit";

interface Params { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ eroare: "Neautentificat" }, { status: 401 });

  const rol = session.user.rol as Rol;
  if (rol !== Rol.ADMINISTRATOR && rol !== Rol.PRESEDINTE_CA && rol !== Rol.SUPER_ADMIN) {
    return NextResponse.json({ eroare: "Acces interzis" }, { status: 403 });
  }

  const { stareNoua, observatii, pvUrl } = await req.json();

  const avarie = await prisma.avarie.findUnique({ where: { id: params.id } });
  if (!avarie) return NextResponse.json({ eroare: "Avarie negăsită" }, { status: 404 });

  // Înregistrăm istoricul stării
  await prisma.istoricStareAvarie.create({
    data: {
      avarieId: avarie.id,
      stareVeche: avarie.stare,
      stareNoua: stareNoua as StareAvarie,
      observatii,
      modificatDe: session.user.id,
    },
  });

  await prisma.avarie.update({
    where: { id: params.id },
    data: {
      stare: stareNoua as StareAvarie,
      pvReceptie: pvUrl || null,
      inchisLa: stareNoua === "INCHISA" ? new Date() : null,
    },
  });

  await inregistreazaAudit({
    utilizatorId: session.user.id, rol,
    tip: "MODIFICARE", resursa: "Avarie",
    resursaId: avarie.id, asociatieId: avarie.asociatieId,
    avarieId: avarie.id,
    detalii: { stareVeche: avarie.stare, stareNoua, observatii },
  });

  return NextResponse.json({ succes: true });
}
