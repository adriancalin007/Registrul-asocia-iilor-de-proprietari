"use client";
// src/app/(dashboard)/scoli/page.tsx
import { useState, useEffect } from "react";
import Link from "next/link";

type Clasa = { id: string; an: number; litera: string };
type Scoala = {
  id: string;
  name: string;
  address: string;
  type: "GENERALA" | "LICEU" | "COMBINATA";
  director: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  clase: Clasa[];
};

const TYPE_LABEL: Record<string, string> = {
  GENERALA: "Școală generală",
  LICEU: "Liceu",
  COMBINATA: "Structură combinată",
};

export default function ScoliPage() {
  const [scoli, setScoli] = useState<Scoala[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/scoli")
      .then((r) => r.json())
      .then((data) => {
        setScoli(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = scoli.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <p className="text-xs font-semibold text-uat-600 uppercase tracking-widest mb-1">Portal Civic</p>
        <h1 className="text-2xl font-bold text-slate-900">Școli Sector 1</h1>
        <p className="text-sm text-slate-500 mt-1">
          Înscrie copilul tău și accesează orarul clasei
        </p>
      </div>

      <input
        type="text"
        placeholder="Caută după nume sau adresă..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-uat-500 focus:border-transparent"
      />

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Se încarcă...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">Nicio școală găsită.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((s) => (
            <Link
              key={s.id}
              href={`/scoli/${s.id}`}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-5 flex flex-col gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0 text-xl">
                  🎓
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 text-sm leading-tight">{s.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{s.address}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full font-medium">
                  {TYPE_LABEL[s.type]}
                </span>
                <span className="text-xs text-slate-400">{s.clase.length} clase</span>
                {s.director && (
                  <span className="text-xs text-slate-400 truncate">Dir. {s.director}</span>
                )}
              </div>

              {s.clase.length > 0 && (
                <div className="text-xs text-slate-400">
                  Clase:{" "}
                  {s.clase
                    .slice(0, 6)
                    .map((c) => `${c.an}${c.litera}`)
                    .join(", ")}
                  {s.clase.length > 6 && ` +${s.clase.length - 6}`}
                </div>
              )}

              <p className="text-xs text-purple-600 font-medium mt-auto">
                Vezi detalii & înrolează →
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
