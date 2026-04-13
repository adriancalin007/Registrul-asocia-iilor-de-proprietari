// src/app/api/avarii/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Rol } from "@prisma/client";
import { inregistreazaAudit } from "@/lib/audit";
import { cookies } from "next/headers";

function genNrInregistrare(): string {
  const d = new Date();
  return `AV-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}-${Math.floor(Math.random()*9000)+1000}`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ eroare: "Neautentificat" }, { status: 401 });

  const rol = session.user.rol as Rol;
  const { categorie, locatie, descriere, prioritate } = await req.json();

  if (!categorie || !locatie || !descriere) {
    return NextResponse.json({ eroare: "Câmpuri obligatorii lipsă" }, { status: 400 });
  }

  // Determinăm asociatieId
  const cookieStore = cookies();
  let asociatieId = cookieStore.get("asociatie_activa")?.value;

  if (!asociatieId) {
    if (rol === Rol.PROPRIETAR) {
      const prop = await prisma.proprietate.findFirst({
        where: { utilizatorId: session.user.id, activ: true },
        include: { apartament: { include: { bloc: true } } },
      });
      asociatieId = prop?.apartament.bloc.asociatieId;
    } else {
      const mandat = await prisma.mandat.findFirst({ where: { utilizatorId: session.user.id, activ: true } });
      asociatieId = mandat?.asociatieId;
    }
  }

  if (!asociatieId) return NextResponse.json({ eroare: "Nu aveți o asociație activă" }, { status: 400 });

  const avarie = await prisma.avarie.create({
    data: {
      asociatieId,
      numarInregistrare: genNrInregistrare(),
      categorie,
      locatie,
      descriere,
      stare: "DESCHISA",
      raportatDe: session.user.id,
    },
  });

  await inregistreazaAudit({
    utilizatorId: session.user.id, rol,
    tip: "CREARE", resursa: "Avarie",
    resursaId: avarie.id, asociatieId,
    avarieId: avarie.id,
    detalii: { categorie, locatie, prioritate },
  });

  return NextResponse.json({ succes: true, id: avarie.id });
}
