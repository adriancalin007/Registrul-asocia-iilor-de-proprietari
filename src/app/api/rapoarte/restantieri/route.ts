// src/app/api/rapoarte/restantieri/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

function canViewReports(role: UserRole) {
  return role === UserRole.MANAGER || role === UserRole.BOARD_PRESIDENT
    || role === UserRole.AUDITOR || role === UserRole.UAT_OPERATOR
    || role === UserRole.SUPER_ADMIN;
}

type DebtorRow = {
  unit_id: string;
  apt_number: string;
  building_name: string;
  association_id: string;
  association_name: string;
  total_debt: number;
  months_in_debt: bigint;
  last_period: string;
};

type AssocTotalRow = {
  association_id: string;
  association_name: string;
  total_outstanding: number;
  debtor_count: bigint;
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (!canViewReports(role)) return NextResponse.json({ error: "Acces interzis" }, { status: 403 });

  const sp = new URL(req.url).searchParams;
  const assocId     = sp.get("associationId") || null;
  const minDebt     = parseFloat(sp.get("minDebt")     ?? "0");
  const minMonths   = parseInt(sp.get("minMonths")     ?? "1");

  let scopeAssocIds: string[] | null = null;
  if (role === UserRole.MANAGER || role === UserRole.BOARD_PRESIDENT || role === UserRole.AUDITOR) {
    const mandates = await prisma.mandate.findMany({
      where: { userId: session.user.id, isActive: true },
      select: { associationId: true },
    });
    scopeAssocIds = mandates.map(m => m.associationId);
    if (scopeAssocIds.length === 0) return NextResponse.json({ debtors: [], associationTotals: [] });
  }

  const scopeCond = scopeAssocIds
    ? `AND b."associationId" IN (${scopeAssocIds.map(id => `'${id}'`).join(",")})`
    : "";
  const assocCond = assocId ? `AND b."associationId" = '${assocId.replace(/'/g, "''")}'` : "";

  const debtorRows = await prisma.$queryRawUnsafe<DebtorRow[]>(`
    SELECT
      u.id                                                        AS unit_id,
      u.number                                                    AS apt_number,
      b.name                                                      AS building_name,
      a.id                                                        AS association_id,
      a.name                                                      AS association_name,
      SUM(pi."totalDue" - pi."paidAmount")::float                 AS total_debt,
      COUNT(*) FILTER (
        WHERE pi."totalDue" > pi."paidAmount"
      )                                                           AS months_in_debt,
      MAX(ep.year::text || '-' || LPAD(ep.month::text,2,'0'))     AS last_period
    FROM "PaymentItem"   pi
    JOIN "ExpensePeriod" ep ON ep.id = pi."periodId"
    JOIN "Ownership"     o  ON o.id  = pi."ownershipId" AND o."isActive" = true
    JOIN "Unit"          u  ON u.id  = o."unitId"
    JOIN "Building"      b  ON b.id  = u."buildingId"
    JOIN "Association"   a  ON a.id  = b."associationId"
    WHERE pi."totalDue" > pi."paidAmount"
      ${scopeCond}
      ${assocCond}
    GROUP BY u.id, u.number, b.name, a.id, a.name
    HAVING
      SUM(pi."totalDue" - pi."paidAmount") >= ${minDebt}
      AND COUNT(*) FILTER (WHERE pi."totalDue" > pi."paidAmount") >= ${minMonths}
    ORDER BY total_debt DESC
    LIMIT 500
  `);

  const assocTotalRows = await prisma.$queryRawUnsafe<AssocTotalRow[]>(`
    SELECT
      a.id                                             AS association_id,
      a.name                                           AS association_name,
      SUM(GREATEST(pi."totalDue" - pi."paidAmount",0))::float AS total_outstanding,
      COUNT(DISTINCT u.id)                             AS debtor_count
    FROM "PaymentItem"   pi
    JOIN "Ownership"     o  ON o.id  = pi."ownershipId" AND o."isActive" = true
    JOIN "Unit"          u  ON u.id  = o."unitId"
    JOIN "Building"      b  ON b.id  = u."buildingId"
    JOIN "Association"   a  ON a.id  = b."associationId"
    WHERE pi."totalDue" > pi."paidAmount"
      ${scopeCond}
      ${assocCond}
    GROUP BY a.id, a.name
    ORDER BY total_outstanding DESC
  `);

  return NextResponse.json({
    debtors: debtorRows.map(r => ({
      unitId:          r.unit_id,
      aptNumber:       r.apt_number,
      buildingName:    r.building_name,
      associationId:   r.association_id,
      associationName: r.association_name,
      totalDebt:       Number(r.total_debt),
      monthsInDebt:    Number(r.months_in_debt),
      lastPeriod:      r.last_period,
    })),
    associationTotals: assocTotalRows.map(r => ({
      associationId:    r.association_id,
      associationName:  r.association_name,
      totalOutstanding: Number(r.total_outstanding),
      debtorCount:      Number(r.debtor_count),
    })),
  });
}
