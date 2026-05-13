"use client";

import { useEffect, useState } from "react";

type SupplierStatus = "PENDING" | "VERIFIED" | "SUSPENDED" | "REJECTED";

type Supplier = {
  id: string;
  companyName: string;
  fiscalCode: string;
  email: string;
  phone: string | null;
  address: string | null;
  serviceCategories: string[];
  status: SupplierStatus;
  verifiedAt: string | null;
  ratings: { score: number; raterRole: string }[];
  _count: { associations: number };
};

type Allocation = {
  id: string;
  associationId: string;
  name: string;
  neighborhood: string | null;
  addedAt: string;
};

type AllocData = {
  allocations: Allocation[];
  available: { id: string; name: string; neighborhood: string | null }[];
};

const SERVICE_CATEGORIES = [
  "Apă și canal", "Energie electrică", "Gaze naturale", "Termoficare / Căldură", "Internet și TV",
  "Lifturi", "Instalații sanitare", "Instalații electrice", "Instalații termice", "Construcții și reparații",
  "Curățenie", "Administrare", "Contabilitate", "Pază și securitate", "Dezinsecție / Deratizare", "Altele",
];

const STATUS_BADGE: Record<SupplierStatus, string> = {
  PENDING:   "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  VERIFIED:  "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  SUSPENDED: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  REJECTED:  "bg-red-50 text-red-600 ring-1 ring-red-200",
};
const STATUS_LABEL: Record<SupplierStatus, string> = {
  PENDING: "În așteptare", VERIFIED: "Verificat", SUSPENDED: "Suspendat", REJECTED: "Respins",
};

const CATEGORY_ICON: Record<string, string> = {
  "Apă și canal": "💧", "Energie electrică": "⚡", "Gaze naturale": "🔵",
  "Termoficare / Căldură": "🔥", "Internet și TV": "📡", "Lifturi": "🛗",
  "Instalații sanitare": "🪠", "Instalații electrice": "🔌", "Instalații termice": "♨️",
  "Construcții și reparații": "🔨", "Curățenie": "🧹", "Administrare": "📋",
  "Contabilitate": "📊", "Pază și securitate": "🔒", "Dezinsecție / Deratizare": "🪲", "Altele": "📌",
};

function Stars({ ratings }: { ratings: { score: number }[] }) {
  if (!ratings.length) return <span className="text-xs text-slate-300">Fără recenzii</span>;
  const avg = ratings.reduce((s, r) => s + r.score, 0) / ratings.length;
  const rounded = Math.round(avg);
  return (
    <span className="flex items-center gap-1">
      <span className="text-amber-400 text-sm leading-none">{"★".repeat(rounded)}{"☆".repeat(5 - rounded)}</span>
      <span className="text-xs text-slate-400">({ratings.length})</span>
    </span>
  );
}

export default function FurnizoriPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("Toate");

  // Add supplier modal
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [form, setForm] = useState({ companyName: "", fiscalCode: "", email: "", phone: "", address: "", serviceCategories: [] as string[] });
  const [customCat, setCustomCat] = useState("");

  // Allocation modal
  const [allocSupplier, setAllocSupplier] = useState<Supplier | null>(null);
  const [allocData, setAllocData] = useState<AllocData | null>(null);
  const [allocLoading, setAllocLoading] = useState(false);
  const [selectedAssocId, setSelectedAssocId] = useState("");
  const [allocSaving, setAllocSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/furnizori");
    if (res.ok) setSuppliers(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function openAllocModal(s: Supplier) {
    setAllocSupplier(s);
    setAllocData(null);
    setSelectedAssocId("");
    setAllocLoading(true);
    const res = await fetch(`/api/furnizori/${s.id}/asociatii`);
    if (res.ok) setAllocData(await res.json());
    setAllocLoading(false);
  }

  async function addAllocation() {
    if (!allocSupplier || !selectedAssocId) return;
    setAllocSaving(true);
    await fetch(`/api/furnizori/${allocSupplier.id}/asociatii`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ associationId: selectedAssocId }),
    });
    // Refresh alloc data + supplier list
    const [allocRes] = await Promise.all([
      fetch(`/api/furnizori/${allocSupplier.id}/asociatii`),
    ]);
    if (allocRes.ok) setAllocData(await allocRes.json());
    setSelectedAssocId("");
    setAllocSaving(false);
    await load();
  }

  async function removeAllocation(assocId: string) {
    if (!allocSupplier) return;
    await fetch(`/api/furnizori/${allocSupplier.id}/asociatii/${assocId}`, { method: "DELETE" });
    const res = await fetch(`/api/furnizori/${allocSupplier.id}/asociatii`);
    if (res.ok) setAllocData(await res.json());
    await load();
  }

  function toggleCategory(cat: string) {
    setForm(f => ({
      ...f,
      serviceCategories: f.serviceCategories.includes(cat)
        ? f.serviceCategories.filter(c => c !== cat)
        : [...f.serviceCategories, cat],
    }));
  }

  async function addSupplier() {
    setSaving(true);
    setAddError(null);
    const res = await fetch("/api/furnizori", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setAddError(data.error ?? "Eroare la salvare"); setSaving(false); return; }
    setShowAdd(false);
    setForm({ companyName: "", fiscalCode: "", email: "", phone: "", address: "", serviceCategories: [] });
    await load();
    setSaving(false);
  }

  const allCategories = Array.from(new Set(suppliers.flatMap(s => s.serviceCategories ?? [])));
  const filtered = suppliers.filter(s => {
    const matchSearch = !search ||
      s.companyName.toLowerCase().includes(search.toLowerCase()) ||
      s.fiscalCode.includes(search) ||
      (s.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "Toate" || (s.serviceCategories ?? []).includes(filterCat);
    return matchSearch && matchCat;
  });

  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Furnizori</h1>
          <p className="text-sm text-slate-500 mt-1">Directorul prestatorilor de servicii</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setAddError(null); }}
          className="inline-flex items-center gap-2 bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Adaugă furnizor
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Caută după nume, CUI, email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"
        />
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="Toate">Toate categoriile</option>
          {allCategories.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Supplier list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p>{suppliers.length === 0 ? "Niciun furnizor înregistrat." : "Niciun rezultat pentru filtrele selectate."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 hover:border-slate-200 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate">{s.companyName}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">CUI: {s.fiscalCode}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_BADGE[s.status]}`}>
                  {STATUS_LABEL[s.status]}
                </span>
              </div>

              <div className="space-y-1.5 text-sm text-slate-600 mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  <a href={`mailto:${s.email}`} className="hover:text-emerald-600 truncate">{s.email}</a>
                </div>
                {s.phone && (
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                    <a href={`tel:${s.phone}`} className="hover:text-emerald-600">{s.phone}</a>
                  </div>
                )}
              </div>

              {(s.serviceCategories ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(s.serviceCategories ?? []).slice(0, 4).map(cat => (
                    <span key={cat} className="text-xs bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full border border-slate-100">
                      {CATEGORY_ICON[cat] ?? "•"} {cat}
                    </span>
                  ))}
                  {(s.serviceCategories ?? []).length > 4 && (
                    <span className="text-xs text-slate-400">+{(s.serviceCategories ?? []).length - 4}</span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                <Stars ratings={s.ratings ?? []} />
                <button
                  onClick={() => openAllocModal(s)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-2.5 py-1 rounded-full transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75" />
                  </svg>
                  {s._count.associations} {s._count.associations === 1 ? "asociație" : "asociații"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Allocation modal ─────────────────────────────────────── */}
      {allocSupplier && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h2 className="text-base font-semibold text-slate-900">{allocSupplier.companyName}</h2>
                <p className="text-xs text-slate-400 mt-0.5">Asociații alocate</p>
              </div>
              <button onClick={() => setAllocSupplier(null)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {allocLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : allocData ? (
                <>
                  {/* Current allocations */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Alocate ({allocData.allocations.length})
                    </p>
                    {allocData.allocations.length === 0 ? (
                      <p className="text-sm text-slate-400 italic">Nicio asociație alocată încă.</p>
                    ) : (
                      <div className="space-y-2">
                        {allocData.allocations.map(a => (
                          <div key={a.id} className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{a.name}</p>
                              {a.neighborhood && <p className="text-xs text-slate-400">{a.neighborhood}</p>}
                            </div>
                            <button
                              onClick={() => removeAllocation(a.associationId)}
                              className="ml-3 flex-shrink-0 text-slate-400 hover:text-red-500 transition-colors"
                              title="Elimină alocarea"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add new association */}
                  {allocData.available.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        Adaugă asociație
                      </p>
                      <div className="flex gap-2">
                        <select
                          value={selectedAssocId}
                          onChange={e => setSelectedAssocId(e.target.value)}
                          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">Selectează asociație...</option>
                          {allocData.available.map(a => (
                            <option key={a.id} value={a.id}>
                              {a.name}{a.neighborhood ? ` — ${a.neighborhood}` : ""}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={addAllocation}
                          disabled={!selectedAssocId || allocSaving}
                          className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors flex-shrink-0"
                        >
                          {allocSaving ? "..." : "Adaugă"}
                        </button>
                      </div>
                    </div>
                  )}

                  {allocData.available.length === 0 && allocData.allocations.length > 0 && (
                    <p className="text-xs text-slate-400 italic">Furnizorul este alocat la toate asociațiile pe care le gestionați.</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-red-500">Eroare la încărcarea datelor.</p>
              )}
            </div>

            <div className="p-4 border-t border-slate-100">
              <button
                onClick={() => setAllocSupplier(null)}
                className="w-full border border-slate-200 text-slate-600 text-sm font-medium py-2 rounded-lg hover:bg-slate-50"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add supplier modal ───────────────────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-slate-900">Adaugă furnizor</h2>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Denumire firmă *</label>
                  <input type="text" value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="SC Exemplu SRL" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">CUI *</label>
                  <input type="text" value={form.fiscalCode} onChange={e => setForm(f => ({ ...f, fiscalCode: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="RO12345678" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Telefon</label>
                  <input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="07xx xxx xxx" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="contact@firma.ro (opțional)" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Adresă</label>
                  <input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Str. Exemplu nr. 1, Sector 1" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">Categorii de servicii</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {SERVICE_CATEGORIES.map(cat => (
                    <button key={cat} type="button" onClick={() => toggleCategory(cat)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        form.serviceCategories.includes(cat)
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"
                      }`}>
                      {CATEGORY_ICON[cat]} {cat}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-1">
                  <input type="text" value={customCat} onChange={e => setCustomCat(e.target.value)}
                    placeholder="Adaugă categorie nouă..."
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  <button type="button" onClick={() => {
                    const c = customCat.trim();
                    if (c && !form.serviceCategories.includes(c)) setForm(f => ({ ...f, serviceCategories: [...f.serviceCategories, c] }));
                    setCustomCat("");
                  }} disabled={!customCat.trim()}
                    className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white disabled:opacity-40 hover:bg-emerald-700">
                    Adaugă
                  </button>
                </div>
              </div>
              {addError && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{addError}</p>}
            </div>
            <div className="p-6 pt-0 flex gap-3 sticky bottom-0 bg-white border-t border-slate-100">
              <button onClick={() => setShowAdd(false)}
                className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2 rounded-lg hover:bg-slate-50">
                Anulează
              </button>
              <button onClick={addSupplier} disabled={saving || !form.companyName || !form.fiscalCode}
                className="flex-1 bg-emerald-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                {saving ? "Se salvează..." : "Adaugă"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
