import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

function genRegNumber(): string {
  const d = new Date();
  return `UAT-S1-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}-${Math.floor(Math.random()*9000)+1000}`;
}

// Accepts both a string URL or an object {url, name, path}
const FileOrUrl = z.union([
  z.string().url(),
  z.object({ url: z.string().url(), name: z.string().optional(), path: z.string().optional() }),
]);

const Schema = z.object({
  operatorRegistered: z.boolean().optional(),
  status: z.enum(["ACTIVE", "PENDING"]).optional(),
  name: z.string().min(3),
  fiscalCode: z.string().regex(/^\d{4,10}$/),
  address: z.string().min(3),
  neighborhood: z.string().min(1),
  registrationDocs: z.object({
    president: z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      email: z.string().email(),
      phone: z.string().min(6),
    }),
    structure: z.object({
      staircaseCount: z.number(),
      unitCount: z.number(),
    }),
    requiredDocuments: z.object({
      statute: FileOrUrl,
      courtRegistration: FileOrUrl,
      presidentMandate: FileOrUrl,
      presidentId: FileOrUrl,
    }),
    executiveCommittee: z.array(z.object({
      role: z.string().min(1),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      phone: z.string().optional(),
      email: z.string().optional(),
      idFile: FileOrUrl.optional(),
    })).min(2).max(6),
    gdprConsent: z.object({
      given: z.literal(true),
      timestamp: z.string(),
    }),
  }),
});

// Helper to extract URL string from file object or string
function extractUrl(val: unknown): string {
  if (typeof val === "string") return val;
  if (val && typeof val === "object" && "url" in val) return (val as {url: string}).url;
  return "";
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
      // Give a human-readable error
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
    const docs = registrationDocs.requiredDocuments;

    await prisma.association.create({
      data: {
        uatId: uat.id,
        name, fiscalCode, address, neighborhood,
        status: (parsed.data as {status?: string}).status ?? "PENDING",
        registrationDocs: {
          registrationNumber: regNumber,
          president: registrationDocs.president,
          structure: registrationDocs.structure,
          requiredDocuments: {
            statute: { url: extractUrl(docs.statute), ...(typeof docs.statute === "object" ? docs.statute : {}) },
            courtRegistration: { url: extractUrl(docs.courtRegistration), ...(typeof docs.courtRegistration === "object" ? docs.courtRegistration : {}) },
            presidentMandate: { url: extractUrl(docs.presidentMandate), ...(typeof docs.presidentMandate === "object" ? docs.presidentMandate : {}) },
            presidentId: { url: extractUrl(docs.presidentId), ...(typeof docs.presidentId === "object" ? docs.presidentId : {}) },
          },
          executiveCommittee: registrationDocs.executiveCommittee.map(m => ({
            ...m,
            idFile: m.idFile ? { url: extractUrl(m.idFile), ...(typeof m.idFile === "object" ? m.idFile : {}) } : null,
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
