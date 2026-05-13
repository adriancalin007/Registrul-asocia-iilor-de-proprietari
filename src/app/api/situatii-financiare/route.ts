import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, SituatieFinanciaraType, SituatieFinanciaraStatus } from "@prisma/client";
import { cookies } from "next/headers";
import { z } from "zod";

const CAN_SUBMIT: UserRole[] = [UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN];
const CAN_VIEW_ALL: UserRole[] = [UserRole.UAT_OPERATOR, UserRole.SUPER_ADMIN];
const ALL_VIEWERS: UserRole[] = [...CAN_SUBMIT, UserRole.AUDITOR, UserRole.UAT_OPERATOR, UserRole.SUPER_ADMIN];

async function resolveAssocId(userId: string, role: UserRole): Promise<string | null> {
  if (CAN_VIEW_ALL.includes(role)) return null;
  const cookieStore = cookies();
  const fromCookie = cookieStore.get("asociatie_activa")?.value;
  if (fromCookie) return fromCookie;
  if (role === UserRole.AUDITOR) {
    const mandate = await prisma.mandate.findFirst({ where: { userId, isActive: true } });
    return mandate?.associationId ?? null;
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
    const docs = await prisma.situatieFinanciara.findMany({
      where: operator ? { association: { uatId: operator.uatId } } : {},
      include: {
        association: { select: { name: true, id: true } },
        submitter: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(docs);
  }

  const assocId = await resolveAssocId(session.user.id, role);
  if (!assocId) return NextResponse.json([]);

  const docs = await prisma.situatieFinanciara.findMany({
    where: { associationId: assocId },
    include: { submitter: { select: { fullName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(docs);
}

const DOC_TYPES = Object.values(SituatieFinanciaraType);

const CreateSchema = z.object({
  type:                 z.enum(DOC_TYPES as [string, ...string[]]),
  year:                 z.number().int().min(2000).max(2100),
  period:               z.string().min(1).max(50),
  fileUrl:              z.string().url().optional(),
  fileSize:             z.number().int().positive().optional(),
  mimeType:             z.string().optional(),
  generatedFromPlatform: z.boolean().optional().default(false),
  notes:                z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (!CAN_SUBMIT.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const assocId = await resolveAssocId(session.user.id, role);
  if (!assocId) return NextResponse.json({ error: "Nu există o asociație activă" }, { status: 400 });

  const doc = await prisma.situatieFinanciara.create({
    data: {
      associationId:        assocId,
      submittedBy:          session.user.id,
      type:                 parsed.data.type as SituatieFinanciaraType,
      year:                 parsed.data.year,
      period:               parsed.data.period,
      fileUrl:              parsed.data.fileUrl,
      fileSize:             parsed.data.fileSize,
      mimeType:             parsed.data.mimeType,
      generatedFromPlatform: parsed.data.generatedFromPlatform,
      notes:                parsed.data.notes,
      status:               SituatieFinanciaraStatus.DRAFT,
    },
  });

  return NextResponse.json({ success: true, id: doc.id });
}
