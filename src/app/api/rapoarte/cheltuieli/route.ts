// src/app/api/rapoarte/cheltuieli/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

function canViewReports(role: UserRole) {
  return role === UserRole.MANAGER || role === UserRole.BOARD_PRESIDENT
    || role === UserRole.AUDITOR || role === UserRole.UAT_OPERATOR
    || role === UserRole.SUPER_ADMIN;
}

type StatsRow = {
  min: number;
  max: number;
  avg: number;
  median: number;
  count: bigint;
};

type ItemRow = {
  unit_id: string;
  apt_number: string;
  floor: number | null;
  area: number | null;
  rooms: number | null;
  unit_amount: number;
  total_due: number;
  paid_amount: number;
  status: string;
  year: number;
  month: number;
  association_id: string;
  association_name: string;
  building_name: string;
};

type HistogramRow = {
  bucket: number;
  count: bigint;
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (!canViewReports(role)) return NextResponse.json({ error: "Acces interzis" }, { status: 403 });

  const sp = new URL(req.url).searchParams;

  // Filters
  const yearFrom   = parseInt(sp.get("yearFrom")   ?? "2026");
  const monthFrom  = parseInt(sp.get("monthFrom")  ?? "1");
  const yearTo     = parseInt(sp.get("yearTo")     ?? "2026");
  const monthTo    = parseInt(sp.get("monthTo")    ?? "12");
  const assocId    = sp.get("associationId") || null;
  const areaMin    = sp.get("areaMin")   ? parseFloat(sp.get("areaMin")!)   : null;
  const areaMax    = sp.get("areaMax")   ? parseFloat(sp.get("areaMax")!)   : null;
  const rooms      = sp.get("rooms")     ? parseInt(sp.get("rooms")!)       : null;
  const floorFilter = sp.get("floor") ?? "all"; // all | ground | middle | top
  const sortBy     = sp.get("sortBy")    ?? "unitAmount"; // unitAmount | totalDue | area
  const sortDir    = sp.get("sortDir")   === "asc" ? "ASC" : "DESC";

  // Scope: managers see only their associations
  let scopeAssocIds: string[] | null = null;
  if (role === UserRole.MANAGER || role === UserRole.BOARD_PRESIDENT || role === UserRole.AUDITOR) {
    const mandates = await prisma.mandate.findMany({
      where: { userId: session.user.id, isActive: true },
      select: { associationId: true },
    });
    scopeAssocIds = mandates.map(m => m.associationId);
    if (scopeAssocIds.length === 0) return NextResponse.json({ stats: null, items: [], histogram: [] });
  }

  // Build WHERE conditions as a parameterized fragment
  // We use $queryRawUnsafe carefully — all user values are validated above (numerics/nulls)
  const conditions: string[] = [
    `ep.status = 'FINALIZED'`,
    `(ep.year * 100 + ep.month) >= ${yearFrom * 100 + monthFrom}`,
    `(ep.year * 100 + ep.month) <= ${yearTo * 100 + monthTo}`,
  ];

  if (assocId)      conditions.push(`b."associationId" = '${assocId.replace(/'/g, "''")}'`);
  if (scopeAssocIds) conditions.push(`b."associationId" IN (${scopeAssocIds.map(id => `'${id}'`).join(",")})`);
  if (areaMin !== null) conditions.push(`u.area >= ${areaMin}`);
  if (areaMax !== null) conditions.push(`u.area < ${areaMax}`);
  if (rooms !== null) {
    if (rooms >= 4) conditions.push(`u.rooms >= 4`);
    else            conditions.push(`u.rooms = ${rooms}`);
  }
  if (floorFilter === "ground") {
    conditions.push(`u.floor = 0`);
  } else if (floorFilter === "top") {
    conditions.push(`u.floor = (SELECT MAX(u2.floor) FROM "Unit" u2 WHERE u2."buildingId" = b.id)`);
  } else if (floorFilter === "middle") {
    conditions.push(`u.floor > 0 AND u.floor < (SELECT MAX(u2.floor) FROM "Unit" u2 WHERE u2."buildingId" = b.id)`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const baseJoin = `
    FROM "PaymentItem"   pi
    JOIN "Ownership"     o   ON o.id  = pi."ownershipId"
    JOIN "Unit"          u   ON u.id  = o."unitId"
    JOIN "Building"      b   ON b.id  = u."buildingId"
    JOIN "Association"   a   ON a.id  = b."associationId"
    JOIN "ExpensePeriod" ep  ON ep.id = pi."periodId"
  `;

  // 1. Aggregate stats
  const statsRows = await prisma.$queryRawUnsafe<StatsRow[]>(`
    SELECT
      MIN(pi."unitAmount")::float                                  AS min,
      MAX(pi."unitAmount")::float                                  AS max,
      AVG(pi."unitAmount")::float                                  AS avg,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY pi."unitAmount") AS median,
      COUNT(*)                                                     AS count
    ${baseJoin}
    ${whereClause}
  `);

  // 2. Histogram buckets (20 equal-width buckets)
  const histRows = await prisma.$queryRawUnsafe<HistogramRow[]>(`
    WITH bounds AS (
      SELECT MIN(pi."unitAmount") AS lo, MAX(pi."unitAmount") AS hi
      ${baseJoin}
      ${whereClause}
    ),
    bucketed AS (
      SELECT
        CASE WHEN (SELECT hi - lo FROM bounds) = 0 THEN 1
             ELSE WIDTH_BUCKET(pi."unitAmount", (SELECT lo FROM bounds), (SELECT hi FROM bounds) + 0.01, 20)
        END AS bucket
      ${baseJoin}
      ${whereClause}
    )
    SELECT bucket, COUNT(*) AS count
    FROM bucketed
    GROUP BY bucket
    ORDER BY bucket
  `);

  // 3. Detail items (limit 500)
  const sortCol = sortBy === "area" ? "u.area" : sortBy === "totalDue" ? `pi."totalDue"` : `pi."unitAmount"`;
  const itemRows = await prisma.$queryRawUnsafe<ItemRow[]>(`
    SELECT
      u.id                AS unit_id,
      u.number            AS apt_number,
      u.floor             AS floor,
      u.area::float       AS area,
      u.rooms             AS rooms,
      pi."unitAmount"::float  AS unit_amount,
      pi."totalDue"::float    AS total_due,
      pi."paidAmount"::float  AS paid_amount,
      pi.status::text         AS status,
      ep.year             AS year,
      ep.month            AS month,
      a.id                AS association_id,
      a.name              AS association_name,
      b.name              AS building_name
    ${baseJoin}
    ${whereClause}
    ORDER BY ${sortCol} ${sortDir}
    LIMIT 500
  `);

  const stats = statsRows[0] ?? null;

  return NextResponse.json({
    stats: stats
      ? {
          min:    Number(stats.min),
          max:    Number(stats.max),
          avg:    Math.round(Number(stats.avg) * 100) / 100,
          median: Math.round(Number(stats.median) * 100) / 100,
          count:  Number(stats.count),
        }
      : null,
    histogram: histRows.map(r => ({ bucket: r.bucket, count: Number(r.count) })),
    items: itemRows.map(r => ({
      unitId:          r.unit_id,
      aptNumber:       r.apt_number,
      floor:           r.floor,
      area:            r.area,
      rooms:           r.rooms,
      unitAmount:      r.unit_amount,
      totalDue:        r.total_due,
      paidAmount:      r.paid_amount,
      status:          r.status,
      year:            r.year,
      month:           r.month,
      associationId:   r.association_id,
      associationName: r.association_name,
      buildingName:    r.building_name,
    })),
  });
}
