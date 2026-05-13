// src/app/api/rapoarte/route.ts
// GET ?type=locatari | costuri | termoficare | plati
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { cookies } from "next/headers";

const ALLOWED = [UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.AUDITOR, UserRole.SUPER_ADMIN] as UserRole[];

async function resolveAssocId(userId: string) {
  const cookieStore = cookies();
  const fromCookie = cookieStore.get("asociatie_activa")?.value ?? null;
  if (fromCookie) return fromCookie;
  const mandate = await prisma.mandate.findFirst({ where: { userId, isActive: true } });
  return mandate?.associationId ?? null;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role as UserRole;
  if (!ALLOWED.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const assocId = await resolveAssocId(session.user.id);
  if (!assocId) return NextResponse.json({ error: "No active association" }, { status: 400 });

  const type = new URL(req.url).searchParams.get("type") ?? "locatari";

  // ── 1. Locatari per unitate ───────────────────────────────────────────────
  if (type === "locatari") {
    const units = await prisma.unit.findMany({
      where: { building: { associationId: assocId } },
      select: {
        id: true, number: true, floor: true, area: true,
        residents: true, heatingType: true,
        building: { select: { name: true } },
        _count: { select: { carteaImobilului: true } },
      },
      orderBy: [{ building: { name: "asc" } }, { number: "asc" }],
    });

    const rows = units.map(u => ({
      building:    u.building.name,
      unit:        u.number,
      floor:       u.floor,
      area:        u.area,
      heatingType: u.heatingType,
      declared:    u._count.carteaImobilului,   // from Locatari tab
      manual:      u.residents,                  // manual override
      effective:   u.residents ?? u._count.carteaImobilului,
      perSqm:      u.area && (u.residents ?? u._count.carteaImobilului) > 0
        ? Math.round(((u.residents ?? u._count.carteaImobilului) / u.area) * 100) / 100
        : null,
    }));

    const totalEffective = rows.reduce((s, r) => s + r.effective, 0);
    const withArea = rows.filter(r => r.area);
    const avgPerSqm = withArea.length
      ? Math.round(withArea.reduce((s, r) => s + (r.perSqm ?? 0), 0) / withArea.length * 100) / 100
      : null;

    return NextResponse.json({ rows, totalEffective, avgPerSqm });
  }

  // ── 2. Costuri pe clădire / apartament ───────────────────────────────────
  if (type === "costuri") {
    const periods = await prisma.expensePeriod.findMany({
      where: { associationId: assocId, status: { in: ["FINALIZED", "ARCHIVED"] } },
      select: {
        id: true, year: true, month: true,
        paymentItems: {
          select: {
            totalDue: true, paidAmount: true,
            ownership: {
              select: {
                unit: {
                  select: {
                    number: true, area: true,
                    building: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 12,
    });

    // Group by building
    const byBuilding: Record<string, { totalDue: number; count: number }> = {};
    for (const p of periods) {
      for (const item of p.paymentItems) {
        const bName = item.ownership.unit.building.name;
        if (!byBuilding[bName]) byBuilding[bName] = { totalDue: 0, count: 0 };
        byBuilding[bName].totalDue += item.totalDue;
        byBuilding[bName].count += 1;
      }
    }

    // Group by unit area bucket
    const buckets: Record<string, { totalDue: number; count: number }> = {};
    for (const p of periods) {
      for (const item of p.paymentItems) {
        const area = item.ownership.unit.area;
        const bucket = area
          ? area < 40 ? "<40 m²"
          : area < 60 ? "40–60 m²"
          : area < 80 ? "60–80 m²"
          : area < 100 ? "80–100 m²"
          : ">100 m²"
          : "Necunoscut";
        if (!buckets[bucket]) buckets[bucket] = { totalDue: 0, count: 0 };
        buckets[bucket].totalDue += item.totalDue;
        buckets[bucket].count += 1;
      }
    }

    const perBuilding = Object.entries(byBuilding).map(([name, v]) => ({
      name, totalDue: Math.round(v.totalDue * 100) / 100,
      avgPerUnit: v.count ? Math.round(v.totalDue / v.count * 100) / 100 : 0,
    }));

    const perAreaBucket = Object.entries(buckets).map(([bucket, v]) => ({
      bucket, avgDue: v.count ? Math.round(v.totalDue / v.count * 100) / 100 : 0, count: v.count,
    })).sort((a, b) => a.bucket.localeCompare(b.bucket));

    return NextResponse.json({ perBuilding, perAreaBucket, periodsAnalyzed: periods.length });
  }

  // ── 3. Distribuție termoficare ───────────────────────────────────────────
  if (type === "termoficare") {
    const units = await prisma.unit.findMany({
      where: { building: { associationId: assocId } },
      select: { heatingType: true, area: true },
    });

    const dist: Record<string, { count: number; totalArea: number }> = {};
    for (const u of units) {
      const k = u.heatingType;
      if (!dist[k]) dist[k] = { count: 0, totalArea: 0 };
      dist[k].count += 1;
      dist[k].totalArea += u.area ?? 0;
    }

    const rows = Object.entries(dist).map(([type, v]) => ({
      type, count: v.count,
      pct: Math.round(v.count / units.length * 100),
      avgArea: v.count ? Math.round(v.totalArea / v.count * 10) / 10 : 0,
    }));

    return NextResponse.json({ rows, total: units.length });
  }

  // ── 4. Situație plăți (restanțe) ────────────────────────────────────────
  if (type === "plati") {
    const items = await prisma.paymentItem.findMany({
      where: { period: { associationId: assocId }, status: { in: ["PENDING", "PARTIAL", "OVERDUE"] } },
      select: {
        totalDue: true, paidAmount: true, status: true,
        ownership: {
          select: {
            user:  { select: { fullName: true } },
            unit: {
              select: {
                number: true,
                building: { select: { name: true } },
              },
            },
          },
        },
        period: { select: { year: true, month: true } },
      },
      orderBy: [{ period: { year: "desc" } }, { period: { month: "desc" } }],
    });

    const byOwner: Record<string, { name: string; building: string; unit: string; totalDebt: number; periods: number }> = {};
    for (const item of items) {
      const key = item.ownership.user.fullName + "_" + item.ownership.unit.number;
      if (!byOwner[key]) byOwner[key] = {
        name: item.ownership.user.fullName,
        building: item.ownership.unit.building.name,
        unit: item.ownership.unit.number,
        totalDebt: 0, periods: 0,
      };
      byOwner[key].totalDebt += item.totalDue - item.paidAmount;
      byOwner[key].periods += 1;
    }

    const rows = Object.values(byOwner)
      .map(r => ({ ...r, totalDebt: Math.round(r.totalDebt * 100) / 100 }))
      .sort((a, b) => b.totalDebt - a.totalDebt);

    const totalDebt = rows.reduce((s, r) => s + r.totalDebt, 0);
    return NextResponse.json({ rows, totalDebt: Math.round(totalDebt * 100) / 100 });
  }

  return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
}
