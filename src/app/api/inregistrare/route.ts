// src/app/api/inregistrare/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const SchemaMembru = z.object({
  functie: z.string().min(1),
  nume: z.string().min(2),
  telefon: z.string().optional(),
  email: z.string().optional(),
  ciUrl: z.string().min(1),
});

const SchemaInregistrare = z.object({
  denumire: z.string().min(3),
  codFiscal: z.string().regex(/^\d{4,10}$/),
  adresa: z.string().min(5),
  cartier: z.string().min(1),
  numeReprezentant: z.string().min(3),
  emailReprezentant: z.string().email(),
  telefonReprezentant: z.string().min(10),
  nrBlocuri: z.string(),
  nrApartamente: z.string().min(1),
  docStatut: z.string().url("Link statut invalid"),
  docInregistrareJudecatorie: z.string().url("Link dosar judecătorie invalid"),
  docMandatPresedinte: z.string().url("Link mandat invalid"),
  docCIPresedinte: z.string().url("Link CI invalid"),
  membriComitet: z.array(SchemaMembru).min(2).max(6),
  acordGDPR: z.boolean().refine((v) => v === true),
});

function genereazaNrInregistrare(): string {
  const data = new Date();
  const an = data.getFullYear();
  const luna = String(data.getMonth() + 1).padStart(2, "0");
  const zi = String(data.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `UAT-S1-${an}${luna}${zi}-${random}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = SchemaInregistrare.safeParse({
      ...body,
      codFiscal: body.codFiscal?.replace(/\s/g, ""),
    });

    if (!parsed.success) {
      return NextResponse.json({ eroare: parsed.error.errors[0].message }, { status: 400 });
    }

    const date = parsed.data;

    const existent = await prisma.asociatie.findUnique({ where: { codFiscal: date.codFiscal } });
    if (existent) {
      return NextResponse.json({ eroare: "O asociație cu acest cod fiscal este deja înregistrată." }, { status: 409 });
    }

    const uat = await prisma.uAT.findFirst();
    if (!uat) {
      return NextResponse.json({ eroare: "Eroare de configurare a platformei." }, { status: 500 });
    }

    const nrInregistrare = genereazaNrInregistrare();

    await prisma.asociatie.create({
      data: {
        uatId: uat.id,
        denumire: date.denumire,
        codFiscal: date.codFiscal,
        adresa: date.adresa,
        cartier: date.cartier,
        stare: "IN_ASTEPTARE",
        altDocumente: {
          nrInregistrare,
          presedinte: {
            nume: date.numeReprezentant,
            email: date.emailReprezentant,
            telefon: date.telefonReprezentant,
          },
          structura: {
            nrBlocuri: parseInt(date.nrBlocuri) || 1,
            nrApartamente: parseInt(date.nrApartamente) || 0,
          },
          acteObligatorii: {
            statut: date.docStatut,
            inregistrareJudecatorie: date.docInregistrareJudecatorie,
            mandatPresedinte: date.docMandatPresedinte,
            ciPresedinte: date.docCIPresedinte,
          },
          comitetExecutiv: date.membriComitet.map((m) => ({
            functie: m.functie,
            nume: m.nume,
            telefon: m.telefon ?? "",
            email: m.email ?? "",
            ciUrl: m.ciUrl,
          })),
          acordGDPR: {
            dat: true,
            timestamp: new Date().toISOString(),
          },
        },
      },
    });

    return NextResponse.json({ succes: true, nrInregistrare });
  } catch (error) {
    console.error("[INREGISTRARE]", error);
    return NextResponse.json({ eroare: "A apărut o eroare internă." }, { status: 500 });
  }
}
