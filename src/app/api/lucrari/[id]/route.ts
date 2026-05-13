// src/app/api/lucrari/[id]/route.ts — Get detail, update status
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, RFQStatus } from "@prisma/client";

const MANAGER_ROLES = [UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[];
interface Params { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rfq = await prisma.rFQ.findUnique({
    where: { id: params.id },
    include: {
      issue: { select: { ticketNumber: true, category: true, location: true, description: true } },
      quotes: {
        include: {
          supplier: { select: { id: true, companyName: true, fiscalCode: true, phone: true, email: true } },
        },
        orderBy: { price: "asc" },
      },
    },
  });

  if (!rfq) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rfq);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!MANAGER_ROLES.includes(session.user.role as UserRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  const rfq = await prisma.rFQ.update({
    where: { id: params.id },
    data: {
      status:           body.status           ?? undefined,
      awardedSupplierId: body.awardedSupplierId ?? undefined,
      awardReason:      body.awardReason       ?? undefined,
      awardedAt:        body.awardedSupplierId ? new Date() : undefined,
    },
  });

  return NextResponse.json({ success: true, rfq });
}
