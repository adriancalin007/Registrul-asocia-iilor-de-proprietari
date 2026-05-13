// src/app/asociatii/page.tsx
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { AssociationStatus } from "@prisma/client";
import Link from "next/link";
import AssociatiiList from "./AssociatiiList";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Asociații de proprietari | Sector 1",
  description: "Registrul asociațiilor de proprietari din Sectorul 1 București",
};

const PUBLIC_STATUSES: AssociationStatus[] = [
  AssociationStatus.ACTIVE,
  AssociationStatus.OFFICIAL_REGISTRY,
];

export default async function AsociatiiPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string; status?: string; sort?: string };
}) {
  const page   = Math.max(1, parseInt(searchParams.page  ?? "1",  10));
  const search = searchParams.q?.trim() ?? "";
  const status = searchParams.status as AssociationStatus | null ?? null;
  const sort   = searchParams.sort ?? "name";

  const PAGE_SIZE = 50;

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
    sort === "status" ? { status: "asc" as const } :
    { name: "asc" as const };

  const [total, rows] = await Promise.all([
    prisma.association.count({ where }),
    prisma.association.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id:            true,
        name:          true,
        status:        true,
        address:       true,
        rawAddress:    true,
        neighborhood:  true,
        fiscalCode:    true,
        registrationYear: true,
        scores: {
          where:   { isPublic: true },
          orderBy: { calculatedAt: "desc" },
          take:    1,
          select: { totalPoints: true, maxPossible: true, classification: true, calculatedAt: true },
        },
        _count: { select: { buildings: true } },
      },
    }),
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between gap-4 mb-1">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Asociații de proprietari</h1>
              <p className="text-slate-500 mt-1">
                Registrul public al asociațiilor din Sectorul 1 — {total.toLocaleString("ro-RO")} înregistrări
              </p>
            </div>
            <Link href="/register-association" className="btn-primary flex-shrink-0">
              Înregistrează asociația →
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <Suspense fallback={<div className="text-slate-400 text-sm">Se încarcă...</div>}>
          <AssociatiiList
            initialRows={rows.map(r => ({
              ...r,
              scores: r.scores.map(s => ({ ...s, calculatedAt: s.calculatedAt.toISOString() })),
            }))}
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            initialSearch={search}
            initialStatus={status ?? ""}
            initialSort={sort}
          />
        </Suspense>
      </div>
    </div>
  );
}
