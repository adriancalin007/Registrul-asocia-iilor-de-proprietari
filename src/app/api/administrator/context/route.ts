// src/app/api/administrator/context/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Rol } from "@prisma/client";
import { inregistreazaAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ eroare: "Neautentificat" }, { status: 401 });

  const rol = session.user.rol as Rol;
  if (![Rol.ADMINISTRATOR, Rol.PRESEDINTE_CA, Rol.SUPER_ADMIN].includes(rol)) {
    return NextResponse.json({ eroare: "Acces interzis" }, { status: 403 });
  }

  const { asociatieId } = await req.json();
  if (!asociatieId) return NextResponse.json({ eroare: "asociatieId lipsă" }, { status: 400 });

  if (rol !== Rol.SUPER_ADMIN) {
    const mandat = await prisma.mandat.findFirst({
      where: { utilizatorId: session.user.id, asociatieId, activ: true },
    });
    if (!mandat) return NextResponse.json({ eroare: "Fără mandat activ" }, { status: 403 });
  }

  const asociatie = await prisma.asociatie.findUnique({ where: { id: asociatieId } });
  if (!asociatie || asociatie.stare !== "ACTIVA") {
    return NextResponse.json({ eroare: "Asociația nu este activă" }, { status: 400 });
  }

  await inregistreazaAudit({
    utilizatorId: session.user.id,
    rol,
    tip: "SCHIMBARE_CONTEXT",
    resursa: "Asociatie",
    resursaId: asociatieId,
    asociatieId,
    detalii: { denumire: asociatie.denumire },
  });

  const response = NextResponse.json({ succes: true, asociatie: asociatie.denumire });
  response.cookies.set("admin_context_asociatie", asociatieId, {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 8 * 60 * 60,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ succes: true });
  response.cookies.delete("admin_context_asociatie");
  return response;
}
