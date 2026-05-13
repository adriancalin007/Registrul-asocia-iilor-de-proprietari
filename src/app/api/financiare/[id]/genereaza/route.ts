// src/app/api/financiare/[id]/genereaza/route.ts
// Distributes all expenses to ownerships and creates PaymentItem rows.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, DistributionType } from "@prisma/client";

interface Params { params: { id: string } }

type Allocation = { type: string; percentage: number };

function distribute(
  amount: number,
  distType: string,
  o: OwnershipEntry,
  totals: { shareRatio: number; residents: number; area: number; units: number; count: number },
): number {
  if (distType === DistributionType.BY_SHARE) {
    return totals.shareRatio > 0 ? (o.shareRatio / totals.shareRatio) * amount : amount / totals.count;
  }
  if (distType === DistributionType.EQUAL) {
    return totals.units > 0 ? amount / totals.units : amount / totals.count;
  }
  if (distType === DistributionType.BY_PERSON) {
    return totals.residents > 0 ? (o.residents / totals.residents) * amount : amount / totals.count;
  }
  if (distType === DistributionType.BY_AREA) {
    return totals.area > 0 ? (o.area / totals.area) * amount : amount / totals.count;
  }
  return amount / totals.count;
}

type OwnershipEntry = {
  ownershipId: string;
  unitId: string;
  shareRatio: number;
  residents: number;
  area: number;
};

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (!([UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[]).includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const period = await prisma.expensePeriod.findUnique({
    where: { id: params.id },
    include: {
      expenses: true,
      association: {
        include: {
          buildings: {
            include: {
              units: {
                include: {
                  ownerships: { where: { isActive: true }, include: { user: { select: { fullName: true } } } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!period) return NextResponse.json({ error: "Period not found" }, { status: 404 });
  if (period.status === "ARCHIVED") return NextResponse.json({ error: "Period is archived" }, { status: 400 });
  if (period.expenses.length === 0) return NextResponse.json({ error: "No expenses to distribute" }, { status: 400 });

  // Flatten all active ownerships with their unit info
  const ownerships: OwnershipEntry[] = [];
  for (const building of period.association.buildings) {
    for (const unit of building.units) {
      for (const ownership of unit.ownerships) {
        ownerships.push({
          ownershipId: ownership.id,
          unitId:      unit.id,
          shareRatio:  unit.shareRatio ?? 0,
          residents:   unit.residents ?? 1,
          area:        unit.area ?? 0,
        });
      }
    }
  }

  if (ownerships.length === 0) {
    return NextResponse.json({ error: "No active owners in this association" }, { status: 400 });
  }

  const totals = {
    shareRatio: ownerships.reduce((s, o) => s + o.shareRatio, 0),
    residents:  ownerships.reduce((s, o) => s + o.residents,  0),
    area:       ownerships.reduce((s, o) => s + o.area,       0),
    units:      new Set(ownerships.map(o => o.unitId)).size,
    count:      ownerships.length,
  };

  // Calculate each ownership's share per expense
  const shareMap = new Map<string, number>(); // ownershipId → amount
  ownerships.forEach(o => shareMap.set(o.ownershipId, 0));

  for (const expense of period.expenses) {
    const rawAllocations = expense.allocations as Allocation[] | null;
    const allocations = rawAllocations && rawAllocations.length > 0 ? rawAllocations : null;

    for (const o of ownerships) {
      let share = 0;
      const amount = expense.totalAmount;

      if (allocations) {
        // Split distribution — each allocation covers its percentage of the total
        for (const alloc of allocations) {
          const partial = amount * (alloc.percentage / 100);
          share += distribute(partial, alloc.type, o, totals);
        }
      } else {
        // Single distribution type (legacy + simple cases)
        share = distribute(amount, expense.distributionType, o, totals);
      }

      shareMap.set(o.ownershipId, (shareMap.get(o.ownershipId) ?? 0) + share);
    }
  }

  // Find previous month's period to carry over debt
  const prevMonth = period.month === 1 ? 12 : period.month - 1;
  const prevYear  = period.month === 1 ? period.year - 1 : period.year;
  const prevPeriod = await prisma.expensePeriod.findUnique({
    where: { associationId_year_month: { associationId: period.associationId, year: prevYear, month: prevMonth } },
    include: { paymentItems: true },
  });

  const prevDebtMap = new Map<string, number>(); // ownershipId → outstanding
  if (prevPeriod) {
    for (const item of prevPeriod.paymentItems) {
      const outstanding = item.totalDue - item.paidAmount;
      if (outstanding > 0.005) prevDebtMap.set(item.ownershipId, outstanding);
    }
  }

  // Delete existing PaymentItems for this period (allow regeneration)
  await prisma.paymentItem.deleteMany({ where: { periodId: params.id } });

  // Create PaymentItems in a transaction
  await prisma.$transaction(
    ownerships.map(o => {
      const unitAmount   = Math.round((shareMap.get(o.ownershipId) ?? 0) * 100) / 100;
      const previousDebt = Math.round((prevDebtMap.get(o.ownershipId) ?? 0) * 100) / 100;
      const totalDue     = Math.round((unitAmount + previousDebt) * 100) / 100;
      return prisma.paymentItem.create({
        data: {
          periodId:    params.id,
          ownershipId: o.ownershipId,
          unitAmount,
          previousDebt,
          totalDue,
          status: "PENDING",
        },
      });
    })
  );

  // Update period status
  await prisma.expensePeriod.update({
    where: { id: params.id },
    data: { status: "FINALIZED", generatedAt: new Date() },
  });

  return NextResponse.json({ success: true, count: ownerships.length });
}
