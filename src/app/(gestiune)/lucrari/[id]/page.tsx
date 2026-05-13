"use client";
// src/app/(dashboard)/lucrari/[id]/page.tsx

import { useState, useEffect, use } from "react";
import Link from "next/link";

type Supplier = {
  id: string; companyName: string; fiscalCode: string;
  phone: string | null; email: string;
  ratings: { score: number; raterRole: string }[];
};
type Quote = {
  id: string; price: number; leadDays: number;
  requiresSiteVisit: boolean; siteVisitNotes: string | null;
  description: string | null; status: string; submittedAt: string;
  supplier: Supplier;
};
type RFQ = {
  id: string; title: string; description: string;
  status: string; quotingDeadline: string; estimatedValue: number | null;
  categories: string[]; photos: string[];
  awardedSupplierId: string | null; awardReason: string | null;
  issue: { ticketNumber: string; category: string; location: string; description: string } | null;
  quotes: Quote[];
};
type SupplierOption = { id: string; companyName: string };

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Ciornă", PUBLISHED: "Publicată", UNDER_EVALUATION: "În evaluare",
  AWARDED: "Atribuită", CANCELLED: "Anulată", ARCHIVED: "Arhivată",
};

function fmt(n: number) {
  return n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function avgRating(ratings: { score: number }[]) {
  if (!ratings.length) return null;
  return Math.round(ratings.reduce((s, r) => s + r.score, 0) / ratings.length * 10) / 10;
}
function Stars({ score }: { score: number | null }) {
  if (score == null) return <span className="text-xs text-slate-300">Neevaluat</span>;
  const full = Math.round(score);
  return <span className="text-amber-400 text-sm" title={`${score}/5`}>{"★".repeat(full)}{"☆".repeat(5 - full)}</span>;
}

export default function LucrarePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [rfq, setRfq]         = useState<RFQ | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Quote form
  const [showQuote, setShowQuote]   = useState(false);
  const [qForm, setQForm] = useState({
    supplierId: "", price: "", leadDays: "",
    requiresSiteVisit: false, siteVisitNotes: "", description: "",
  });
  const [qSaving, setQSaving] = useState(false);
  const [qError, setQError]   = useState<string | null>(null);

  // Award form
  const [showAward, setShowAward]   = useState<Quote | null>(null);
  const [awardReason, setAwardReason] = useState("");
  const [awardSaving, setAwardSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/lucrari/${id}`).then(r => r.ok ? r.json() : null),
      fetch("/api/furnizori").then(r => r.ok ? r.json() : []),
    ]).then(([rfqData, suppData]) => {
      setRfq(rfqData);
      setSuppliers(suppData);
      if (suppData.length) setQForm(f => ({ ...f, supplierId: suppData[0].id }));
      setLoading(false);
    });
  }, [id]);

  async function submitQuote() {
    setQSaving(true); setQError(null);
    const res = await fetch(`/api/lucrari/${id}/oferte`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId:       qForm.supplierId,
        price:            parseFloat(qForm.price),
        leadDays:         parseInt(qForm.leadDays),
        requiresSiteVisit: qForm.requiresSiteVisit,
        siteVisitNotes:   qForm.siteVisitNotes || undefined,
        description:      qForm.description || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setQError(data.error); setQSaving(false); return; }
    setShowQuote(false);
    const updated = await fetch(`/api/lucrari/${id}`).then(r => r.json());
    setRfq(updated); setQSaving(false);
  }

  async function awardQuote(q: Quote) {
    setAwardSaving(true);
    await fetch(`/api/lucrari/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "AWARDED", awardedSupplierId: q.supplier.id, awardReason }),
    });
    const updated = await fetch(`/api/lucrari/${id}`).then(r => r.json());
    setRfq(updated); setShowAward(null); setAwardReason(""); setAwardSaving(false);
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-7 h-7 border-2 border-uat-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!rfq) return <p className="text-center py-20 text-slate-400">Lucrarea nu a fost găsită.</p>;

  const isAwarded = rfq.status === "AWARDED";

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/lucrari" className="hover:text-slate-600">Lucrări</Link>
        <span>›</span>
        <span className="text-slate-700">{rfq.title}</span>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h1 className="text-xl font-bold text-slate-900">{rfq.title}</h1>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-50 text-blue-700">
                {STATUS_LABEL[rfq.status] ?? rfq.status}
              </span>
            </div>
            {rfq.issue && (
              <p className="text-xs text-purple-600 bg-purple-50 rounded-lg px-3 py-1.5 mb-3 inline-block">
                Legat de avaria: {rfq.issue.ticketNumber} — {rfq.issue.location}
              </p>
            )}
            <p className="text-sm text-slate-600 whitespace-pre-line">{rfq.description}</p>
          </div>
          {!isAwarded && (
            <button onClick={() => setShowQuote(true)}
              className="flex-shrink-0 btn-primary text-sm">
              + Adaugă ofertă
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-100 text-sm text-slate-500">
          {rfq.categories.map(c => (
            <span key={c} className="bg-slate-100 px-2.5 py-0.5 rounded-full text-xs text-slate-600">{c}</span>
          ))}
          <span>Termen: <strong>{new Date(rfq.quotingDeadline).toLocaleDateString("ro-RO")}</strong></span>
          {rfq.estimatedValue && <span>Estimat: <strong>{fmt(rfq.estimatedValue)} RON</strong></span>}
        </div>

        {/* Photos */}
        {rfq.photos.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {rfq.photos.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-uat-600 hover:text-uat-800 bg-uat-50 px-3 py-1.5 rounded-lg">
                📷 Foto {i + 1}
              </a>
            ))}
          </div>
        )}

        {/* Awarded banner */}
        {isAwarded && rfq.awardedSupplierId && (
          <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
            <p className="text-sm font-medium text-emerald-700">
              ✓ Atribuită furnizorului: {rfq.quotes.find(q => q.supplier.id === rfq.awardedSupplierId)?.supplier.companyName}
            </p>
            {rfq.awardReason && <p className="text-xs text-emerald-600 mt-0.5">{rfq.awardReason}</p>}
          </div>
        )}
      </div>

      {/* Oferte */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Oferte primite</h2>
          <span className="text-sm text-slate-400">{rfq.quotes.length} ofertă{rfq.quotes.length !== 1 ? "e" : ""}</span>
        </div>

        {rfq.quotes.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">Nicio ofertă primită încă.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rfq.quotes.map((q, i) => {
              const avg = avgRating(q.supplier.ratings);
              const isWinner = rfq.awardedSupplierId === q.supplier.id;
              return (
                <div key={q.id} className={`px-6 py-5 ${isWinner ? "bg-emerald-50/50" : i === 0 && !isAwarded ? "bg-blue-50/30" : ""}`}>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500 flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-slate-800">{q.supplier.companyName}</p>
                        {isWinner && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">✓ Câștigătoare</span>}
                        {i === 0 && !isAwarded && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Ofertă minimă</span>}
                        {q.requiresSiteVisit
                          ? <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">Cu vizionare</span>
                          : <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Fără vizionare</span>
                        }
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        <Stars score={avg} />
                        {avg && <span className="text-xs text-slate-400 ml-1">{avg}/5 ({q.supplier.ratings.length} recenzii)</span>}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-slate-400">Preț ofertă</p>
                          <p className="font-bold text-slate-900">{fmt(q.price)} RON</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Termen execuție</p>
                          <p className="font-medium">{q.leadDays} zile</p>
                        </div>
                        {q.supplier.phone && (
                          <div>
                            <p className="text-xs text-slate-400">Telefon</p>
                            <p className="text-sm">{q.supplier.phone}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-slate-400">CIF</p>
                          <p className="text-sm font-mono">{q.supplier.fiscalCode}</p>
                        </div>
                      </div>
                      {q.description && (
                        <p className="text-sm text-slate-500 mt-2">{q.description}</p>
                      )}
                      {q.requiresSiteVisit && q.siteVisitNotes && (
                        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-1.5 mt-2">
                          Notă vizionare: {q.siteVisitNotes}
                        </p>
                      )}
                    </div>
                    {!isAwarded && (
                      <button onClick={() => { setShowAward(q); setAwardReason(""); }}
                        className="flex-shrink-0 text-sm font-medium px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
                        Atribuie
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal ofertă nouă ── */}
      {showQuote && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Adaugă ofertă</h2>
              <button onClick={() => setShowQuote(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Furnizor *</label>
                <select value={qForm.supplierId} onChange={e => setQForm(f => ({ ...f, supplierId: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-uat-500 focus:outline-none">
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.companyName}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Preț (RON) *</label>
                  <input type="number" step="100" value={qForm.price}
                    onChange={e => setQForm(f => ({ ...f, price: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-uat-500 focus:outline-none"
                    placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Termen execuție (zile) *</label>
                  <input type="number" min="1" value={qForm.leadDays}
                    onChange={e => setQForm(f => ({ ...f, leadDays: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-uat-500 focus:outline-none"
                    placeholder="ex: 30" />
                </div>
              </div>
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={qForm.requiresSiteVisit}
                    onChange={e => setQForm(f => ({ ...f, requiresSiteVisit: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-300 text-uat-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Ofertă cu vizionare</p>
                    <p className="text-xs text-slate-400">Furnizorul a văzut locația înainte de a oferta</p>
                  </div>
                </label>
                {qForm.requiresSiteVisit && (
                  <input type="text" value={qForm.siteVisitNotes}
                    onChange={e => setQForm(f => ({ ...f, siteVisitNotes: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-uat-500 focus:outline-none"
                    placeholder="Notă despre vizionare (opțional)..." />
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Detalii ofertă</label>
                <textarea value={qForm.description} onChange={e => setQForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-uat-500 focus:outline-none resize-none"
                  placeholder="Detalii suplimentare..." />
              </div>
              {qError && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{qError}</p>}
            </div>
            <div className="flex gap-3 px-6 pb-6 pt-2 border-t border-slate-100">
              <button onClick={() => setShowQuote(false)}
                className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2.5 rounded-xl hover:bg-slate-50">
                Anulează
              </button>
              <button onClick={submitQuote}
                disabled={qSaving || !qForm.supplierId || !qForm.price || !qForm.leadDays}
                className="flex-1 bg-uat-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-uat-700 disabled:opacity-50">
                {qSaving ? "Se salvează..." : "Salvează oferta"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal atribuire ── */}
      {showAward && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Atribuie lucrarea</h2>
            <p className="text-sm text-slate-600">
              Confirmi atribuirea lucrării către <strong>{showAward.supplier.companyName}</strong> pentru{" "}
              <strong>{fmt(showAward.price)} RON</strong>?
            </p>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Motivul atribuirii</label>
              <textarea value={awardReason} onChange={e => setAwardReason(e.target.value)}
                rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-uat-500 focus:outline-none resize-none"
                placeholder="ex: Ofertă cea mai avantajoasă, experiență dovedită..." />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAward(null)}
                className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2.5 rounded-xl hover:bg-slate-50">
                Anulează
              </button>
              <button onClick={() => awardQuote(showAward)} disabled={awardSaving}
                className="flex-1 bg-emerald-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-emerald-700 disabled:opacity-50">
                {awardSaving ? "Se procesează..." : "✓ Atribuie"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
