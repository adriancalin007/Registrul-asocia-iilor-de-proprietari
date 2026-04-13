// src/app/api/documente/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Rol } from "@prisma/client";
import { inregistreazaAudit } from "@/lib/audit";
import { cookies } from "next/headers";
import { z } from "zod";

const SchemaDocument = z.object({
  titlu: z.string().min(2, "Titlul este prea scurt"),
  categorie: z.string().min(1, "Categoria este obligatorie"),
  descriere: z.string().optional(),
  caleStocata: z.string().optional(),
  accesPublic: z.boolean().default(false),
  stare: z.enum(["DRAFT", "PUBLICAT", "ARHIVAT"]).default("DRAFT"),
  dataExpirare: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ eroare: "Neautentificat" }, { status: 401 });

  const rol = session.user.rol as Rol;
  if (rol !== Rol.ADMINISTRATOR && rol !== Rol.PRESEDINTE_CA && rol !== Rol.SUPER_ADMIN) {
    return NextResponse.json({ eroare: "Acces interzis" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = SchemaDocument.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ eroare: parsed.error.errors[0].message }, { status: 400 });
  }

  // Determinăm asociatieId
  const cookieStore = cookies();
  const asociatieActivaId = cookieStore.get("asociatie_activa")?.value;

  let asociatieId: string | undefined = asociatieActivaId;

  if (!asociatieId) {
    const mandat = await prisma.mandat.findFirst({
      where: { utilizatorId: session.user.id, activ: true },
    });
    asociatieId = mandat?.asociatieId;
  }

  if (!asociatieId) {
    return NextResponse.json({ eroare: "Nu aveți o asociație activă" }, { status: 400 });
  }

  const date = parsed.data;

  const document = await prisma.document.create({
    data: {
      asociatieId,
      titlu: date.titlu,
      categorie: date.categorie,
      descriere: date.descriere,
      caleStocata: date.caleStocata ?? "",
      accesPublic: date.accesPublic,
      stare: date.stare,
      dataExpirare: date.dataExpirare ? new Date(date.dataExpirare) : null,
      incarcatDe: session.user.id,
    },
  });

  await inregistreazaAudit({
    utilizatorId: session.user.id,
    rol,
    tip: "CREARE",
    resursa: "Document",
    resursaId: document.id,
    asociatieId,
    documentId: document.id,
    detalii: { titlu: document.titlu, categorie: document.categorie, stare: document.stare },
  });

  return NextResponse.json({ succes: true, id: document.id });
}
