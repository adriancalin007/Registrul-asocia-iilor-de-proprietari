// src/app/api/public/associations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AssociationStatus } from "@prisma/client";

const PUBLIC_STATUSES: AssociationStatus[] = [
  AssociationStatus.ACTIVE,
  AssociationStatus.OFFICIAL_REGISTRY,
];

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page   = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10));
  const search = searchParams.get("q")?.trim() ?? "";
  const status = searchParams.get("status") as AssociationStatus | null;
  const sort   = searchParams.get("sort") ?? "name";

  const where = {
    AND: [
      { status: { in: status && PUBLIC_STATUSES.includes(status as AssociationStatus) ? [status as AssociationStatus] : PUBLIC_STATUSES } },
      search
        ? {
            OR: [
              { name:       { contains: search, mode: "insensitive" as const } },
              { address:    { contains: search, mode: "insensitive" as const } },
              { rawAddress: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {},
    ],
  };

  const orderBy =
    sort === "score"  ? { scores: { _count: "desc" as const } } :
    sort === "status" ? { status: "asc" as const } :
    { name: "asc" as const };

  const [total, rows] = await Promise.all([
    prisma.association.count({ where }),
    prisma.association.findMany({
      where,
      orderBy,
      skip:  (page - 1) * PAGE_SIZE,
      take:  PAGE_SIZE,
      select: {
        id:              true,
        name:            true,
        status:          true,
        address:         true,
        rawAddress:      true,
        neighborhood:    true,
        fiscalCode:      true,
        registrationNumber: true,
        courtDossierNumber: true,
        registrationYear:   true,
        scores: {
          where:   { isPublic: true },
          orderBy: { calculatedAt: "desc" },
          take:    1,
          select: {
            totalPoints:    true,
            maxPossible:    true,
            classification: true,
            calculatedAt:   true,
          },
        },
        _count: { select: { buildings: true } },
      },
    }),
  ]);

  return NextResponse.json({
    data:       rows,
    total,
    page,
    pageSize:   PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
  });
}
