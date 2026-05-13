// src/app/api/financiare/route.ts — List or create expense periods
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { cookies } from "next/headers";

async function resolveAssociationId(userId: string, role: UserRole): Promise<string | null> {
  const cookieStore = cookies();
  let associationId: string | null = cookieStore.get("asociatie_activa")?.value ?? null;
  if (!associationId) {
    if (role === UserRole.OWNER) {
      const ownership = await prisma.ownership.findFirst({
        where: { userId, isActive: true },
        include: { unit: { include: { building: true } } },
      });
      associationId = ownership?.unit.building.associationId ?? null;
    } else {
      const mandate = await prisma.mandate.findFirst({ where: { userId, isActive: true } });
      associationId = mandate?.associationId ?? null;
    }
  }
  return associationId;
}

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (!([UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[]).includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const associationId = await resolveAssociationId(session.user.id, role);
  if (!associationId) return NextResponse.json({ error: "No active association" }, { status: 400 });

  const periods = await prisma.expensePeriod.findMany({
    where: { associationId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: {
      _count: { select: { expenses: true, paymentItems: true } },
      expenses: { select: { totalAmount: true } },
      paymentItems: { select: { totalDue: true, paidAmount: true } },
    },
  });

  const result = periods.map(p => ({
    id: p.id,
    year: p.year,
    month: p.month,
    status: p.status,
    notes: p.notes,
    generatedAt: p.generatedAt,
    createdAt: p.createdAt,
    expenseCount: p._count.expenses,
    ownerCount: p._count.paymentItems,
    totalExpenses: p.expenses.reduce((s, e) => s + e.totalAmount, 0),
    totalDue: p.paymentItems.reduce((s, i) => s + i.totalDue, 0),
    totalPaid: p.paymentItems.reduce((s, i) => s + i.paidAmount, 0),
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (!([UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[]).includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { year, month, notes } = await req.json();
  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid year or month" }, { status: 400 });
  }

  const associationId = await resolveAssociationId(session.user.id, role);
  if (!associationId) return NextResponse.json({ error: "No active association" }, { status: 400 });

  const existing = await prisma.expensePeriod.findUnique({
    where: { associationId_year_month: { associationId, year, month } },
  });
  if (existing) return NextResponse.json({ error: "Period already exists", id: existing.id }, { status: 409 });

  const period = await prisma.expensePeriod.create({
    data: { associationId, year, month, notes, createdBy: session.user.id },
  });

  return NextResponse.json({ success: true, id: period.id });
}
