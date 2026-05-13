// src/app/api/financiare/[id]/plata/route.ts — Record a payment for a PaymentItem
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, PaymentStatus } from "@prisma/client";
import { z } from "zod";

const PaymentSchema = z.object({
  paymentItemId: z.string().min(1),
  amount: z.number().nonnegative(),
  notes: z.string().optional(),
});

interface Params { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (!([UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[]).includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = PaymentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const { paymentItemId, amount, notes } = parsed.data;

  const item = await prisma.paymentItem.findUnique({
    where: { id: paymentItemId },
  });
  if (!item || item.periodId !== params.id) {
    return NextResponse.json({ error: "Payment item not found" }, { status: 404 });
  }

  const newPaid = Math.round((item.paidAmount + amount) * 100) / 100;
  const capped  = Math.min(newPaid, item.totalDue);

  let status: PaymentStatus;
  if (capped <= 0) {
    status = PaymentStatus.PENDING;
  } else if (capped >= item.totalDue - 0.005) {
    status = PaymentStatus.PAID;
  } else {
    status = PaymentStatus.PARTIAL;
  }

  const updated = await prisma.paymentItem.update({
    where: { id: paymentItemId },
    data: {
      paidAmount: capped,
      paidAt: status === PaymentStatus.PAID ? new Date() : item.paidAt,
      status,
      notes: notes ?? item.notes,
    },
  });

  return NextResponse.json({ success: true, item: updated });
}

// Reset payment (set paidAmount back to 0)
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (!([UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[]).includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { paymentItemId } = await req.json();
  if (!paymentItemId) return NextResponse.json({ error: "paymentItemId required" }, { status: 400 });

  const item = await prisma.paymentItem.findUnique({ where: { id: paymentItemId } });
  if (!item || item.periodId !== params.id) {
    return NextResponse.json({ error: "Payment item not found" }, { status: 404 });
  }

  await prisma.paymentItem.update({
    where: { id: paymentItemId },
    data: { paidAmount: 0, paidAt: null, status: PaymentStatus.PENDING, notes: null },
  });

  return NextResponse.json({ success: true });
}
