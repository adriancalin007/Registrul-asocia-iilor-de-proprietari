// src/app/api/inregistrare/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AssociationStatus } from "@prisma/client";
import { z } from "zod";

const MemberSchema = z.object({
  functie: z.string().min(1),
  nume: z.string().min(2),
  telefon: z.string().optional(),
  email: z.string().optional(),
  ciUrl: z.string().min(1),
});

const RegistrationSchema = z.object({
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
  membriComitet: z.array(MemberSchema).min(2).max(6),
  acordGDPR: z.boolean().refine((v) => v === true),
});

function genTicketNumber(): string {
  const d = new Date();
  return `UAT-S1-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 9000) + 1000}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegistrationSchema.safeParse({
      ...body,
      codFiscal: body.codFiscal?.replace(/\s/g, ""),
    });

    if (!parsed.success) {
      return NextResponse.json({ eroare: parsed.error.errors[0].message }, { status: 400 });
    }

    const data = parsed.data;

    const existing = await prisma.association.findUnique({ where: { fiscalCode: data.codFiscal } });
    if (existing) {
      return NextResponse.json({ eroare: "O asociație cu acest cod fiscal este deja înregistrată." }, { status: 409 });
    }

    const uat = await prisma.uAT.findFirst();
    if (!uat) {
      return NextResponse.json({ eroare: "Eroare de configurare a platformei." }, { status: 500 });
    }

    const ticketNumber = genTicketNumber();

    await prisma.association.create({
      data: {
        uatId: uat.id,
        name: data.denumire,
        fiscalCode: data.codFiscal,
        address: data.adresa,
        neighborhood: data.cartier,
        status: AssociationStatus.PENDING,
        registrationDocs: {
          ticketNumber,
          president: {
            name: data.numeReprezentant,
            email: data.emailReprezentant,
            phone: data.telefonReprezentant,
          },
          structure: {
            buildingCount: parseInt(data.nrBlocuri) || 1,
            unitCount: parseInt(data.nrApartamente) || 0,
          },
          requiredDocs: {
            statute: data.docStatut,
            courtRegistration: data.docInregistrareJudecatorie,
            presidentMandate: data.docMandatPresedinte,
            presidentId: data.docCIPresedinte,
          },
          committee: data.membriComitet.map((m) => ({
            role: m.functie,
            name: m.nume,
            phone: m.telefon ?? "",
            email: m.email ?? "",
            idUrl: m.ciUrl,
          })),
          gdprConsent: {
            given: true,
            timestamp: new Date().toISOString(),
          },
        },
      },
    });

    return NextResponse.json({ succes: true, nrInregistrare: ticketNumber });
  } catch (error) {
    console.error("[INREGISTRARE]", error);
    return NextResponse.json({ eroare: "A apărut o eroare internă." }, { status: 500 });
  }
}
