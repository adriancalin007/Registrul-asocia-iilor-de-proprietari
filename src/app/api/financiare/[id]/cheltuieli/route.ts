// src/app/api/financiare/[id]/cheltuieli/route.ts — Add / delete expense lines
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { z } from "zod";

const AllocationSchema = z.object({
  type:       z.enum(["BY_SHARE", "EQUAL", "BY_PERSON", "BY_AREA"]),
  percentage: z.number().positive().max(100),
});

const ExpenseSchema = z.object({
  category:         z.string().min(1),
  description:      z.string().min(1),
  totalAmount:      z.number().positive(),
  distributionType: z.enum(["BY_SHARE", "EQUAL", "BY_PERSON", "BY_AREA"]).default("BY_SHARE"),
  invoiceNumber:    z.string().optional(),
  invoiceDate:      z.string().optional(),
  invoiceId:        z.string().optional(),
  allocations:      z.array(AllocationSchema).optional(),
});

interface Params { params: { id: string } }

async function getPeriodIfEditable(periodId: string) {
  const period = await prisma.expensePeriod.findUnique({ where: { id: periodId } });
  if (!period || period.status === "ARCHIVED") return null;
  return period;
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (!([UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[]).includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const period = await getPeriodIfEditable(params.id);
  if (!period) return NextResponse.json({ error: "Period not found or archived" }, { status: 404 });

  const body = await req.json();
  const parsed = ExpenseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const { invoiceId, allocations, ...expenseData } = parsed.data;
  // If split allocations are provided, derive the primary distributionType from first entry
  const primaryType = allocations && allocations.length > 0
    ? allocations[0].type
    : expenseData.distributionType;

  const expense = await prisma.expense.create({
    data: {
      periodId: params.id,
      ...expenseData,
      distributionType: primaryType,
      invoiceDate: expenseData.invoiceDate ? new Date(expenseData.invoiceDate) : null,
      invoiceId:   invoiceId || null,
      allocations: allocations && allocations.length > 0 ? allocations : undefined,
    },
  });

  return NextResponse.json({ success: true, id: expense.id });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (!([UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[]).includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { expenseId } = await req.json();
  if (!expenseId) return NextResponse.json({ error: "expenseId required" }, { status: 400 });

  await prisma.expense.deleteMany({ where: { id: expenseId, periodId: params.id } });
  return NextResponse.json({ success: true });
}
