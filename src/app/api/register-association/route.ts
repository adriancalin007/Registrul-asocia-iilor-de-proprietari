import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { z } from "zod";

function genRegNumber(): string {
  const d = new Date();
  return `UAT-S1-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}-${Math.floor(Math.random()*9000)+1000}`;
}

// Accept a string URL (possibly empty) or an upload result object
const FileOrUrl = z.union([
  z.string(),
  z.object({ url: z.string(), name: z.string().optional(), path: z.string().optional() }),
]);

const PersonSchema = z.object({
  entityType: z.enum(["individual", "company"]).default("individual"),
  firstName:     z.string().optional(),
  lastName:      z.string().optional(),
  companyName:   z.string().optional(),
  cui:           z.string().optional(),
  address:       z.string().optional(),
  representative:z.string().optional(),
  email:         z.string().optional(),
  phone:         z.string().optional(),
  idUrl:         FileOrUrl.optional(),
  cuiUrl:        FileOrUrl.optional(),
});

const Schema = z.object({
  operatorRegistered: z.boolean().optional(),
  status: z.enum(["ACTIVE", "PENDING"]).optional(),
  name:         z.string().min(3),
  fiscalCode:   z.string().regex(/^\d{4,10}$/),
  address:      z.string().min(3),
  neighborhood: z.string().min(1),
  registrationDocs: z.object({
    president: z.object({
      entityType:  z.enum(["individual", "company"]).default("individual"),
      firstName:   z.string().min(1),
      lastName:    z.string().min(1),
      email:       z.string().optional(),
      phone:       z.string().optional(),
      idUrl:       FileOrUrl.optional(),
    }),
    administrator: PersonSchema.optional(),
    cenzor:        PersonSchema.optional(),
    structure: z.object({
      staircaseCount: z.number(),
      unitCount:      z.number(),
    }),
    requiredDocuments: z.record(FileOrUrl).optional().default({}),
    executiveCommittee: z.array(z.object({
      role:      z.string().min(1),
      firstName: z.string().min(1),
      lastName:  z.string().min(1),
      phone:     z.string().optional(),
      email:     z.string().optional(),
      idFile:    FileOrUrl.optional(),
    })).min(2).max(6),
    gdprConsent: z.object({
      given:     z.literal(true),
      timestamp: z.string(),
    }),
  }),
});

function extractUrl(val: unknown): string {
  if (typeof val === "string") return val;
  if (val && typeof val === "object" && "url" in val) return (val as {url: string}).url;
  return "";
}

function normalizeFile(val: unknown): { url: string; name?: string; path?: string } | null {
  if (!val) return null;
  const url = extractUrl(val);
  if (!url) return null;
  if (typeof val === "object") return val as { url: string; name?: string; path?: string };
  return { url };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = Schema.safeParse({
      ...body,
      fiscalCode: body.fiscalCode?.replace(/\s/g, ""),
    });

    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      const fieldPath = firstError.path.join(" → ");
      const msg = fieldPath
        ? `Câmp invalid: ${fieldPath} — ${firstError.message}`
        : firstError.message;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { name, fiscalCode, address, neighborhood, registrationDocs } = parsed.data;

    const existing = await prisma.association.findUnique({ where: { fiscalCode } });
    if (existing) {
      return NextResponse.json(
        { error: "O asociație cu acest cod fiscal este deja înregistrată în platformă." },
        { status: 409 }
      );
    }

    const uat = await prisma.uAT.findFirst();
    if (!uat) return NextResponse.json({ error: "Eroare de configurare platformă." }, { status: 500 });

    const regNumber = genRegNumber();
    const docs = registrationDocs.requiredDocuments ?? {};

    // Normalize all required document values
    const normalizedDocs: Record<string, { url: string; name?: string; path?: string } | null> = {};
    for (const [k, v] of Object.entries(docs)) {
      normalizedDocs[k] = normalizeFile(v);
    }

    await prisma.association.create({
      data: {
        uatId: uat.id,
        name, fiscalCode, address, neighborhood,
        status: (parsed.data.status ?? "PENDING") as "ACTIVE" | "PENDING",
        registrationDocs: {
          registrationNumber: regNumber,
          president:    registrationDocs.president,
          administrator:registrationDocs.administrator ?? null,
          cenzor:       registrationDocs.cenzor ?? null,
          structure:    registrationDocs.structure,
          requiredDocuments: normalizedDocs,
          executiveCommittee: registrationDocs.executiveCommittee.map(m => ({
            ...m,
            idFile: normalizeFile(m.idFile),
          })),
          gdprConsent: registrationDocs.gdprConsent,
        },
      },
    });

    return NextResponse.json({ success: true, registrationNumber: regNumber });
  } catch (err) {
    console.error("[REGISTER-ASSOCIATION]", err);
    return NextResponse.json({ error: "Eroare internă de server. Încercați din nou." }, { status: 500 });
  }
}
