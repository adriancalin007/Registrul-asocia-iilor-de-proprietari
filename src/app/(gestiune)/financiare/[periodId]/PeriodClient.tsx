"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type DistribType = "BY_SHARE" | "EQUAL" | "BY_PERSON" | "BY_AREA";
type Allocation = { type: DistribType; percentage: number };

type Expense = {
  id: string;
  category: string;
  description: string;
  totalAmount: number;
  distributionType: DistribType;
  allocations: Allocation[] | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
};

type MeterReading = {
  id: string;
  unitId: string;
  meterType: string;
  previousIndex: number;
  currentIndex: number;
  consumption: number;
  unitPrice: number | null;
  readAt: string;
  unit: { number: string };
};

type PaymentItem = {
  id: string;
  unitAmount: number;
  previousDebt: number;
  totalDue: number;
  paidAmount: number;
  paidAt: string | null;
  status: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";
  notes: string | null;
  ownership: {
    user: { fullName: string; email: string };
    unit: { number: string; floor: number | null };
  };
};

type Unit = { id: string; number: string; floor: number | null; shareRatio: number | null; residents: number | null };

type Period = {
  id: string;
  year: number;
  month: number;
  status: "DRAFT" | "FINALIZED" | "ARCHIVED";
  notes: string | null;
  generatedAt: string | null;
  expenses: Expense[];
  meterReadings: MeterReading[];
  paymentItems: PaymentItem[];
  association: { buildings: { units: Unit[] }[] };
};

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "", "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
];

const METER_TYPES = ["COLD_WATER", "HOT_WATER", "HEAT", "ELECTRICITY", "GAS"] as const;
const METER_LABELS: Record<string, string> = {
  COLD_WATER: "Apă rece", HOT_WATER: "Apă caldă", HEAT: "Căldură",
  ELECTRICITY: "Energie electrică", GAS: "Gaze",
};

const EXPENSE_CATEGORIES = [
  "Apă și canal", "Energie electrică", "Gaze naturale", "Termoficare / Căldură",
  "Apă rece (individual)", "Apă caldă (individual)",
  "Lift", "Curățenie", "Administrație", "Salarii", "Reparații",
  "Fond rulment", "Fond reparații", "Dezinsecție / Deratizare",
  "Servicii comune", "Altele",
];

const DISTRIB_LABELS: Record<DistribType, string> = {
  BY_SHARE:  "Cotă-parte (indivizã)",
  EQUAL:     "Egal per apt.",
  BY_PERSON: "Per persoane",
  BY_AREA:   "Suprafață (m²)",
};

const PAYMENT_STATUS_BADGE: Record<string, string> = {
  PENDING:  "bg-amber-50 text-amber-700",
  PARTIAL:  "bg-blue-50 text-blue-700",
  PAID:     "bg-emerald-50 text-emerald-700",
  OVERDUE:  "bg-red-50 text-red-600",
};
const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Neachitat", PARTIAL: "Parțial", PAID: "Achitat", OVERDUE: "Restanță",
};

function fmt(n: number) {
  return n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Component ────────────────────────────────────────────────────────────────

type Supplier = { id: string; companyName: string; serviceCategories: string[] };
type InvoiceRef = {
  id: string; invoiceNumber: string | null; invoiceDate: string | null;
  totalAmount: number | null; vatAmount: number | null; currency: string;
  supplierId: string | null; supplierName: string | null;
  supplier: { companyName: string } | null;
  category: string | null; description: string | null;
};

export default function PeriodClient({ period: initial }: { period: Period }) {
  const [period, setPeriod] = useState<Period>(initial);
  const [tab, setTab] = useState<"expenses" | "meters" | "payments">("expenses");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [invoices,  setInvoices]  = useState<InvoiceRef[]>([]);

  // ── Load suppliers + invoices once ──
  useEffect(() => {
    fetch("/api/furnizori").then(r => r.ok ? r.json() : []).then(setSuppliers);
    fetch(`/api/facturi?month=${period.month}&year=${period.year}`)
      .then(r => r.ok ? r.json() : []).then(setInvoices);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Reload period ──
  async function reload() {
    const res = await fetch(`/api/financiare/${period.id}`);
    if (res.ok) setPeriod(await res.json());
  }

  const readOnly = period.status === "ARCHIVED";
  const allUnits = period.association.buildings.flatMap(b => b.units);

  // ─────────────────────────────────────────────────────────────────────────────
  // EXPENSES TAB
  // ─────────────────────────────────────────────────────────────────────────────

  const [expForm, setExpForm] = useState({
    supplierId: "",
    invoiceId: "",
    category: EXPENSE_CATEGORIES[0],
    customCategory: "",
    description: "",
    totalAmount: "",
    invoiceNumber: "",
    invoiceDate: "",
  });
  const [allocations, setAllocations] = useState<Allocation[]>([
    { type: "BY_SHARE", percentage: 100 },
  ]);
  const [expSaving, setExpSaving] = useState(false);
  const [expError, setExpError] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrMsg, setOcrMsg] = useState<string | null>(null);

  async function handleOcrUpload(file: File) {
    setOcrLoading(true);
    setOcrMsg(null);
    setExpError(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/financiare/ocr-factura", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) {
      setExpError(data.error ?? "Eroare OCR");
      setOcrLoading(false);
      return;
    }
    const d = data.data;
    setExpForm(f => ({
      ...f,
      category:      d.category && EXPENSE_CATEGORIES.includes(d.category) ? d.category : "Altele",
      customCategory: d.category && !EXPENSE_CATEGORIES.includes(d.category) ? d.category : "",
      description:   d.description   ?? d.supplierName ?? f.description,
      totalAmount:   d.totalAmount    != null ? String(d.totalAmount) : f.totalAmount,
      invoiceNumber: d.invoiceNumber  ?? f.invoiceNumber,
      invoiceDate:   d.invoiceDate    ?? f.invoiceDate,
    }));
    setOcrMsg(`✓ Factură recunoscută: ${d.supplierName ?? "furnizor necunoscut"} — ${d.totalAmount ?? "?"} ${d.currency ?? "RON"}`);
    setOcrLoading(false);
  }

  async function addExpense() {
    setExpSaving(true);
    setExpError(null);
    const totalPct = allocations.reduce((s, a) => s + a.percentage, 0);
    if (Math.abs(totalPct - 100) > 0.5) {
      setExpError(`Procentele trebuie să totalizeze 100% (acum: ${totalPct}%)`);
      setExpSaving(false);
      return;
    }
    const finalCategory = expForm.category === "Altele" && expForm.customCategory.trim()
      ? expForm.customCategory.trim()
      : expForm.category;
    const isSplit = allocations.length > 1 || allocations[0]?.type !== "BY_SHARE";
    const res = await fetch(`/api/financiare/${period.id}/cheltuieli`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category:         finalCategory,
        description:      expForm.description,
        totalAmount:      parseFloat(expForm.totalAmount) || 0,
        distributionType: allocations[0]?.type ?? "BY_SHARE",
        allocations:      isSplit ? allocations : undefined,
        invoiceNumber:    expForm.invoiceNumber || undefined,
        invoiceDate:      expForm.invoiceDate   || undefined,
        invoiceId:        expForm.invoiceId     || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setExpError(data.error ?? "Eroare"); setExpSaving(false); return; }
    setExpForm(f => ({ ...f, invoiceId: "", description: "", totalAmount: "", invoiceNumber: "", invoiceDate: "" }));
    setAllocations([{ type: "BY_SHARE", percentage: 100 }]);
    await reload();
    setExpSaving(false);
  }

  async function deleteExpense(id: string) {
    if (!confirm("Șterge această cheltuială?")) return;
    await fetch(`/api/financiare/${period.id}/cheltuieli`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expenseId: id }),
    });
    await reload();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GENERATE / ARCHIVE
  // ─────────────────────────────────────────────────────────────────────────────

  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState<string | null>(null);

  async function generate() {
    setGenerating(true);
    setGenMsg(null);
    const res = await fetch(`/api/financiare/${period.id}/genereaza`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) { setGenMsg(data.error ?? "Eroare la generare"); setGenerating(false); return; }
    setGenMsg(`Lista de plată generată pentru ${data.count} proprietari.`);
    await reload();
    setTab("payments");
    setGenerating(false);
  }

  async function archive() {
    if (!confirm("Arhivezi luna? Perioada va deveni read-only.")) return;
    const res = await fetch(`/api/financiare/${period.id}/archiva`, { method: "PATCH" });
    if (res.ok) await reload();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // METERS TAB
  // ─────────────────────────────────────────────────────────────────────────────

  const [meterForm, setMeterForm] = useState({
    unitId: allUnits[0]?.id ?? "",
    meterType: "COLD_WATER" as string,
    previousIndex: "",
    currentIndex: "",
    unitPrice: "",
    readAt: new Date().toISOString().slice(0, 10),
  });
  const [meterSaving, setMeterSaving] = useState(false);
  const [meterError, setMeterError] = useState<string | null>(null);

  async function addReading() {
    setMeterSaving(true);
    setMeterError(null);
    const res = await fetch(`/api/financiare/${period.id}/contoare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        unitId:        meterForm.unitId,
        meterType:     meterForm.meterType,
        previousIndex: parseFloat(meterForm.previousIndex) || 0,
        currentIndex:  parseFloat(meterForm.currentIndex)  || 0,
        unitPrice:     meterForm.unitPrice ? parseFloat(meterForm.unitPrice) : undefined,
        readAt:        meterForm.readAt,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setMeterError(data.error ?? "Eroare"); setMeterSaving(false); return; }
    setMeterForm(f => ({ ...f, previousIndex: "", currentIndex: "", unitPrice: "" }));
    await reload();
    setMeterSaving(false);
  }

  async function deleteReading(id: string) {
    await fetch(`/api/financiare/${period.id}/contoare`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ readingId: id }),
    });
    await reload();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PAYMENTS TAB
  // ─────────────────────────────────────────────────────────────────────────────

  const [payModal, setPayModal] = useState<PaymentItem | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [paySaving, setPaySaving] = useState(false);

  async function recordPayment() {
    if (!payModal) return;
    setPaySaving(true);
    const res = await fetch(`/api/financiare/${period.id}/plata`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentItemId: payModal.id,
        amount: parseFloat(payAmount) || 0,
        notes: payNotes || undefined,
      }),
    });
    if (res.ok) {
      setPayModal(null);
      await reload();
    }
    setPaySaving(false);
  }

  async function resetPayment(id: string) {
    if (!confirm("Resetezi plata acestui proprietar?")) return;
    await fetch(`/api/financiare/${period.id}/plata`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentItemId: id }),
    });
    await reload();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TOTALS
  // ─────────────────────────────────────────────────────────────────────────────

  const totalExpenses = period.expenses.reduce((s, e) => s + e.totalAmount, 0);
  const totalDue      = period.paymentItems.reduce((s, i) => s + i.totalDue, 0);
  const totalPaid     = period.paymentItems.reduce((s, i) => s + i.paidAmount, 0);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  const STATUS_BADGE: Record<Period["status"], string> = {
    DRAFT:     "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    FINALIZED: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    ARCHIVED:  "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
  };
  const STATUS_LABEL: Record<Period["status"], string> = {
    DRAFT: "În lucru", FINALIZED: "Finalizat", ARCHIVED: "Arhivat",
  };

  return (
    <div className="max-w-5xl mx-auto">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
        <Link href="/financiare" className="hover:text-uat-600">Gestiune financiară</Link>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-slate-600 font-medium">{MONTH_NAMES[period.month]} {period.year}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">
            {MONTH_NAMES[period.month]} {period.year}
          </h1>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_BADGE[period.status]}`}>
            {STATUS_LABEL[period.status]}
          </span>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2">
            {period.status === "FINALIZED" && (
              <button
                onClick={archive}
                className="text-sm text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50"
              >
                Arhivează luna
              </button>
            )}
            <button
              onClick={generate}
              disabled={generating || period.expenses.length === 0}
              className="inline-flex items-center gap-2 bg-uat-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-uat-700 disabled:opacity-40 transition-colors"
            >
              {generating ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m0 0l-6.75-6.75M20.25 12l-6.75 6.75" />
                </svg>
              )}
              {period.status === "DRAFT" ? "Generează lista" : "Regenerează"}
            </button>
          </div>
        )}
      </div>

      {genMsg && (
        <div className="mb-4 text-sm bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg px-4 py-2.5">
          {genMsg}
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Cheltuieli totale", value: fmt(totalExpenses) + " RON", color: "text-slate-700" },
          { label: "De achitat", value: fmt(totalDue) + " RON", color: "text-slate-700" },
          { label: "Încasat", value: fmt(totalPaid) + " RON", color: "text-emerald-600" },
          { label: "Restanță", value: fmt(Math.max(0, totalDue - totalPaid)) + " RON", color: "text-red-500" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-4">
            <p className="text-xs text-slate-400 mb-1">{s.label}</p>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100">
          {(["expenses", "meters", "payments"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 sm:flex-none px-6 py-3.5 text-sm font-medium transition-colors ${
                tab === t
                  ? "border-b-2 border-uat-600 text-uat-700 bg-uat-50/50"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t === "expenses" ? "Cheltuieli" : t === "meters" ? "Contoare" : "Listă plată"}
              {t === "expenses" && period.expenses.length > 0 && (
                <span className="ml-1.5 bg-slate-100 text-slate-500 text-xs rounded-full px-1.5 py-0.5">
                  {period.expenses.length}
                </span>
              )}
              {t === "payments" && period.paymentItems.length > 0 && (
                <span className="ml-1.5 bg-slate-100 text-slate-500 text-xs rounded-full px-1.5 py-0.5">
                  {period.paymentItems.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-6">

          {/* ── EXPENSES TAB ── */}
          {tab === "expenses" && (
            <div>
              {/* Add form */}
              {!readOnly && (
                <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-700">Adaugă cheltuială</h3>
                    <label className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${ocrLoading ? "opacity-50 pointer-events-none" : "bg-white border-slate-200 text-slate-600 hover:border-uat-300 hover:text-uat-700"}`}>
                      {ocrLoading ? (
                        <><span className="w-3.5 h-3.5 border border-uat-500 border-t-transparent rounded-full animate-spin" /> Analizez...</>
                      ) : (
                        <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>Încarcă factură (OCR)</>
                      )}
                      <input type="file" className="hidden" accept="image/*,.pdf" onChange={e => e.target.files?.[0] && handleOcrUpload(e.target.files[0])} />
                    </label>
                  </div>
                  {ocrMsg && <p className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 mb-3">{ocrMsg}</p>}

                  {/* Invoice picker */}
                  {invoices.length > 0 && (
                    <div className="mb-3 pb-3 border-b border-slate-200">
                      <label className="block text-xs text-slate-500 mb-1">
                        Selectează factură salvată
                        <span className="ml-1 text-uat-500">({invoices.length} factur{invoices.length === 1 ? "ă" : "i"} pentru {period.month}/{period.year})</span>
                      </label>
                      <select
                        value={expForm.invoiceId}
                        onChange={e => {
                          const inv = invoices.find(x => x.id === e.target.value);
                          if (!inv) { setExpForm(f => ({ ...f, invoiceId: "" })); return; }
                          setExpForm(f => ({
                            ...f,
                            invoiceId:     inv.id,
                            description:   inv.description ?? (inv.supplier?.companyName ?? inv.supplierName ?? f.description),
                            totalAmount:   inv.totalAmount != null ? String(inv.totalAmount) : f.totalAmount,
                            invoiceNumber: inv.invoiceNumber ?? f.invoiceNumber,
                            invoiceDate:   inv.invoiceDate ? inv.invoiceDate.slice(0, 10) : f.invoiceDate,
                            supplierId:    inv.supplierId ?? f.supplierId,
                            category:      inv.category && EXPENSE_CATEGORIES.includes(inv.category) ? inv.category : f.category,
                            customCategory: inv.category && !EXPENSE_CATEGORIES.includes(inv.category) ? inv.category : f.customCategory,
                          }));
                        }}
                        className="w-full border border-uat-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uat-500 bg-uat-50/30"
                      >
                        <option value="">— Alege o factură pentru a completa automat —</option>
                        {invoices.map(inv => {
                          const name = inv.supplier?.companyName ?? inv.supplierName ?? "Furnizor";
                          const amount = inv.totalAmount != null
                            ? `${inv.totalAmount.toLocaleString("ro-RO", { maximumFractionDigits: 2 })} ${inv.currency}`
                            : "";
                          const num = inv.invoiceNumber ? ` · Nr. ${inv.invoiceNumber}` : "";
                          return <option key={inv.id} value={inv.id}>{name}{num}{amount ? ` · ${amount}` : ""}</option>;
                        })}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Categorie</label>
                      <select
                        value={expForm.category}
                        onChange={e => setExpForm(f => ({ ...f, category: e.target.value, customCategory: "", supplierId: "" }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uat-500"
                      >
                        {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                      {expForm.category === "Altele" && (
                        <input
                          type="text"
                          value={expForm.customCategory}
                          onChange={e => setExpForm(f => ({ ...f, customCategory: e.target.value }))}
                          className="w-full mt-1.5 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uat-500"
                          placeholder="Specifică categoria..."
                        />
                      )}
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-xs text-slate-500 mb-1">
                        Furnizor
                        {(() => {
                          const catWord = expForm.category.split(" ")[0].toLowerCase();
                          const filtered = suppliers.filter(s =>
                            (s.serviceCategories ?? []).some(c => c.toLowerCase().includes(catWord))
                          );
                          return filtered.length > 0
                            ? <span className="ml-1 text-uat-600">({filtered.length} din categoria selectată)</span>
                            : <span className="ml-1 text-slate-400">(toți furnizorii)</span>;
                        })()}
                      </label>
                      <select
                        value={expForm.supplierId}
                        onChange={e => {
                          const s = suppliers.find(x => x.id === e.target.value);
                          setExpForm(f => ({
                            ...f,
                            supplierId: e.target.value,
                            description: s ? (f.description || s.companyName) : f.description,
                          }));
                        }}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uat-500"
                      >
                        <option value="">— Selectează furnizor (opțional) —</option>
                        {(() => {
                          const catWord = expForm.category.split(" ")[0].toLowerCase();
                          const filtered = suppliers.filter(s =>
                            (s.serviceCategories ?? []).some(c => c.toLowerCase().includes(catWord))
                          );
                          const list = filtered.length > 0 ? filtered : suppliers;
                          return list.map(s => <option key={s.id} value={s.id}>{s.companyName}</option>);
                        })()}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Descriere</label>
                      <input
                        type="text"
                        value={expForm.description}
                        onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uat-500"
                        placeholder="Ex: Factură Enel mai"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Sumă (RON)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={expForm.totalAmount}
                        onChange={e => setExpForm(f => ({ ...f, totalAmount: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uat-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs text-slate-500">
                          Repartizare
                          {(() => {
                            const total = allocations.reduce((s, a) => s + a.percentage, 0);
                            return total !== 100
                              ? <span className="ml-2 text-amber-500 font-medium">{total}% — trebuie 100%</span>
                              : <span className="ml-2 text-emerald-500">✓ 100%</span>;
                          })()}
                        </label>
                        <button
                          type="button"
                          onClick={() => setAllocations(a => [...a, { type: "BY_SHARE", percentage: 0 }])}
                          className="text-xs text-uat-600 hover:text-uat-800 font-medium"
                        >
                          + Adaugă criteriu
                        </button>
                      </div>
                      <div className="space-y-2">
                        {allocations.map((alloc, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <select
                              value={alloc.type}
                              onChange={e => setAllocations(a => a.map((x, i) => i === idx ? { ...x, type: e.target.value as DistribType } : x))}
                              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uat-500"
                            >
                              {(Object.keys(DISTRIB_LABELS) as DistribType[]).map(k => (
                                <option key={k} value={k}>{DISTRIB_LABELS[k]}</option>
                              ))}
                            </select>
                            <div className="relative w-24 flex-shrink-0">
                              <input
                                type="number"
                                min={1} max={100} step={1}
                                value={alloc.percentage}
                                onChange={e => setAllocations(a => a.map((x, i) => i === idx ? { ...x, percentage: parseFloat(e.target.value) || 0 } : x))}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uat-500 pr-7"
                              />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                            </div>
                            {allocations.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setAllocations(a => a.filter((_, i) => i !== idx))}
                                className="text-slate-300 hover:text-red-400 flex-shrink-0"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Nr. factură</label>
                      <input
                        type="text"
                        value={expForm.invoiceNumber}
                        onChange={e => setExpForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uat-500"
                        placeholder="Opțional"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Data facturii</label>
                      <input
                        type="date"
                        value={expForm.invoiceDate}
                        onChange={e => setExpForm(f => ({ ...f, invoiceDate: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uat-500"
                      />
                    </div>
                  </div>
                  {expError && <p className="text-sm text-red-500 mt-2">{expError}</p>}
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={addExpense}
                      disabled={expSaving || !expForm.description || !expForm.totalAmount}
                      className="inline-flex items-center gap-2 bg-uat-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-uat-700 disabled:opacity-40"
                    >
                      {expSaving ? "Se salvează..." : "Adaugă"}
                    </button>
                  </div>
                </div>
              )}

              {/* Table */}
              {period.expenses.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-sm">Nicio cheltuială introdusă.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left text-xs font-medium text-slate-400 pb-2">Categorie / Descriere</th>
                        <th className="text-right text-xs font-medium text-slate-400 pb-2">Sumă</th>
                        <th className="text-center text-xs font-medium text-slate-400 pb-2">Repartizare</th>
                        <th className="text-left text-xs font-medium text-slate-400 pb-2 pl-4">Factură</th>
                        {!readOnly && <th className="w-8" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {period.expenses.map(e => (
                        <tr key={e.id} className="group">
                          <td className="py-3 pr-4">
                            <p className="font-medium text-slate-800">{e.category}</p>
                            <p className="text-xs text-slate-400">{e.description}</p>
                          </td>
                          <td className="py-3 text-right font-semibold text-slate-700 whitespace-nowrap">
                            {fmt(e.totalAmount)} RON
                          </td>
                          <td className="py-3 text-center">
                            {e.allocations && e.allocations.length > 1 ? (
                              <div className="flex flex-col gap-0.5 items-center">
                                {e.allocations.map((a, i) => (
                                  <span key={i} className="text-xs bg-uat-50 text-uat-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                                    {a.percentage}% {DISTRIB_LABELS[a.type]}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                {DISTRIB_LABELS[e.distributionType]}
                              </span>
                            )}
                          </td>
                          <td className="py-3 pl-4 text-xs text-slate-400">
                            {e.invoiceNumber && <span>{e.invoiceNumber}</span>}
                            {e.invoiceDate && (
                              <span className="ml-1 text-slate-300">
                                {new Date(e.invoiceDate).toLocaleDateString("ro-RO")}
                              </span>
                            )}
                          </td>
                          {!readOnly && (
                            <td className="py-3 text-right">
                              <button
                                onClick={() => deleteExpense(e.id)}
                                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200">
                        <td className="pt-3 font-semibold text-slate-700">Total</td>
                        <td className="pt-3 text-right font-bold text-slate-900">{fmt(totalExpenses)} RON</td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── METERS TAB ── */}
          {tab === "meters" && (
            <div>
              {!readOnly && (
                <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Adaugă citire contor</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Apartament</label>
                      <select
                        value={meterForm.unitId}
                        onChange={e => setMeterForm(f => ({ ...f, unitId: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uat-500"
                      >
                        {allUnits.map(u => (
                          <option key={u.id} value={u.id}>Ap. {u.number}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Tip</label>
                      <select
                        value={meterForm.meterType}
                        onChange={e => setMeterForm(f => ({ ...f, meterType: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uat-500"
                      >
                        {METER_TYPES.map(t => <option key={t} value={t}>{METER_LABELS[t]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Index anterior</label>
                      <input
                        type="number" step="0.001"
                        value={meterForm.previousIndex}
                        onChange={e => setMeterForm(f => ({ ...f, previousIndex: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uat-500"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Index curent</label>
                      <input
                        type="number" step="0.001"
                        value={meterForm.currentIndex}
                        onChange={e => setMeterForm(f => ({ ...f, currentIndex: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uat-500"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Preț unitar</label>
                      <input
                        type="number" step="0.0001"
                        value={meterForm.unitPrice}
                        onChange={e => setMeterForm(f => ({ ...f, unitPrice: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uat-500"
                        placeholder="RON/u."
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Data citirii</label>
                      <input
                        type="date"
                        value={meterForm.readAt}
                        onChange={e => setMeterForm(f => ({ ...f, readAt: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uat-500"
                      />
                    </div>
                  </div>
                  {meterError && <p className="text-sm text-red-500 mt-2">{meterError}</p>}
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={addReading}
                      disabled={meterSaving}
                      className="bg-uat-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-uat-700 disabled:opacity-40"
                    >
                      {meterSaving ? "Se salvează..." : "Adaugă"}
                    </button>
                  </div>
                </div>
              )}

              {period.meterReadings.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-sm">Nicio citire de contor înregistrată.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {["Apartament", "Tip", "Index ant.", "Index cur.", "Consum", "Preț", "Data"].map(h => (
                          <th key={h} className="text-left text-xs font-medium text-slate-400 pb-2 pr-4">{h}</th>
                        ))}
                        {!readOnly && <th />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {period.meterReadings.map(r => (
                        <tr key={r.id} className="group">
                          <td className="py-2.5 pr-4 font-medium text-slate-700">Ap. {r.unit.number}</td>
                          <td className="py-2.5 pr-4 text-slate-500">{METER_LABELS[r.meterType]}</td>
                          <td className="py-2.5 pr-4 text-slate-500">{r.previousIndex}</td>
                          <td className="py-2.5 pr-4 text-slate-700">{r.currentIndex}</td>
                          <td className="py-2.5 pr-4 font-semibold text-uat-700">{r.consumption.toFixed(3)}</td>
                          <td className="py-2.5 pr-4 text-slate-400">{r.unitPrice ? r.unitPrice.toFixed(4) : "—"}</td>
                          <td className="py-2.5 pr-4 text-slate-400">
                            {new Date(r.readAt).toLocaleDateString("ro-RO")}
                          </td>
                          {!readOnly && (
                            <td>
                              <button
                                onClick={() => deleteReading(r.id)}
                                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── PAYMENTS TAB ── */}
          {tab === "payments" && (
            <div>
              {period.paymentItems.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-slate-400 text-sm mb-3">Lista de plată nu a fost generată încă.</p>
                  {!readOnly && (
                    <button
                      onClick={generate}
                      disabled={generating || period.expenses.length === 0}
                      className="inline-flex items-center gap-2 bg-uat-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-uat-700 disabled:opacity-40"
                    >
                      Generează lista de plată
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left text-xs font-medium text-slate-400 pb-2">Proprietar</th>
                        <th className="text-left text-xs font-medium text-slate-400 pb-2">Apt.</th>
                        <th className="text-right text-xs font-medium text-slate-400 pb-2">Luna cur.</th>
                        <th className="text-right text-xs font-medium text-slate-400 pb-2">Rest. ant.</th>
                        <th className="text-right text-xs font-medium text-slate-400 pb-2">Total</th>
                        <th className="text-right text-xs font-medium text-slate-400 pb-2">Achitat</th>
                        <th className="text-center text-xs font-medium text-slate-400 pb-2">Status</th>
                        {!readOnly && <th className="w-16" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {period.paymentItems.map(item => (
                        <tr key={item.id} className="group">
                          <td className="py-3 pr-3">
                            <p className="font-medium text-slate-800">{item.ownership.user.fullName}</p>
                            <p className="text-xs text-slate-400">{item.ownership.user.email}</p>
                          </td>
                          <td className="py-3 pr-3 text-slate-600">
                            {item.ownership.unit.number}
                            {item.ownership.unit.floor !== null && (
                              <span className="text-xs text-slate-400 ml-1">(et. {item.ownership.unit.floor})</span>
                            )}
                          </td>
                          <td className="py-3 pr-3 text-right text-slate-700">{fmt(item.unitAmount)}</td>
                          <td className="py-3 pr-3 text-right text-orange-500">
                            {item.previousDebt > 0.005 ? fmt(item.previousDebt) : "—"}
                          </td>
                          <td className="py-3 pr-3 text-right font-semibold text-slate-800">{fmt(item.totalDue)}</td>
                          <td className="py-3 pr-3 text-right text-emerald-600">
                            {item.paidAmount > 0.005 ? fmt(item.paidAmount) : "—"}
                          </td>
                          <td className="py-3 pr-3 text-center">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PAYMENT_STATUS_BADGE[item.status]}`}>
                              {PAYMENT_STATUS_LABEL[item.status]}
                            </span>
                          </td>
                          {!readOnly && (
                            <td className="py-3">
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => { setPayModal(item); setPayAmount(String(item.totalDue - item.paidAmount)); setPayNotes(""); }}
                                  className="text-uat-600 hover:text-uat-800 text-xs font-medium whitespace-nowrap px-2 py-1 rounded bg-uat-50 hover:bg-uat-100"
                                >
                                  Achit
                                </button>
                                {item.paidAmount > 0.005 && (
                                  <button
                                    onClick={() => resetPayment(item.id)}
                                    className="text-slate-400 hover:text-red-500 text-xs"
                                    title="Resetează plata"
                                  >
                                    ↩
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200">
                        <td className="pt-3 font-semibold text-slate-700" colSpan={4}>Total</td>
                        <td className="pt-3 text-right font-bold text-slate-900">{fmt(totalDue)}</td>
                        <td className="pt-3 text-right font-bold text-emerald-600">{fmt(totalPaid)}</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Payment modal */}
      {payModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Înregistrează plată</h2>
              <p className="text-sm text-slate-400 mt-0.5">{payModal.ownership.user.fullName} · Ap. {payModal.ownership.unit.number}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Sumă achitată (din {fmt(payModal.totalDue - payModal.paidAmount)} RON rămași)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uat-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notițe (opțional)</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uat-500"
                  placeholder="Ex: Chitanță #123"
                />
              </div>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setPayModal(null)}
                className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2 rounded-lg hover:bg-slate-50"
              >
                Anulează
              </button>
              <button
                onClick={recordPayment}
                disabled={paySaving || !payAmount || parseFloat(payAmount) <= 0}
                className="flex-1 bg-uat-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-uat-700 disabled:opacity-50"
              >
                {paySaving ? "Se salvează..." : "Salvează"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
