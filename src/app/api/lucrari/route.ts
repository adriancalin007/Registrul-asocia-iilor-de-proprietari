// src/app/api/lucrari/route.ts — List and create works (RFQ)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, RFQStatus } from "@prisma/client";
import { cookies } from "next/headers";
import { z } from "zod";

const MANAGER_ROLES = [UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[];
const VIEWER_ROLES  = [UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.AUDITOR, UserRole.UAT_OPERATOR, UserRole.SUPER_ADMIN] as UserRole[];

async function resolveAssocId(userId: string) {
  const cookieStore = cookies();
  const fromCookie = cookieStore.get("asociatie_activa")?.value ?? null;
  if (fromCookie) return fromCookie;
  const mandate = await prisma.mandate.findFirst({ where: { userId, isActive: true } });
  return mandate?.associationId ?? null;
}

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!VIEWER_ROLES.includes(session.user.role as UserRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const assocId = await resolveAssocId(session.user.id);
  if (!assocId) return NextResponse.json({ error: "No active association" }, { status: 400 });

  const rfqs = await prisma.rFQ.findMany({
    where: { associationId: assocId },
    orderBy: { createdAt: "desc" },
    include: {
      issue: { select: { ticketNumber: true, category: true, location: true } },
      _count: { select: { quotes: true } },
    },
  });

  return NextResponse.json(rfqs);
}

const CreateRFQSchema = z.object({
  title:          z.string().min(3),
  description:    z.string().min(10),
  categories:     z.array(z.string()).default([]),
  estimatedValue: z.number().positive().optional(),
  quotingDeadline: z.string(),
  issueId:        z.string().optional(),
  photos:         z.array(z.string()).default([]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!MANAGER_ROLES.includes(session.user.role as UserRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const assocId = await resolveAssocId(session.user.id);
  if (!assocId) return NextResponse.json({ error: "No active association" }, { status: 400 });

  const parsed = CreateRFQSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const { quotingDeadline, issueId, photos, ...rest } = parsed.data;

  const rfq = await prisma.rFQ.create({
    data: {
      associationId:   assocId,
      publishedBy:     session.user.id,
      status:          RFQStatus.PUBLISHED,
      quotingDeadline: new Date(quotingDeadline),
      issueId:         issueId ?? null,
      photos:          photos,
      ...rest,
    },
  });

  return NextResponse.json({ success: true, id: rfq.id });
}
