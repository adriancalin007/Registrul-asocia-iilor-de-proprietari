"use client";
// src/app/(dashboard)/lucrari/page.tsx

import { useState, useEffect } from "react";
import Link from "next/link";

type RFQ = {
  id: string; title: string; description: string;
  status: string; quotingDeadline: string; estimatedValue: number | null;
  categories: string[]; photos: string[]; createdAt: string;
  _count: { quotes: number };
  issue: { ticketNumber: string; category: string; location: string } | null;
};

const STATUS_BADGE: Record<string, string> = {
  DRAFT:            "bg-slate-100 text-slate-500",
  PUBLISHED:        "bg-blue-50 text-blue-700",
  UNDER_EVALUATION: "bg-amber-50 text-amber-700",
  AWARDED:          "bg-emerald-50 text-emerald-700",
  CANCELLED:        "bg-red-50 text-red-600",
  ARCHIVED:         "bg-slate-100 text-slate-400",
};
const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Ciornă", PUBLISHED: "Publicată", UNDER_EVALUATION: "În evaluare",
  AWARDED: "Atribuită", CANCELLED: "Anulată", ARCHIVED: "Arhivată",
};

const CATEGORIES = [
  "Zugrăveli", "Instalații sanitare", "Instalații electrice", "Instalații termice",
  "Lift", "Construcții", "Curățenie", "Dezinsecție / Deratizare", "Alte servicii",
];

function fmt(n: number) {
  return n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function LucrariPage() {
  const [rfqs, setRfqs]         = useState<RFQ[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "", description: "", categories: [] as string[],
    estimatedValue: "", quotingDeadline: "", photos: [] as string[],
  });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/lucrari");
    if (r.ok) setRfqs(await r.json());
    setLoading(false);
  }

  async function save() {
    setSaving(true); setError(null);
    const res = await fetch("/api/lucrari", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title:          form.title,
        description:    form.description,
        categories:     form.categories,
        estimatedValue: form.estimatedValue ? parseFloat(form.estimatedValue) : undefined,
        quotingDeadline: form.quotingDeadline,
        photos:         form.photos,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setSaving(false); return; }
    setShowModal(false);
    setForm({ title: "", description: "", categories: [], estimatedValue: "", quotingDeadline: "", photos: [] });
    await load(); setSaving(false);
  }

  function toggleCategory(c: string) {
    setForm(f => ({
      ...f,
      categories: f.categories.includes(c) ? f.categories.filter(x => x !== c) : [...f.categories, c],
    }));
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lucrări</h1>
          <p className="text-sm text-slate-500 mt-0.5">Cereri de ofertă — publicați lucrări și primiți oferte de la furnizori</p>
        </div>
        <button onClick={() => { setShowModal(true); setError(null); }}
          className="btn-primary">
          + Lucrare nouă
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-7 h-7 border-2 border-uat-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rfqs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
          <p className="text-4xl mb-3">🔨</p>
          <p className="text-slate-600 font-medium">Nicio lucrare publicată</p>
          <p className="text-sm text-slate-400 mt-1 mb-5">Publicați prima lucrare pentru a primi oferte de la furnizori.</p>
          <button onClick={() => setShowModal(true)} className="btn-primary">+ Lucrare nouă</button>
        </div>
      ) : (
        <div className="space-y-3">
          {rfqs.map(rfq => (
            <Link key={rfq.id} href={`/lucrari/${rfq.id}`}
              className="block bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-4 hover:shadow-md transition-shadow group">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-semibold text-slate-900 group-hover:text-uat-700 transition-colors">
                      {rfq.title}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[rfq.status]}`}>
                      {STATUS_LABEL[rfq.status] ?? rfq.status}
                    </span>
                    {rfq.issue && (
                      <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">
                        {rfq.issue.ticketNumber}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2">{rfq.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 flex-wrap">
                    {rfq.categories.length > 0 && (
                      <span className="flex gap-1">
                        {rfq.categories.map(c => (
                          <span key={c} className="bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">{c}</span>
                        ))}
                      </span>
                    )}
                    <span>Termen: {new Date(rfq.quotingDeadline).toLocaleDateString("ro-RO")}</span>
                    {rfq.estimatedValue && <span>Estimat: {fmt(rfq.estimatedValue)} RON</span>}
                    {rfq.photos.length > 0 && <span>📷 {rfq.photos.length} foto</span>}
                  </div>
                </div>
                <div className="flex-shrink-0 text-center">
                  <p className="text-2xl font-bold text-uat-600">{rfq._count.quotes}</p>
                  <p className="text-xs text-slate-400">oferte</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── Modal lucrare nouă ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-slate-900">Lucrare nouă</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Titlu *</label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-uat-500 focus:outline-none"
                  placeholder="ex: Zugrăveli scară bloc — 3 etaje" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Descriere detaliată *</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={4} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-uat-500 focus:outline-none resize-none"
                  placeholder="Descrieți lucrarea în detaliu: suprafețe, materiale necesare, condiții speciale..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">Categorii</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(c => (
                    <button key={c} type="button" onClick={() => toggleCategory(c)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        form.categories.includes(c)
                          ? "bg-uat-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Linkuri foto</label>
                <p className="text-xs text-slate-400 mb-2">Adaugă linkuri către poze (Google Drive, etc.) — câte unul pe linie</p>
                <textarea
                  value={form.photos.join("\n")}
                  onChange={e => setForm(f => ({ ...f, photos: e.target.value.split("\n").filter(Boolean) }))}
                  rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-uat-500 focus:outline-none resize-none font-mono text-xs"
                  placeholder="https://drive.google.com/..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Valoare estimată (RON)</label>
                  <input type="number" step="100" value={form.estimatedValue}
                    onChange={e => setForm(f => ({ ...f, estimatedValue: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-uat-500 focus:outline-none"
                    placeholder="opțional" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Termen limită oferte *</label>
                  <input type="date" value={form.quotingDeadline}
                    onChange={e => setForm(f => ({ ...f, quotingDeadline: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-uat-500 focus:outline-none" />
                </div>
              </div>
              {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            </div>
            <div className="flex gap-3 px-6 pb-6 pt-2 border-t border-slate-100">
              <button onClick={() => setShowModal(false)}
                className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2.5 rounded-xl hover:bg-slate-50">
                Anulează
              </button>
              <button onClick={save} disabled={saving || !form.title || !form.description || !form.quotingDeadline}
                className="flex-1 bg-uat-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-uat-700 disabled:opacity-50">
                {saving ? "Se publică..." : "Publică lucrarea"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
