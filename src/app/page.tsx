// src/app/page.tsx — public landing page (no auth required)
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import PublicMapClient from "./_components/PublicMapClient";
import type { Metadata } from "next";
import type { ScoreClassification } from "@prisma/client";

const SCORE_BADGE: Record<ScoreClassification, { label: string; cls: string }> = {
  CONFORME:   { label: "Conformă",   cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  AVERTISMENT:{ label: "Avertisment",cls: "bg-amber-50 text-amber-700 border-amber-200" },
  SOMATIE:    { label: "Somație",    cls: "bg-orange-50 text-orange-700 border-orange-200" },
  SANCTIUNE:  { label: "Sancțiune",  cls: "bg-red-50 text-red-700 border-red-200" },
};

export const metadata: Metadata = {
  title: "Registrul Asociațiilor de Proprietari · Sector 1 București",
  description:
    "Registrul public al asociațiilor de proprietari din Sectorul 1. Găsiți informații despre asociația dvs., președintele și administratorul de bloc.",
  robots: "index, follow",
};

export default async function LandingPage({
  searchParams,
}: {
  searchParams: { q?: string; cartier?: string };
}) {
  const q = searchParams.q?.trim() ?? "";
  const cartierFilter = searchParams.cartier?.trim() ?? "";

  const associations = await prisma.association.findMany({
    where: {
      status: "ACTIVE",
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { address: { contains: q, mode: "insensitive" } },
              { fiscalCode: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(cartierFilter ? { neighborhood: cartierFilter } : {}),
    },
    select: {
      id: true,
      name: true,
      address: true,
      neighborhood: true,
      fiscalCode: true,
      latitude: true,
      longitude: true,
      registrationDocs: true,
      mandates: {
        where: {
          role: { in: ["BOARD_PRESIDENT", "MANAGER"] },
          isActive: true,
        },
        select: { role: true, user: { select: { fullName: true } } },
        take: 4,
      },
      scores: {
        where: { isPublic: true },
        orderBy: { calculatedAt: "desc" },
        take: 1,
        select: { totalPoints: true, maxPossible: true, classification: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const publicAssociations = associations.map((a) => {
    const regDocs = a.registrationDocs as Record<string, unknown> | null ?? {};
    const cenzorData = regDocs.cenzor as Record<string, string> | undefined;
    const cenzorName = cenzorData
      ? cenzorData.entityType === "company"
        ? cenzorData.companyName ?? null
        : [cenzorData.firstName, cenzorData.lastName].filter(Boolean).join(" ") || null
      : null;

    const presidentData = regDocs.president as Record<string, string> | undefined;
    const administratorData = regDocs.administrator as Record<string, string> | undefined;

    const presidentName =
      a.mandates.find((m) => m.role === "BOARD_PRESIDENT")?.user.fullName ??
      (presidentData
        ? [presidentData.firstName, presidentData.lastName].filter(Boolean).join(" ") || null
        : null);

    const administratorName =
      a.mandates.find((m) => m.role === "MANAGER")?.user.fullName ??
      (administratorData
        ? administratorData.entityType === "company"
          ? administratorData.companyName ?? null
          : [administratorData.firstName, administratorData.lastName].filter(Boolean).join(" ") || null
        : null);

    const latestScore = a.scores[0] ?? null;
    const scorePercent = latestScore
      ? Math.round((latestScore.totalPoints / latestScore.maxPossible) * 100)
      : null;

    return {
      id: a.id,
      name: a.name,
      address: a.address,
      neighborhood: a.neighborhood ?? "",
      fiscalCode: a.fiscalCode ?? "",
      latitude: a.latitude,
      longitude: a.longitude,
      presidentName,
      administratorName,
      cenzorName,
      scorePercent,
      scoreClassification: latestScore?.classification ?? null,
    };
  });

  // All neighborhoods for filter dropdown
  const allNeighborhoods = await prisma.association.findMany({
    where: { status: "ACTIVE", neighborhood: { not: null } },
    select: { neighborhood: true },
    distinct: ["neighborhood"],
    orderBy: { neighborhood: "asc" },
  });
  const neighborhoods = allNeighborhoods
    .map((a) => a.neighborhood!)
    .filter(Boolean);

  const totalActive = await prisma.association.count({ where: { status: "ACTIVE" } });

  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* ── Header ────────────────────────────────── */}
      <header className="border-b border-slate-100 bg-white/95 backdrop-blur sticky top-0 z-50"
        style={{ boxShadow: "0 1px 0 rgba(0,0,0,0.05)" }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #4f5fe8 0%, #3040c8 100%)", boxShadow: "0 2px 8px rgba(62,79,200,0.35)" }}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M2.25 21h19.5m-18-18v18m2.25-18v18m9-18v18m2.25-18v18M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-none">Sector 1 București</p>
              <p className="text-xs text-slate-400 leading-none mt-0.5">Portal Asociații de Proprietari</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/register-association"
              className="hidden sm:inline-flex text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Înregistrează asociație
            </Link>
            <Link href="/login"
              className="text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
              style={{ background: "linear-gradient(135deg, #4f5fe8 0%, #3040c8 100%)" }}>
              Conectare →
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────── */}
      <section
        className="text-white py-14 md:py-20 px-6"
        style={{ background: "linear-gradient(135deg, #1e2a8a 0%, #3040c8 50%, #4f5fe8 100%)" }}>
        <div className="max-w-7xl mx-auto">
          <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest mb-3">
            UAT Sector 1 · București
          </p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4 max-w-3xl">
            Registrul Public al<br />Asociațiilor de Proprietari
          </h1>
          <p className="text-blue-100 text-base md:text-lg max-w-2xl mb-10 leading-relaxed">
            Date oficiale despre asociațiile de proprietari din Sectorul 1 — conducere, adresă și cod fiscal.
            Căutați asociația dvs. după nume, adresă sau CIF.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap gap-3">
            <div className="bg-white/10 backdrop-blur rounded-2xl px-5 py-3 text-center min-w-[110px] border border-white/10">
              <p className="text-2xl font-bold">{totalActive}</p>
              <p className="text-blue-200 text-xs mt-0.5">Asociații active</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl px-5 py-3 text-center min-w-[110px] border border-white/10">
              <p className="text-2xl font-bold">{neighborhoods.length}</p>
              <p className="text-blue-200 text-xs mt-0.5">Cartiere</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-2xl px-5 py-3 text-center min-w-[110px] border border-white/10">
              <p className="text-2xl font-bold">{publicAssociations.filter(a => a.latitude !== null).length}</p>
              <p className="text-blue-200 text-xs mt-0.5">Pe hartă</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Registru ──────────────────────────────── */}
      <section className="flex-1 py-10 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Title + search */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Registrul asociațiilor</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {q || cartierFilter
                  ? `${publicAssociations.length} rezultate`
                  : `${totalActive} asociații înregistrate`}
              </p>
            </div>

            {/* Search form — server-side, no JS required */}
            <form method="GET" className="flex gap-2 flex-wrap">
              <div className="relative">
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder="Caută după nume, adresă, CIF..."
                  className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-uat-500/30 focus:border-uat-400 w-64 transition-all"
                />
              </div>
              <select
                name="cartier"
                defaultValue={cartierFilter}
                className="py-2 px-3 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-uat-500/30 cursor-pointer"
              >
                <option value="">Toate cartierele</option>
                {neighborhoods.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <button type="submit"
                className="px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors"
                style={{ background: "linear-gradient(135deg, #4f5fe8 0%, #3040c8 100%)" }}>
                Caută
              </button>
              {(q || cartierFilter) && (
                <a href="/"
                  className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors">
                  ✕ Resetează
                </a>
              )}
            </form>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)" }}>
            {publicAssociations.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </div>
                <p className="font-semibold text-slate-600">Niciun rezultat pentru &ldquo;{q}&rdquo;</p>
                <p className="text-sm text-slate-400 mt-1">Încercați un alt termen de căutare.</p>
                <a href="/" className="inline-block mt-4 text-sm text-uat-600 hover:underline font-medium">
                  Afișați toate asociațiile
                </a>
              </div>
            ) : (
              <>
                {/* Table header */}
                <div className="hidden md:grid grid-cols-[2fr_1fr_auto_1fr_1fr_1fr_auto] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  <span>Asociație</span>
                  <span>Cartier</span>
                  <span>CIF</span>
                  <span>Președinte CA</span>
                  <span>Administrator</span>
                  <span>Cenzor</span>
                  <span>Scor UAT</span>
                </div>

                {/* Rows */}
                <div className="divide-y divide-slate-100">
                  {publicAssociations.map((a, idx) => (
                    <div key={a.id}
                      className="px-6 py-4 hover:bg-slate-50/80 transition-colors duration-100
                                 grid grid-cols-1 md:grid-cols-[2fr_1fr_auto_1fr_1fr_1fr_auto] gap-2 md:gap-4 items-center">

                      {/* Asociație */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold text-uat-700 bg-uat-50 border border-uat-100">
                          {idx + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm leading-snug">{a.name}</p>
                          {a.address && (
                            <p className="text-xs text-slate-400 truncate mt-0.5">{a.address}</p>
                          )}
                        </div>
                      </div>

                      {/* Cartier */}
                      <div>
                        {a.neighborhood ? (
                          <span className="inline-flex items-center text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                            {a.neighborhood}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </div>

                      {/* CIF */}
                      <div>
                        {a.fiscalCode ? (
                          <span className="font-mono text-xs text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">
                            {a.fiscalCode}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </div>

                      {/* Președinte */}
                      <div className="flex items-center gap-2 min-w-0">
                        {a.presidentName ? (
                          <>
                            <div className="w-6 h-6 rounded-full bg-uat-100 flex items-center justify-center flex-shrink-0 text-uat-700 font-bold text-xs">
                              {a.presidentName.charAt(0)}
                            </div>
                            <span className="text-sm text-slate-700 truncate">{a.presidentName}</span>
                          </>
                        ) : (
                          <span className="text-xs text-slate-300 italic">Necompletat</span>
                        )}
                      </div>

                      {/* Administrator */}
                      <div className="flex items-center gap-2 min-w-0">
                        {a.administratorName ? (
                          <>
                            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-700 font-bold text-xs">
                              {a.administratorName.charAt(0)}
                            </div>
                            <span className="text-sm text-slate-700 truncate">{a.administratorName}</span>
                          </>
                        ) : (
                          <span className="text-xs text-slate-300 italic">Necompletat</span>
                        )}
                      </div>

                      {/* Cenzor */}
                      <div className="flex items-center gap-2 min-w-0">
                        {a.cenzorName ? (
                          <>
                            <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 text-purple-700 font-bold text-xs">
                              {a.cenzorName.charAt(0)}
                            </div>
                            <span className="text-sm text-slate-700 truncate">{a.cenzorName}</span>
                          </>
                        ) : (
                          <span className="text-xs text-slate-300 italic">Necompletat</span>
                        )}
                      </div>

                      {/* Scor UAT */}
                      <div className="flex-shrink-0">
                        {a.scoreClassification ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${SCORE_BADGE[a.scoreClassification as ScoreClassification].cls}`}>
                              {SCORE_BADGE[a.scoreClassification as ScoreClassification].label}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">{a.scorePercent}%</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Table footer */}
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    {publicAssociations.length} asociații afișate
                  </p>
                  <p className="text-xs text-slate-400">
                    Date publice · actualizate în timp real
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Hartă ─────────────────────────────────── */}
      <section className="py-10 px-6 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Hartă</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Localizare geografică a asociațiilor cu coordonate GPS înregistrate.
            </p>
          </div>
          <PublicMapClient associations={publicAssociations} />
        </div>
      </section>

      {/* ── Info strip ────────────────────────────── */}
      <section className="bg-slate-50 border-t border-slate-100 py-10 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              ),
              title: "Date oficiale",
              desc: "Informații din registrul UAT Sector 1, actualizate de fiecare asociație.",
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              ),
              title: "Pentru locatari",
              desc: "Proprietarii se pot autentifica pentru consultări, adeverințe, sesizări și situație financiară.",
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              title: "Înregistrare online",
              desc: "Asociațiile noi pot depune dosarul de înregistrare online și urmări stadiul validării.",
            },
          ].map((item) => (
            <div key={item.title} className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-uat-50 text-uat-600 flex items-center justify-center flex-shrink-0">
                {item.icon}
              </div>
              <div>
                <p className="font-semibold text-slate-900 mb-1">{item.title}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white py-6 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <p>© {new Date().getFullYear()} Primăria Sectorului 1 · București</p>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-slate-700 transition-colors">
              Autentificare locatari
            </Link>
            <Link href="/register-association" className="hover:text-slate-700 transition-colors">
              Înregistrare asociație
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
