// src/app/(dashboard)/uat/owners/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Proprietari | UAT" };

interface Props {
  searchParams: { q?: string; associationId?: string; page?: string };
}

const PAGE_SIZE = 50;

export default async function OwnersPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");
  const role = session.user.role as UserRole;
  if (role !== UserRole.UAT_OPERATOR && role !== UserRole.SUPER_ADMIN) redirect("/dashboard");

  const q = searchParams.q?.trim() ?? "";
  const filterAssocId = searchParams.associationId?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const skip = (page - 1) * PAGE_SIZE;

  const associations = await prisma.association.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const ownershipWhere = {
    isActive: true,
    ...(filterAssocId
      ? { unit: { building: { associationId: filterAssocId } } }
      : {}),
    ...(q
      ? {
          OR: [
            { user: { fullName: { contains: q, mode: "insensitive" as const } } },
            { user: { email:    { contains: q, mode: "insensitive" as const } } },
            { unit: { number:   { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [ownerships, total] = await Promise.all([
    prisma.ownership.findMany({
      where: ownershipWhere,
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } },
        unit: {
          select: {
            id: true, number: true, floor: true, rooms: true,
            building: {
              select: {
                id: true, name: true, address: true,
                association: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: [
        { unit: { building: { association: { name: "asc" } } } },
        { user: { fullName: "asc" } },
      ],
      skip,
      take: PAGE_SIZE,
    }),
    prisma.ownership.count({ where: ownershipWhere }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function buildPageUrl(p: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (filterAssocId) params.set("associationId", filterAssocId);
    params.set("page", String(p));
    return `/uat/owners?${params}`;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
          <Link href="/uat" className="hover:text-slate-600">Panou UAT</Link>
          <span>›</span>
          <span className="text-slate-900 font-medium">Proprietari</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Proprietari înregistrați</h1>
        <p className="text-slate-400 text-sm mt-0.5">{total} proprietăți active</p>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text" name="q" defaultValue={q}
            placeholder="Nume, email, nr. apartament..."
            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-uat-500/30 w-64"
          />
        </div>

        <select
          name="associationId" defaultValue={filterAssocId}
          className="py-2 px-3 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-uat-500/30"
        >
          <option value="">Toate asociațiile</option>
          {associations.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        <button type="submit"
          className="px-4 py-2 text-sm font-semibold text-white rounded-xl"
          style={{ background: "linear-gradient(135deg, #4f5fe8 0%, #3040c8 100%)" }}>
          Caută
        </button>

        {(q || filterAssocId) && (
          <a href="/uat/owners"
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl bg-white hover:bg-slate-50">
            ✕ Resetează
          </a>
        )}
      </form>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_2fr] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wide">
          <span>Proprietar</span>
          <span>Apartament</span>
          <span>Scară / Bloc</span>
          <span>Asociație</span>
        </div>

        {ownerships.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            {q || filterAssocId ? "Niciun rezultat." : "Nu există proprietari înregistrați."}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {ownerships.map(o => (
              <div key={o.id}
                className="px-6 py-3.5 grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_2fr] gap-2 md:gap-4 items-center hover:bg-slate-50/80 transition-colors">

                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-uat-100 flex items-center justify-center flex-shrink-0 text-uat-700 font-bold text-xs">
                    {o.user.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">{o.user.fullName}</p>
                    <p className="text-xs text-slate-400 truncate">{o.user.email}</p>
                    {o.user.phone && <p className="text-xs text-slate-300">{o.user.phone}</p>}
                  </div>
                </div>

                <div>
                  <span className="font-mono text-sm font-medium text-slate-900">Ap. {o.unit.number}</span>
                  {o.unit.floor != null && (
                    <span className="text-xs text-slate-400 ml-1.5">et. {o.unit.floor}</span>
                  )}
                  {o.unit.rooms != null && (
                    <p className="text-xs text-slate-400">{o.unit.rooms} cam.</p>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{o.unit.building.name}</p>
                  <p className="text-xs text-slate-400 truncate">{o.unit.building.address}</p>
                </div>

                <div className="min-w-0">
                  <Link href={`/uat/associations/${o.unit.building.association.id}`}
                    className="text-sm text-uat-600 hover:text-uat-700 hover:underline truncate block">
                    {o.unit.building.association.name}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {total === 0 ? "0" : `${skip + 1}–${Math.min(skip + PAGE_SIZE, total)}`} din {total}
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              {page > 1 && (
                <a href={buildPageUrl(page - 1)}
                  className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
                  ← Anterior
                </a>
              )}
              <span className="text-xs text-slate-400 px-2">Pag. {page} / {totalPages}</span>
              {page < totalPages && (
                <a href={buildPageUrl(page + 1)}
                  className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
                  Următor →
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
