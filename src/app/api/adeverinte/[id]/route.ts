// src/app/api/adeverinte/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Rol } from "@prisma/client";
import { inregistreazaAudit } from "@/lib/audit";

interface Params { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ eroare: "Neautentificat" }, { status: 401 });

  const rol = session.user.rol as Rol;
  if (rol !== Rol.ADMINISTRATOR && rol !== Rol.PRESEDINTE_CA && rol !== Rol.SUPER_ADMIN) {
    return NextResponse.json({ eroare: "Acces interzis" }, { status: 403 });
  }

  const { actiune, observatii } = await req.json();

  if (!["APROBA", "RESPINGE", "EMITE"].includes(actiune)) {
    return NextResponse.json({ eroare: "Acțiune invalidă" }, { status: 400 });
  }

  const adeverinta = await prisma.adeverinta.findUnique({
    where: { id: params.id },
    include: {
      proprietate: {
        include: {
          utilizator: { select: { numeComplet: true } },
          apartament: {
            include: { bloc: { include: { asociatie: true } } },
          },
        },
      },
    },
  });

  if (!adeverinta) {
    return NextResponse.json({ eroare: "Adeverință negăsită" }, { status: 404 });
  }

  let stareNoua: string;
  let calePDF: string | undefined;

  if (actiune === "APROBA") {
    stareNoua = "APROBATA";
  } else if (actiune === "RESPINGE") {
    if (!observatii?.trim()) {
      return NextResponse.json({ eroare: "Motivul respingerii este obligatoriu" }, { status: 400 });
    }
    stareNoua = "RESPINSA";
  } else {
    // EMITE — generăm referința PDF (în producție aici ar fi generarea reală)
    stareNoua = "EMISA";
    // Generăm un ID unic pentru PDF
    // În faza 2 aceasta va fi o rută care generează PDF real
    calePDF = `/adeverinte/${adeverinta.id}/pdf`;
  }

  await prisma.adeverinta.update({
    where: { id: params.id },
    data: {
      stare: stareNoua as "APROBATA" | "RESPINSA" | "EMISA",
      observatii: observatii ?? null,
      aprobatDe: session.user.id,
      dataEmitere: actiune === "EMITE" ? new Date() : null,
      dataExpirare: actiune === "EMITE"
        ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 zile
        : null,
      calePDF: calePDF ?? null,
    },
  });

  await inregistreazaAudit({
    utilizatorId: session.user.id,
    rol,
    tip: actiune === "RESPINGE" ? "RESPINGERE" : "APROBARE",
    resursa: "Adeverinta",
    resursaId: adeverinta.id,
    asociatieId: adeverinta.asociatieId,
    adeverintaId: adeverinta.id,
    detalii: { actiune, tip: adeverinta.tip, observatii },
  });

  return NextResponse.json({ succes: true, stare: stareNoua });
}
