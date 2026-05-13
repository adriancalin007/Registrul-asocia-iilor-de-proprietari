// src/app/(dashboard)/financiare/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Metadata } from "next";

const MONTH_NAMES_RO = [
  "", "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
];

type Period = {
  id: string;
  year: number;
  month: number;
  status: "DRAFT" | "FINALIZED" | "ARCHIVED";
  expenseCount: number;
  ownerCount: number;
  totalExpenses: number;
  totalDue: number;
  totalPaid: number;
  createdAt: string;
};

const STATUS_BADGE: Record<Period["status"], string> = {
  DRAFT:     "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  FINALIZED: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  ARCHIVED:  "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
};
const STATUS_LABEL: Record<Period["status"], string> = {
  DRAFT:     "În lucru",
  FINALIZED: "Finalizat",
  ARCHIVED:  "Arhivat",
};

function fmt(n: number) {
  return n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function FinanciarePage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1, notes: "" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/financiare");
    if (res.ok) setPeriods(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createPeriod() {
    setCreating(true);
    setError(null);
    const res = await fetch("/api/financiare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Eroare la creare");
      setCreating(false);
      return;
    }
    setShowModal(false);
    await load();
    setCreating(false);
  }

  const outstanding = (p: Period) => Math.max(0, p.totalDue - p.totalPaid);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestiune financiară</h1>
          <p className="text-sm text-slate-500 mt-1">Repartizarea cheltuielilor lunare și evidența plăților</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setError(null); }}
          className="inline-flex items-center gap-2 bg-uat-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-uat-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Lună nouă
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-uat-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : periods.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <svg className="w-12 h-12 mx-auto mb-4 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" />
          </svg>
          <p>Nicio lună înregistrată. Creați prima perioadă.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {periods.map(p => (
            <Link
              key={p.id}
              href={`/financiare/${p.id}`}
              className="block bg-white rounded-xl border border-slate-100 shadow-sm hover:border-uat-200 hover:shadow-md transition-all group"
            >
              <div className="p-5 flex items-center gap-6">
                {/* Month badge */}
                <div className="w-16 h-16 rounded-xl bg-uat-50 flex flex-col items-center justify-center flex-shrink-0 group-hover:bg-uat-100 transition-colors">
                  <span className="text-xs font-medium text-uat-600 uppercase tracking-wide">
                    {MONTH_NAMES_RO[p.month].slice(0, 3)}
                  </span>
                  <span className="text-2xl font-bold text-uat-700 leading-none">{p.year}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-slate-900">{MONTH_NAMES_RO[p.month]} {p.year}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[p.status]}`}>
                      {STATUS_LABEL[p.status]}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400">
                    {p.expenseCount} cheltuieli · {p.ownerCount} proprietari
                  </p>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex items-center gap-8 text-right">
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Cheltuieli</p>
                    <p className="text-sm font-semibold text-slate-700">{fmt(p.totalExpenses)} RON</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Încasat</p>
                    <p className="text-sm font-semibold text-emerald-600">{fmt(p.totalPaid)} RON</p>
                  </div>
                  {outstanding(p) > 0.005 && (
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Restanță</p>
                      <p className="text-sm font-semibold text-red-500">{fmt(outstanding(p))} RON</p>
                    </div>
                  )}
                </div>

                <svg className="w-4 h-4 text-slate-300 group-hover:text-uat-400 flex-shrink-0 ml-2 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* New Period Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Perioadă nouă</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">An</label>
                  <input
                    type="number"
                    value={form.year}
                    onChange={e => setForm(f => ({ ...f, year: parseInt(e.target.value) || f.year }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uat-500"
                    min={2020} max={2099}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Lună</label>
                  <select
                    value={form.month}
                    onChange={e => setForm(f => ({ ...f, month: parseInt(e.target.value) }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uat-500"
                  >
                    {MONTH_NAMES_RO.slice(1).map((name, i) => (
                      <option key={i + 1} value={i + 1}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notițe (opțional)</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uat-500 resize-none"
                  placeholder="Ex: Include factura curent din 14 apr."
                />
              </div>

              {error && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
              )}
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2 rounded-lg hover:bg-slate-50"
              >
                Anulează
              </button>
              <button
                onClick={createPeriod}
                disabled={creating}
                className="flex-1 bg-uat-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-uat-700 disabled:opacity-50"
              >
                {creating ? "Se creează..." : "Creează"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
