// src/app/api/adeverinte/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Rol, TipAdeverinta } from "@prisma/client";
import { inregistreazaAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ eroare: "Neautentificat" }, { status: 401 });

  const rol = session.user.rol as Rol;
  if (rol !== Rol.PROPRIETAR) {
    return NextResponse.json({ eroare: "Doar proprietarii pot solicita adeverințe" }, { status: 403 });
  }

  const { tip } = await req.json();

  if (!Object.values(TipAdeverinta).includes(tip)) {
    return NextResponse.json({ eroare: "Tip adeverință invalid" }, { status: 400 });
  }

  // Găsim proprietatea activă
  const proprietate = await prisma.proprietate.findFirst({
    where: { utilizatorId: session.user.id, activ: true },
    include: { apartament: { include: { bloc: true } } },
  });

  if (!proprietate) {
    return NextResponse.json({ eroare: "Nu aveți o proprietate înregistrată" }, { status: 404 });
  }

  const asociatieId = proprietate.apartament.bloc.asociatieId;

  // Verificăm dacă nu există deja o solicitare activă de același tip
  const existenta = await prisma.adeverinta.findFirst({
    where: {
      proprietateId: proprietate.id,
      tip,
      stare: { in: ["SOLICITATA", "APROBATA"] },
    },
  });

  if (existenta) {
    return NextResponse.json(
      { eroare: "Aveți deja o solicitare activă pentru acest tip de adeverință" },
      { status: 409 }
    );
  }

  const adeverinta = await prisma.adeverinta.create({
    data: {
      asociatieId,
      proprietateId: proprietate.id,
      tip,
      stare: "SOLICITATA",
    },
  });

  await inregistreazaAudit({
    utilizatorId: session.user.id,
    rol,
    tip: "CREARE",
    resursa: "Adeverinta",
    resursaId: adeverinta.id,
    asociatieId,
    adeverintaId: adeverinta.id,
    detalii: { tip },
  });

  return NextResponse.json({ succes: true, id: adeverinta.id });
}
