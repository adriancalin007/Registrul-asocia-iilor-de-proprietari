// src/app/api/public/doc-submissions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { SubmitterRole, AssociationStatus } from "@prisma/client";

const CreateSchema = z.object({
  associationId:   z.string().min(1),
  submitterName:   z.string().min(2),
  submitterEmail:  z.string().email(),
  submitterPhone:  z.string().optional(),
  submitterRole:   z.nativeEnum(SubmitterRole),
  notes:           z.string().optional(),
});

const PUBLIC_STATUSES: AssociationStatus[] = [
  AssociationStatus.ACTIVE,
  AssociationStatus.OFFICIAL_REGISTRY,
];

export async function POST(req: NextRequest) {
  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { associationId, submitterName, submitterEmail, submitterPhone, submitterRole, notes } = parsed.data;

  const association = await prisma.association.findFirst({
    where: { id: associationId, status: { in: PUBLIC_STATUSES } },
    select: { id: true },
  });
  if (!association) {
    return NextResponse.json({ error: "Asociația nu a fost găsită." }, { status: 404 });
  }

  const submission = await prisma.docSubmission.create({
    data: {
      associationId,
      submitterName,
      submitterEmail,
      submitterPhone: submitterPhone ?? null,
      submitterRole,
      notes: notes ?? null,
      // tokenExpiresAt defaults via DB expression (30 days)
    },
    select: { id: true, completionToken: true, tokenExpiresAt: true },
  });

  return NextResponse.json({
    id:    submission.id,
    token: submission.completionToken,
    expiresAt: submission.tokenExpiresAt,
  }, { status: 201 });
}
