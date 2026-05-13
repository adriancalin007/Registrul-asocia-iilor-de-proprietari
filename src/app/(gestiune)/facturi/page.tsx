"use client";
// src/app/(dashboard)/facturi/page.tsx

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Invoice = {
  id: string;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  totalAmount: number | null;
  vatAmount: number | null;
  netAmount: number | null;
  currency: string;
  supplierId: string | null;
  supplier: { id: string; companyName: string; fiscalCode: string } | null;
  supplierName: string | null;
  supplierCui: string | null;
  iban: string | null;
  category: string | null;
  description: string | null;
  documentUrl: string | null;
  ocrProcessed: boolean;
  month: number;
  year: number;
  _count: { expenses: number };
};

type Supplier = { id: string; companyName: string; fiscalCode: string };

const MONTH_NAMES = [
  "", "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
];

const EXPENSE_CATEGORIES = [
  "Apă și canal", "Energie electrică", "Gaze naturale", "Termoficare / Căldură",
  "Lift", "Instalații sanitare", "Instalații electrice", "Instalații termice",
  "Reparații", "Curățenie", "Administrare", "Salarii", "Dezinsecție / Deratizare",
  "Fond rulment", "Fond reparații", "Altele",
];

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const emptyForm = () => ({
  documentUrl: "",
  invoiceNumber: "",
  invoiceDate: "",
  dueDate: "",
  totalAmount: "",
  vatAmount: "",
  netAmount: "",
  currency: "RON",
  supplierId: "",
  supplierName: "",
  supplierCui: "",
  iban: "",
  category: "",
  description: "",
});

// ─── Drag-and-drop zone ───────────────────────────────────────────────────────

function DropZone({
  onFile,
  uploading,
  uploadMsg,
}: {
  onFile: (f: File) => void;
  uploading: boolean;
  uploadMsg: string | null;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      className={`relative rounded-xl border-2 border-dashed cursor-pointer transition-all p-8 text-center
        ${dragging ? "border-uat-500 bg-uat-50" : "border-slate-200 hover:border-uat-400 hover:bg-slate-50"}
        ${uploading ? "pointer-events-none opacity-70" : ""}`}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        onChange={e => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-uat-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-uat-600 font-medium">Se încarcă și procesează OCR...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 pointer-events-none">
          <svg className={`w-10 h-10 ${dragging ? "text-uat-500" : "text-slate-300"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p className={`text-sm font-medium ${dragging ? "text-uat-700" : "text-slate-500"}`}>
            {dragging ? "Eliberează pentru a încărca" : "Trage factura aici sau click pentru a alege"}
          </p>
          <p className="text-xs text-slate-400">PDF, JPG, PNG — max 15 MB · OCR automat</p>
        </div>
      )}
      {uploadMsg && !uploading && (
        <div className={`mt-3 text-xs rounded-lg px-3 py-2 ${uploadMsg.startsWith("✓") ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {uploadMsg}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FacturiPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  const [invoices,  setInvoices]  = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading,   setLoading]   = useState(true);

  const [showModal,      setShowModal]      = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [form,           setForm]           = useState(emptyForm());
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState<string | null>(null);

  const [uploading,  setUploading]  = useState(false);
  const [uploadMsg,  setUploadMsg]  = useState<string | null>(null);

  const [ocrId,      setOcrId]      = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrMsg,     setOcrMsg]     = useState<string | null>(null);

  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`/api/facturi?month=${month}&year=${year}`);
    if (r.ok) setInvoices(await r.json());
    setLoading(false);
  }, [month, year]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/furnizori").then(r => r.ok ? r.json() : []).then(setSuppliers);
  }, []);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  function openNew() {
    setEditingInvoice(null);
    setForm(emptyForm());
    setUploadMsg(null);
    setError(null);
    setShowModal(true);
  }

  function openEdit(inv: Invoice) {
    setEditingInvoice(inv);
    setForm({
      documentUrl:   inv.documentUrl   ?? "",
      invoiceNumber: inv.invoiceNumber  ?? "",
      invoiceDate:   inv.invoiceDate    ? inv.invoiceDate.slice(0, 10) : "",
      dueDate:       inv.dueDate        ? inv.dueDate.slice(0, 10)    : "",
      totalAmount:   inv.totalAmount    != null ? String(inv.totalAmount)  : "",
      vatAmount:     inv.vatAmount      != null ? String(inv.vatAmount)    : "",
      netAmount:     inv.netAmount      != null ? String(inv.netAmount)    : "",
      currency:      inv.currency,
      supplierId:    inv.supplierId     ?? "",
      supplierName:  inv.supplierName   ?? "",
      supplierCui:   inv.supplierCui    ?? "",
      iban:          inv.iban           ?? "",
      category:      inv.category       ?? "",
      description:   inv.description    ?? "",
    });
    setUploadMsg(null);
    setError(null);
    setShowModal(true);
  }

  // ── Handle file drop / pick ──────────────────────────────────────────────────
  async function handleFile(file: File) {
    setUploading(true);
    setUploadMsg(null);
    setError(null);

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/facturi/upload", { method: "POST", body: fd });
    const data = await res.json();

    if (!res.ok) {
      setUploadMsg(`⚠ ${data.error ?? "Eroare la încărcare"}`);
      setUploading(false);
      return;
    }

    const d = data.data ?? {};
    setForm(f => ({
      ...f,
      documentUrl:   data.documentUrl ?? f.documentUrl,
      supplierName:  d.supplierName  ?? f.supplierName,
      supplierCui:   d.supplierCui   ?? f.supplierCui,
      iban:          d.iban          ?? f.iban,
      invoiceNumber: d.invoiceNumber ?? f.invoiceNumber,
      invoiceDate:   d.invoiceDate   ?? f.invoiceDate,
      dueDate:       d.dueDate       ?? f.dueDate,
      totalAmount:   d.totalAmount   != null ? String(d.totalAmount) : f.totalAmount,
      vatAmount:     d.vatAmount     != null ? String(d.vatAmount)   : f.vatAmount,
      netAmount:     d.netAmount     != null ? String(d.netAmount)   : f.netAmount,
      currency:      d.currency      ?? f.currency,
      description:   d.description   ?? f.description,
      category:      d.category      ?? f.category,
    }));

    if (data.ocrError) {
      setUploadMsg(`⚠ ${data.ocrError}`);
    } else if (d.supplierName || d.totalAmount != null) {
      setUploadMsg(`✓ OCR: ${d.supplierName ?? "furnizor"} · ${d.totalAmount ?? "?"} ${d.currency ?? "RON"} · ${file.name}`);
    } else {
      setUploadMsg(`✓ ${file.name} încărcat — verificați câmpurile`);
    }

    setUploading(false);
  }

  // ── Save invoice ─────────────────────────────────────────────────────────────
  async function save() {
    setSaving(true); setError(null);
    const body = {
      documentUrl:   form.documentUrl   || undefined,
      invoiceNumber: form.invoiceNumber  || undefined,
      invoiceDate:   form.invoiceDate    || undefined,
      dueDate:       form.dueDate        || undefined,
      totalAmount:   form.totalAmount    ? parseFloat(form.totalAmount)  : undefined,
      vatAmount:     form.vatAmount      ? parseFloat(form.vatAmount)    : undefined,
      netAmount:     form.netAmount      ? parseFloat(form.netAmount)    : undefined,
      currency:      form.currency,
      supplierId:    form.supplierId     || undefined,
      supplierName:  form.supplierName   || undefined,
      supplierCui:   form.supplierCui    || undefined,
      iban:          form.iban           || undefined,
      category:      form.category       || undefined,
      description:   form.description    || undefined,
    };

    let res: Response;
    if (editingInvoice) {
      res = await fetch(`/api/facturi/${editingInvoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      res = await fetch("/api/facturi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, ocrProcessed: !!form.documentUrl, month, year }),
      });
    }

    const data = await res.json();
    if (!res.ok) { setError(data.error); setSaving(false); return; }
    setShowModal(false);
    setEditingInvoice(null);
    setForm(emptyForm());
    setUploadMsg(null);
    await load();
    setSaving(false);
  }

  // ── Run OCR on existing invoice (URL) ────────────────────────────────────────
  async function runOcr(id: string) {
    setOcrId(id); setOcrLoading(true); setOcrMsg(null);
    const res = await fetch(`/api/facturi/${id}/ocr`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setOcrMsg(`✓ ${data.extracted?.supplierName ?? "furnizor"} — ${data.extracted?.totalAmount ?? "?"} ${data.extracted?.currency ?? "RON"}`);
      await load();
    } else {
      setOcrMsg(`⚠ ${data.error}`);
    }
    setOcrLoading(false);
  }

  async function del(id: string) {
    if (!confirm("Ștergi această factură? Va fi dezlegată din cheltuielile asociate.")) return;
    setDeleting(id);
    await fetch(`/api/facturi/${id}`, { method: "DELETE" });
    await load();
    setDeleting(null);
  }

  const totalMonth = invoices.reduce((s, inv) => s + (inv.totalAmount ?? 0), 0);

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Facturi</h1>
          <p className="text-sm text-slate-500 mt-0.5">Registru facturi — legate de cheltuielile lunare</p>
        </div>
        <button onClick={openNew} className="btn-primary flex-shrink-0">
          + Factură nouă
        </button>
      </div>

      {/* Month navigation */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex items-center gap-4">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="flex-1 text-center">
          <p className="text-lg font-semibold text-slate-900">{MONTH_NAMES[month]} {year}</p>
          {!loading && (
            <p className="text-xs text-slate-400 mt-0.5">
              {invoices.length} factur{invoices.length === 1 ? "ă" : "i"} · Total {fmt(totalMonth)} RON
            </p>
          )}
        </div>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {ocrMsg && (
        <div className={`text-sm rounded-xl px-4 py-3 border ${ocrMsg.startsWith("✓") ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"}`}>
          {ocrLoading && <span className="inline-block w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin mr-2 align-middle" />}
          {ocrMsg}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-uat-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
          <p className="text-4xl mb-3">🧾</p>
          <p className="text-slate-600 font-medium">Nicio factură pentru {MONTH_NAMES[month]} {year}</p>
          <p className="text-sm text-slate-400 mt-1 mb-5">Trage un PDF direct sau adaugă manual.</p>
          <button onClick={openNew} className="btn-primary">
            + Factură nouă
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map(inv => {
            const supplierDisplay = inv.supplier?.companyName ?? inv.supplierName ?? "Furnizor nespecificat";
            return (
              <div key={inv.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
                <div className="flex items-start gap-4">
                  {/* Clickable info area */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => openEdit(inv)}
                    title="Click pentru a edita"
                  >
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-slate-900 truncate hover:text-uat-700 transition-colors">{supplierDisplay}</p>
                      {inv.ocrProcessed && (
                        <span className="text-xs bg-uat-50 text-uat-600 px-2 py-0.5 rounded-full">✓ OCR</span>
                      )}
                      {inv.category && (
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{inv.category}</span>
                      )}
                      {inv._count.expenses > 0 && (
                        <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">
                          Legată de {inv._count.expenses} cheltuial{inv._count.expenses === 1 ? "ă" : "e"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                      {inv.invoiceNumber && <span>Nr. {inv.invoiceNumber}</span>}
                      {inv.invoiceDate && <span>{new Date(inv.invoiceDate).toLocaleDateString("ro-RO")}</span>}
                      {inv.supplierCui && <span>CUI: {inv.supplierCui}</span>}
                      {inv.iban && <span className="font-mono">{inv.iban}</span>}
                      {inv.description && <span className="truncate max-w-xs">{inv.description}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-800">{fmt(inv.totalAmount)} <span className="text-sm font-normal text-slate-400">{inv.currency}</span></p>
                      {inv.vatAmount != null && (
                        <p className="text-xs text-slate-400">TVA: {fmt(inv.vatAmount)}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => openEdit(inv)}
                        className="text-xs px-2 py-1 rounded-lg border border-uat-200 text-uat-600 hover:bg-uat-50"
                      >
                        Edit
                      </button>
                      {inv.documentUrl && !inv.ocrProcessed && (
                        <button onClick={() => runOcr(inv.id)}
                          disabled={ocrLoading && ocrId === inv.id}
                          className="text-xs px-2 py-1 rounded-lg bg-uat-50 text-uat-600 hover:bg-uat-100 disabled:opacity-50">
                          {ocrLoading && ocrId === inv.id ? "..." : "OCR"}
                        </button>
                      )}
                      {inv.documentUrl && (
                        <a href={inv.documentUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs px-2 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 text-center">
                          Doc
                        </a>
                      )}
                      <button onClick={() => del(inv.id)} disabled={deleting === inv.id}
                        className="text-xs px-2 py-1 rounded-lg border border-red-100 text-red-400 hover:border-red-300 hover:text-red-600 disabled:opacity-50">
                        {deleting === inv.id ? "..." : "Șterge"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit modal ──────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingInvoice ? "Editează factura" : "Factură nouă"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">{MONTH_NAMES[month]} {year}</p>
              </div>
              <button onClick={() => { setShowModal(false); setEditingInvoice(null); }} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">

              {/* Drop zone — only for new invoices */}
              {!editingInvoice && (
                <DropZone onFile={handleFile} uploading={uploading} uploadMsg={uploadMsg} />
              )}

              {/* Re-upload option when editing */}
              {editingInvoice && (
                <div className="flex items-center gap-2">
                  <label className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border cursor-pointer transition-colors ${uploading ? "opacity-50 pointer-events-none" : "bg-slate-50 border-slate-200 text-slate-600 hover:border-uat-300 hover:text-uat-700"}`}>
                    {uploading ? (
                      <><span className="w-3.5 h-3.5 border border-uat-500 border-t-transparent rounded-full animate-spin" /> Procesez...</>
                    ) : (
                      <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>Reîncarcă fișier (OCR)</>
                    )}
                    <input type="file" className="hidden" accept="application/pdf,image/jpeg,image/png,image/webp"
                      onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                  </label>
                  {uploadMsg && <span className={`text-xs ${uploadMsg.startsWith("✓") ? "text-emerald-600" : "text-amber-600"}`}>{uploadMsg}</span>}
                </div>
              )}

              {/* URL field */}
              {!form.documentUrl ? (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    {editingInvoice ? "URL document" : "sau adaugă link (Google Drive, URL direct)"}
                  </label>
                  <input type="url" value={form.documentUrl}
                    onChange={e => setForm(f => ({ ...f, documentUrl: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-uat-500 focus:outline-none"
                    placeholder="https://drive.google.com/file/d/..." />
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                  <svg className="w-4 h-4 text-uat-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                  <a href={form.documentUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-uat-600 truncate flex-1 hover:underline">{form.documentUrl}</a>
                  <button onClick={() => setForm(f => ({ ...f, documentUrl: "" }))} className="text-slate-400 hover:text-red-500 text-xs flex-shrink-0">×</button>
                </div>
              )}

              <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Număr factură</label>
                  <input type="text" value={form.invoiceNumber}
                    onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-uat-500 focus:outline-none"
                    placeholder="FAC-2026-001" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Data facturii</label>
                  <input type="date" value={form.invoiceDate}
                    onChange={e => setForm(f => ({ ...f, invoiceDate: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-uat-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Total (RON)</label>
                  <input type="number" step="0.01" value={form.totalAmount}
                    onChange={e => setForm(f => ({ ...f, totalAmount: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-uat-500 focus:outline-none"
                    placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">din care TVA (RON)</label>
                  <input type="number" step="0.01" value={form.vatAmount}
                    onChange={e => setForm(f => ({ ...f, vatAmount: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-uat-500 focus:outline-none"
                    placeholder="opțional" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Furnizor din director</label>
                  <select value={form.supplierId}
                    onChange={e => {
                      const s = suppliers.find(x => x.id === e.target.value);
                      setForm(f => ({
                        ...f,
                        supplierId:   e.target.value,
                        supplierName: s ? s.companyName : f.supplierName,
                        supplierCui:  s ? s.fiscalCode  : f.supplierCui,
                      }));
                    }}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-uat-500 focus:outline-none">
                    <option value="">— opțional —</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.companyName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Denumire emitent</label>
                  <input type="text" value={form.supplierName}
                    onChange={e => setForm(f => ({ ...f, supplierName: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-uat-500 focus:outline-none"
                    placeholder="dacă nu e în director" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">CUI emitent</label>
                  <input type="text" value={form.supplierCui}
                    onChange={e => setForm(f => ({ ...f, supplierCui: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-uat-500 focus:outline-none"
                    placeholder="12345678" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">IBAN emitent</label>
                  <input type="text" value={form.iban}
                    onChange={e => setForm(f => ({ ...f, iban: e.target.value.toUpperCase() }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-uat-500 focus:outline-none font-mono"
                    placeholder="RO49AAAA1B31007593840000" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Categorie cheltuială</label>
                  <select value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-uat-500 focus:outline-none">
                    <option value="">— opțional —</option>
                    {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Descriere</label>
                  <input type="text" value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-uat-500 focus:outline-none"
                    placeholder="ex: Energie electrică părți comune mai 2026" />
                </div>
              </div>

              {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            </div>

            <div className="flex gap-3 px-6 pb-6 pt-2 border-t border-slate-100">
              <button onClick={() => { setShowModal(false); setEditingInvoice(null); }}
                className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2.5 rounded-xl hover:bg-slate-50">
                Anulează
              </button>
              <button onClick={save} disabled={saving || uploading}
                className="flex-1 bg-uat-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-uat-700 disabled:opacity-50">
                {saving ? "Se salvează..." : editingInvoice ? "Salvează modificările" : "Salvează factura"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
