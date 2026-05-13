"use client";
// src/app/asociatii/AssociatiiList.tsx
import { useState, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CLASSIFICATION_LABELS, CLASSIFICATION_BADGE } from "@/lib/scoring";
import type { ScoreClassification } from "@prisma/client";

type AssocRow = {
  id: string;
  name: string;
  status: string;
  address: string | null;
  rawAddress: string | null;
  neighborhood: string | null;
  fiscalCode: string | null;
  registrationYear: number | null;
  scores: { totalPoints: number; maxPossible: number; classification: ScoreClassification; calculatedAt: string }[];
  _count: { buildings: number };
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE:            "Activ",
  OFFICIAL_REGISTRY: "Registru oficial",
};

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:            "bg-emerald-50 text-emerald-700 border-emerald-200",
  OFFICIAL_REGISTRY: "bg-blue-50 text-blue-700 border-blue-200",
};

interface Props {
  initialRows:   AssocRow[];
  total:         number;
  page:          number;
  pageSize:      number;
  initialSearch: string;
  initialStatus: string;
  initialSort:   string;
}

export default function AssociatiiList({
  initialRows, total, page, pageSize, initialSearch, initialStatus, initialSort,
}: Props) {
  const router     = useRouter();
  const pathname   = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);
  const [sort,   setSort]   = useState(initialSort);

  const push = useCallback(
    (overrides: Record<string, string | number>) => {
      const params = new URLSearchParams(searchParams.toString());
      const merged = { q: search, status, sort, page: "1", ...overrides };
      Object.entries(merged).forEach(([k, v]) => {
        if (v === "" || v === "1" && k === "page") params.delete(k);
        else params.set(k, String(v));
      });
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams, search, status, sort],
  );

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    push({ q: search, page: 1 });
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
        <div className="flex flex-1 min-w-56 gap-2">
          <input
            className="input flex-1"
            placeholder="Caută după nume sau adresă..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button type="submit" className="btn-primary px-5">Caută</button>
        </div>
        <select
          className="input w-48"
          value={status}
          onChange={e => { setStatus(e.target.value); push({ status: e.target.value, page: 1 }); }}
        >
          <option value="">Toate statusurile</option>
          <option value="ACTIVE">Activ</option>
          <option value="OFFICIAL_REGISTRY">Registru oficial</option>
        </select>
        <select
          className="input w-44"
          value={sort}
          onChange={e => { setSort(e.target.value); push({ sort: e.target.value, page: 1 }); }}
        >
          <option value="name">Sortare: Nume A-Z</option>
          <option value="status">Sortare: Status</option>
        </select>
      </form>

      {/* Count */}
      <p className="text-sm text-slate-500">
        {total.toLocaleString("ro-RO")} asociații
        {search ? ` pentru „${search}"` : ""}
        {page > 1 ? ` · pagina ${page} din ${totalPages}` : ""}
      </p>

      {/* List */}
      {initialRows.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <p className="font-medium text-slate-600">Nicio asociație găsită</p>
          {search && <p className="text-sm mt-1">Încercați o altă căutare.</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {initialRows.map(row => {
            const latestScore = row.scores[0] ?? null;
            const displayAddress = row.rawAddress ?? row.address;
            return (
              <Link
                key={row.id}
                href={`/asociatii/${row.id}`}
                className="card flex items-center justify-between gap-4 px-5 py-4 hover:border-uat-300 hover:shadow-sm transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${STATUS_BADGE[row.status] ?? "bg-slate-50 text-slate-500 border-slate-200"}`}>
                      {STATUS_LABELS[row.status] ?? row.status}
                    </span>
                    {row.registrationYear && (
                      <span className="text-xs text-slate-400">{row.registrationYear}</span>
                    )}
                  </div>
                  <p className="font-semibold text-slate-900 group-hover:text-uat-700 truncate">{row.name}</p>
                  {displayAddress && (
                    <p className="text-sm text-slate-400 truncate mt-0.5">{displayAddress}</p>
                  )}
                  {row.fiscalCode && (
                    <p className="text-xs text-slate-300 mt-0.5">CIF {row.fiscalCode}</p>
                  )}
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  {latestScore && (
                    <div className="text-right">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${CLASSIFICATION_BADGE[latestScore.classification]}`}>
                        {CLASSIFICATION_LABELS[latestScore.classification]}
                      </span>
                      <p className="text-xs text-slate-400 mt-1">
                        {latestScore.totalPoints}/{latestScore.maxPossible} pt
                      </p>
                    </div>
                  )}
                  <span className="text-slate-300 group-hover:text-uat-500 transition-colors">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          {page > 1 && (
            <button onClick={() => push({ page: page - 1 })} className="btn-ghost text-sm">
              ← Anterioare
            </button>
          )}
          <span className="text-sm text-slate-500">
            Pagina {page} din {totalPages}
          </span>
          {page < totalPages && (
            <button onClick={() => push({ page: page + 1 })} className="btn-ghost text-sm">
              Următoare →
            </button>
          )}
        </div>
      )}

      {/* CTA */}
      <div className="mt-8 card bg-uat-50 border-uat-200 p-6 text-center">
        <h2 className="font-semibold text-uat-900 mb-1">Asociația dvs. nu este în listă?</h2>
        <p className="text-sm text-uat-700 mb-4">
          Puteți înregistra asociația online. Procesul durează câteva minute.
        </p>
        <Link href="/register-association" className="btn-primary">
          Înregistrează asociația →
        </Link>
      </div>
    </div>
  );
}
