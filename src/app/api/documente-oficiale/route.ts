import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, DocumentOficialType } from "@prisma/client";
import { cookies } from "next/headers";
import { z } from "zod";

const CAN_UPLOAD: UserRole[] = [UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN];
const CAN_VIEW_ALL: UserRole[] = [UserRole.UAT_OPERATOR, UserRole.SUPER_ADMIN];
const ALL_VIEWERS: UserRole[] = [...CAN_UPLOAD, UserRole.AUDITOR, UserRole.OWNER, UserRole.UAT_OPERATOR, UserRole.POLICE_OPERATOR, UserRole.SUPER_ADMIN];

async function resolveAssocId(userId: string, role: UserRole): Promise<string | null> {
  if (CAN_VIEW_ALL.includes(role)) return null;
  const cookieStore = cookies();
  const fromCookie = cookieStore.get("asociatie_activa")?.value;
  if (fromCookie) return fromCookie;
  if (role === UserRole.OWNER) {
    const ownership = await prisma.ownership.findFirst({ where: { userId, isActive: true } });
    if (!ownership) return null;
    const unit = await prisma.unit.findUnique({ where: { id: ownership.unitId }, select: { building: { select: { associationId: true } } } });
    return unit?.building.associationId ?? null;
  }
  const mandate = await prisma.mandate.findFirst({ where: { userId, isActive: true } });
  return mandate?.associationId ?? null;
}

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (!ALL_VIEWERS.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (CAN_VIEW_ALL.includes(role)) {
    const operator = await prisma.uATOperator.findUnique({ where: { userId: session.user.id }, select: { uatId: true } });
    const docs = await prisma.documentOficial.findMany({
      where: operator ? { association: { uatId: operator.uatId } } : {},
      include: {
        association: { select: { name: true, id: true } },
        uploader: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(docs);
  }

  const assocId = await resolveAssocId(session.user.id, role);
  if (!assocId) return NextResponse.json([]);

  const docs = await prisma.documentOficial.findMany({
    where: { associationId: assocId },
    include: { uploader: { select: { fullName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(docs);
}

const DOC_TYPES = Object.values(DocumentOficialType);

const CreateSchema = z.object({
  type:     z.enum(DOC_TYPES as [string, ...string[]]),
  title:    z.string().min(3).max(200),
  fileUrl:  z.string().url(),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().optional(),
  notes:    z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (!CAN_UPLOAD.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const assocId = await resolveAssocId(session.user.id, role);
  if (!assocId) return NextResponse.json({ error: "Nu există o asociație activă" }, { status: 400 });

  const doc = await prisma.documentOficial.create({
    data: {
      associationId: assocId,
      uploadedBy:    session.user.id,
      type:          parsed.data.type as DocumentOficialType,
      title:         parsed.data.title,
      fileUrl:       parsed.data.fileUrl,
      fileSize:      parsed.data.fileSize,
      mimeType:      parsed.data.mimeType,
      notes:         parsed.data.notes,
    },
  });

  // Notify UAT operators for this association
  const assoc = await prisma.association.findUnique({ where: { id: assocId }, select: { uatId: true, name: true } });
  if (assoc) {
    const operators = await prisma.uATOperator.findMany({
      where: { uatId: assoc.uatId },
      select: { userId: true },
    });
    await prisma.notification.createMany({
      data: operators.map(op => ({
        recipientId:   op.userId,
        associationId: assocId,
        channel:       "IN_APP" as const,
        title:         "Document oficial nou",
        body:          `Asociația ${assoc.name} a adăugat un document oficial nou (${parsed.data.title}) și necesită aprobare.`,
      })),
    });
  }

  return NextResponse.json({ success: true, id: doc.id });
}
