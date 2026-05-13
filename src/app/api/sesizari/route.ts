import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, SesizareRouting } from "@prisma/client";
import { cookies } from "next/headers";
import { z } from "zod";

const CAN_SUBMIT: UserRole[] = [UserRole.OWNER, UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.AUDITOR];
const CAN_VIEW_ALL: UserRole[] = [UserRole.UAT_OPERATOR, UserRole.POLICE_OPERATOR, UserRole.SUPER_ADMIN];

async function resolveAssocId(userId: string, role: UserRole): Promise<string | null> {
  if (CAN_VIEW_ALL.includes(role)) return null;
  const cookieStore = cookies();
  const fromCookie = cookieStore.get("asociatie_activa")?.value;
  if (fromCookie) return fromCookie;
  if (role === UserRole.OWNER) {
    const ownership = await prisma.ownership.findFirst({ where: { userId, isActive: true } });
    return ownership?.unitId
      ? (await prisma.unit.findUnique({ where: { id: ownership.unitId }, select: { building: { select: { associationId: true } } } }))?.building.associationId ?? null
      : null;
  }
  const mandate = await prisma.mandate.findFirst({ where: { userId, isActive: true } });
  return mandate?.associationId ?? null;
}

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  const userId = session.user.id;

  if (CAN_VIEW_ALL.includes(role)) {
    const operator = await prisma.uATOperator.findUnique({ where: { userId }, select: { uatId: true } });
    const sesizari = await prisma.sesizare.findMany({
      where: operator ? { association: { uatId: operator.uatId } } : {},
      include: {
        submitter: { select: { fullName: true, email: true } },
        responder: { select: { fullName: true } },
        association: { select: { name: true, neighborhood: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(sesizari);
  }

  const assocId = await resolveAssocId(userId, role);
  if (!assocId) return NextResponse.json([]);

  const sesizari = await prisma.sesizare.findMany({
    where: { associationId: assocId },
    include: {
      submitter: { select: { fullName: true } },
      responder: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(sesizari);
}

const CATEGORIES = [
  "Ordine publică", "Fond locativ (părți comune)", "Sănătate și igienă",
  "Mediu și spații verzi", "Trafic și parcări", "Zgomot și perturbări",
  "Iluminat public", "Altele",
] as const;

const CreateSchema = z.object({
  title:       z.string().min(3).max(200),
  description: z.string().min(10),
  category:    z.string().min(1),
  routing:     z.enum(["UAT_GENERAL", "POLICE"]),
  photos:      z.array(z.string().url()).optional().default([]),
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

  const sesizare = await prisma.sesizare.create({
    data: {
      associationId: assocId,
      submittedBy:   session.user.id,
      title:         parsed.data.title,
      description:   parsed.data.description,
      category:      parsed.data.category,
      routing:       parsed.data.routing as SesizareRouting,
      photos:        parsed.data.photos,
    },
  });

  return NextResponse.json({ success: true, id: sesizare.id });
}

export { CATEGORIES };
