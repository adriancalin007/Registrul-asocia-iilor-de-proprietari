// src/app/api/consultari/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Rol } from "@prisma/client";
import { inregistreazaAudit } from "@/lib/audit";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ eroare: "Neautentificat" }, { status: 401 });

  const rol = session.user.rol as Rol;
  if (rol !== Rol.PRESEDINTE_CA && rol !== Rol.ADMINISTRATOR && rol !== Rol.SUPER_ADMIN) {
    return NextResponse.json({ eroare: "Acces interzis" }, { status: 403 });
  }

  const { subiect, descriere, optiuni, dataStart, dataExpirare } = await req.json();

  if (!subiect || !optiuni || optiuni.length < 2 || !dataExpirare) {
    return NextResponse.json({ eroare: "Date incomplete" }, { status: 400 });
  }

  const cookieStore = cookies();
  let asociatieId = cookieStore.get("asociatie_activa")?.value;
  if (!asociatieId) {
    const mandat = await prisma.mandat.findFirst({ where: { utilizatorId: session.user.id, activ: true } });
    asociatieId = mandat?.asociatieId;
  }
  if (!asociatieId) return NextResponse.json({ eroare: "Nu aveți o asociație activă" }, { status: 400 });

  const consultare = await prisma.consultare.create({
    data: {
      asociatieId,
      subiect,
      descriere,
      optiuni,
      stare: "ACTIVA",
      dataStart: new Date(dataStart),
      dataExpirare: new Date(dataExpirare),
      initiatorId: session.user.id,
    },
  });

  await inregistreazaAudit({
    utilizatorId: session.user.id, rol,
    tip: "CREARE", resursa: "Consultare",
    resursaId: consultare.id, asociatieId,
    consultareId: consultare.id,
    detalii: { subiect },
  });

  return NextResponse.json({ succes: true, id: consultare.id });
}
