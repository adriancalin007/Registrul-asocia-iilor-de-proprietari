// src/app/api/rapoarte/asociatii/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

function canViewReports(role: UserRole) {
  return role === UserRole.MANAGER || role === UserRole.BOARD_PRESIDENT
    || role === UserRole.AUDITOR || role === UserRole.UAT_OPERATOR
    || role === UserRole.SUPER_ADMIN;
}

type AssocRow = {
  association_id: string;
  association_name: string;
  unit_count: bigint;
  avg_monthly_cost: number | null;
  pct_debtors: number | null;
  total_outstanding: number;
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (!canViewReports(role)) return NextResponse.json({ error: "Acces interzis" }, { status: 403 });

  const sp = new URL(req.url).searchParams;
  const yearFrom  = parseInt(sp.get("yearFrom")  ?? "2026");
  const monthFrom = parseInt(sp.get("monthFrom") ?? "1");
  const yearTo    = parseInt(sp.get("yearTo")    ?? "2026");
  const monthTo   = parseInt(sp.get("monthTo")   ?? "12");

  let scopeAssocIds: string[] | null = null;
  if (role === UserRole.MANAGER || role === UserRole.BOARD_PRESIDENT || role === UserRole.AUDITOR) {
    const mandates = await prisma.mandate.findMany({
      where: { userId: session.user.id, isActive: true },
      select: { associationId: true },
    });
    scopeAssocIds = mandates.map(m => m.associationId);
    if (scopeAssocIds.length === 0) return NextResponse.json({ associations: [] });
  }

  const scopeCond = scopeAssocIds
    ? `AND a.id IN (${scopeAssocIds.map(id => `'${id}'`).join(",")})`
    : "";

  const rows = await prisma.$queryRawUnsafe<AssocRow[]>(`
    SELECT
      a.id                                                          AS association_id,
      a.name                                                        AS association_name,
      COUNT(DISTINCT u.id)                                          AS unit_count,
      AVG(pi."unitAmount")::float                                   AS avg_monthly_cost,
      (
        COUNT(DISTINCT CASE WHEN pi."totalDue" > pi."paidAmount" THEN o."unitId" END)::float
        / NULLIF(COUNT(DISTINCT o."unitId"), 0) * 100
      )                                                             AS pct_debtors,
      COALESCE(SUM(GREATEST(pi."totalDue" - pi."paidAmount", 0))::float, 0) AS total_outstanding
    FROM "Association"   a
    JOIN "Building"      b   ON b."associationId" = a.id
    JOIN "Unit"          u   ON u."buildingId"    = b.id
    JOIN "Ownership"     o   ON o."unitId"        = u.id AND o."isActive" = true
    LEFT JOIN "PaymentItem"   pi ON pi."ownershipId" = o.id
    LEFT JOIN "ExpensePeriod" ep ON ep.id = pi."periodId"
      AND ep.status = 'FINALIZED'
      AND (ep.year * 100 + ep.month) >= ${yearFrom * 100 + monthFrom}
      AND (ep.year * 100 + ep.month) <= ${yearTo * 100 + monthTo}
    WHERE a.status = 'ACTIVE'
      ${scopeCond}
    GROUP BY a.id, a.name
    ORDER BY avg_monthly_cost DESC NULLS LAST
  `);

  return NextResponse.json({
    associations: rows.map(r => ({
      associationId:    r.association_id,
      associationName:  r.association_name,
      unitCount:        Number(r.unit_count),
      avgMonthlyCost:   r.avg_monthly_cost !== null ? Math.round(Number(r.avg_monthly_cost) * 100) / 100 : null,
      pctDebtors:       r.pct_debtors !== null ? Math.round(Number(r.pct_debtors) * 10) / 10 : null,
      totalOutstanding: Number(r.total_outstanding),
    })),
  });
}
