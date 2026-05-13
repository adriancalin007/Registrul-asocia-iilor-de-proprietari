"use client";
import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";

// Recharts loaded client-only (no SSR)
const BarChart       = dynamic(() => import("recharts").then(m => m.BarChart),       { ssr: false });
const Bar            = dynamic(() => import("recharts").then(m => m.Bar),            { ssr: false });
const XAxis          = dynamic(() => import("recharts").then(m => m.XAxis),          { ssr: false });
const YAxis          = dynamic(() => import("recharts").then(m => m.YAxis),          { ssr: false });
const Tooltip        = dynamic(() => import("recharts").then(m => m.Tooltip),        { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });
const CartesianGrid  = dynamic(() => import("recharts").then(m => m.CartesianGrid),  { ssr: false });
const Cell           = dynamic(() => import("recharts").then(m => m.Cell),           { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "cheltuieli" | "restantieri" | "asociatii";

interface Stats { min: number; max: number; avg: number; median: number; count: number }
interface HistBucket { bucket: number; count: number }
interface CheltuieliItem {
  unitId: string; aptNumber: string; floor: number | null; area: number | null;
  rooms: number | null; unitAmount: number; totalDue: number; paidAmount: number;
  status: string; year: number; month: number;
  associationId: string; associationName: string; buildingName: string;
}
interface CheltuieliData { stats: Stats | null; histogram: HistBucket[]; items: CheltuieliItem[] }

interface Debtor {
  unitId: string; aptNumber: string; buildingName: string;
  associationId: string; associationName: string;
  totalDebt: number; monthsInDebt: number; lastPeriod: string;
}
interface AssocTotal { associationId: string; associationName: string; totalOutstanding: number; debtorCount: number }
interface RestantieriData { debtors: Debtor[]; associationTotals: AssocTotal[] }

interface AssocStat {
  associationId: string; associationName: string;
  unitCount: number; avgMonthlyCost: number | null;
  pctDebtors: number | null; totalOutstanding: number;
}
interface AsociatiiData { associations: AssocStat[] }

// ─── CSV helper ───────────────────────────────────────────────────────────────

function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cols.join(","), ...rows.map(r => cols.map(c => escape(r[c])).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─── Period selectors ─────────────────────────────────────────────────────────

const MONTHS = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const YEARS  = [2024, 2025, 2026, 2027];

function PeriodRange({
  yearFrom, monthFrom, yearTo, monthTo, onChange,
}: {
  yearFrom: number; monthFrom: number; yearTo: number; monthTo: number;
  onChange: (key: string, val: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-xs text-slate-500 font-medium">Perioadă:</span>
      <select className="select-sm" value={monthFrom} onChange={e => onChange("monthFrom", +e.target.value)}>
        {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
      </select>
      <select className="select-sm" value={yearFrom} onChange={e => onChange("yearFrom", +e.target.value)}>
        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      <span className="text-slate-400 text-xs">→</span>
      <select className="select-sm" value={monthTo} onChange={e => onChange("monthTo", +e.target.value)}>
        {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
      </select>
      <select className="select-sm" value={yearTo} onChange={e => onChange("yearTo", +e.target.value)}>
        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col gap-1">
      <span className="text-xs text-slate-500 font-medium">{label}</span>
      <span className="text-2xl font-bold text-slate-800">{value}</span>
    </div>
  );
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + " RON";
}
function fmtN(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 1 }).format(n);
}

const STATUS_LABELS: Record<string, string> = {
  PAID: "Achitat", PARTIAL: "Parțial", PENDING: "Nepreluat", OVERDUE: "Restant",
};
const STATUS_COLORS: Record<string, string> = {
  PAID:    "bg-emerald-100 text-emerald-700",
  PARTIAL: "bg-amber-100 text-amber-700",
  PENDING: "bg-slate-100 text-slate-600",
  OVERDUE: "bg-red-100 text-red-700",
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RapoartePage() {
  const [tab, setTab] = useState<Tab>("cheltuieli");

  // Association list for dropdowns
  const [assocList, setAssocList] = useState<{ id: string; name: string }[]>([]);

  // ── Raport 1 ──
  const [c1Filters, setC1Filters] = useState({
    yearFrom: 2026, monthFrom: 1, yearTo: 2026, monthTo: 12,
    associationId: "", areaFilter: "all", rooms: "all", floor: "all",
    sortBy: "unitAmount", sortDir: "desc",
  });
  const [c1Data, setC1Data]       = useState<CheltuieliData | null>(null);
  const [c1Loading, setC1Loading] = useState(false);

  // ── Raport 2 ──
  const [c2Filters, setC2Filters] = useState({ associationId: "", minDebt: 0, minMonths: 1 });
  const [c2Data, setC2Data]       = useState<RestantieriData | null>(null);
  const [c2Loading, setC2Loading] = useState(false);

  // ── Raport 3 ──
  const [c3Filters, setC3Filters] = useState({ yearFrom: 2026, monthFrom: 1, yearTo: 2026, monthTo: 12 });
  const [c3Data, setC3Data]       = useState<AsociatiiData | null>(null);
  const [c3Loading, setC3Loading] = useState(false);

  // Fetch association list on mount
  useEffect(() => {
    fetch("/api/rapoarte/asociatii?yearFrom=2026&monthFrom=1&yearTo=2026&monthTo=12")
      .then(r => r.json())
      .then((d: AsociatiiData) =>
        setAssocList(d.associations.map(a => ({ id: a.associationId, name: a.associationName })))
      )
      .catch(() => {});
  }, []);

  function areaParams(filter: string) {
    if (filter === "u40")  return { areaMin: null, areaMax: 40 };
    if (filter === "4060") return { areaMin: 40,   areaMax: 60 };
    if (filter === "6080") return { areaMin: 60,   areaMax: 80 };
    if (filter === "80p")  return { areaMin: 80,   areaMax: null };
    return { areaMin: null, areaMax: null };
  }

  const fetchCheltuieli = useCallback(() => {
    const f = c1Filters;
    const { areaMin, areaMax } = areaParams(f.areaFilter);
    const p = new URLSearchParams({
      yearFrom: String(f.yearFrom), monthFrom: String(f.monthFrom),
      yearTo:   String(f.yearTo),   monthTo:   String(f.monthTo),
      floor: f.floor, sortBy: f.sortBy, sortDir: f.sortDir,
    });
    if (f.associationId)  p.set("associationId", f.associationId);
    if (areaMin !== null) p.set("areaMin", String(areaMin));
    if (areaMax !== null) p.set("areaMax", String(areaMax));
    if (f.rooms !== "all") p.set("rooms", f.rooms === "4+" ? "4" : f.rooms);
    setC1Loading(true);
    fetch(`/api/rapoarte/cheltuieli?${p}`)
      .then(r => r.json()).then(d => setC1Data(d)).finally(() => setC1Loading(false));
  }, [c1Filters]);

  const fetchRestantieri = useCallback(() => {
    const f = c2Filters;
    const p = new URLSearchParams({ minDebt: String(f.minDebt), minMonths: String(f.minMonths) });
    if (f.associationId) p.set("associationId", f.associationId);
    setC2Loading(true);
    fetch(`/api/rapoarte/restantieri?${p}`)
      .then(r => r.json()).then(d => setC2Data(d)).finally(() => setC2Loading(false));
  }, [c2Filters]);

  const fetchAsociatii = useCallback(() => {
    const f = c3Filters;
    const p = new URLSearchParams({
      yearFrom: String(f.yearFrom), monthFrom: String(f.monthFrom),
      yearTo:   String(f.yearTo),   monthTo:   String(f.monthTo),
    });
    setC3Loading(true);
    fetch(`/api/rapoarte/asociatii?${p}`)
      .then(r => r.json()).then(d => setC3Data(d)).finally(() => setC3Loading(false));
  }, [c3Filters]);

  function updateC1(key: string, val: unknown) { setC1Filters(p => ({ ...p, [key]: val })); }
  function updateC2(key: string, val: unknown) { setC2Filters(p => ({ ...p, [key]: val })); }
  function updateC3(key: string, val: number)  { setC3Filters(p => ({ ...p, [key]: val })); }

  const tabs: { key: Tab; label: string }[] = [
    { key: "cheltuieli",  label: "1. Distribuție costuri" },
    { key: "restantieri", label: "2. Restanțieri" },
    { key: "asociatii",   label: "3. Activitate asociații" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Rapoarte agregate</h1>
        <p className="text-slate-500 text-sm mt-1">Analiză financiară pe datele din platformă</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? "bg-white shadow-sm text-uat-700" : "text-slate-500 hover:text-slate-700"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════
          RAPORT 1 — Distribuție costuri
      ════════════════════════════════════════════════════════ */}
      {tab === "cheltuieli" && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
            <h2 className="font-semibold text-slate-800 text-sm">Filtre</h2>
            <PeriodRange
              yearFrom={c1Filters.yearFrom} monthFrom={c1Filters.monthFrom}
              yearTo={c1Filters.yearTo}     monthTo={c1Filters.monthTo}
              onChange={updateC1}
            />
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Asociație</label>
                <select className="select-sm" value={c1Filters.associationId}
                  onChange={e => updateC1("associationId", e.target.value)}>
                  <option value="">Toate</option>
                  {assocList.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Camere</label>
                <select className="select-sm" value={c1Filters.rooms}
                  onChange={e => updateC1("rooms", e.target.value)}>
                  <option value="all">Toate</option>
                  <option value="1">1 cameră</option>
                  <option value="2">2 camere</option>
                  <option value="3">3 camere</option>
                  <option value="4+">4+ camere</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Suprafață</label>
                <select className="select-sm" value={c1Filters.areaFilter}
                  onChange={e => updateC1("areaFilter", e.target.value)}>
                  <option value="all">Toate</option>
                  <option value="u40">Sub 40 mp</option>
                  <option value="4060">40–60 mp</option>
                  <option value="6080">60–80 mp</option>
                  <option value="80p">Peste 80 mp</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Etaj</label>
                <select className="select-sm" value={c1Filters.floor}
                  onChange={e => updateC1("floor", e.target.value)}>
                  <option value="all">Toate</option>
                  <option value="ground">Parter</option>
                  <option value="middle">Etaje intermediare</option>
                  <option value="top">Etaj maxim</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Sortare</label>
                <div className="flex gap-1">
                  <select className="select-sm" value={c1Filters.sortBy}
                    onChange={e => updateC1("sortBy", e.target.value)}>
                    <option value="unitAmount">Cotă lunară</option>
                    <option value="totalDue">Total datorat</option>
                    <option value="area">Suprafață</option>
                  </select>
                  <select className="select-sm" value={c1Filters.sortDir}
                    onChange={e => updateC1("sortDir", e.target.value)}>
                    <option value="desc">↓ desc</option>
                    <option value="asc">↑ asc</option>
                  </select>
                </div>
              </div>
            </div>
            <button onClick={fetchCheltuieli} disabled={c1Loading}
              className="btn-primary px-5 py-2 text-sm disabled:opacity-60">
              {c1Loading ? "Se calculează…" : "Generează raport"}
            </button>
          </div>

          {/* Stats cards — sticky on mobile so they stay visible while scrolling the table */}
          {c1Data?.stats && (
            <div className="sticky top-0 z-10 grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Minim" value={fmt(c1Data.stats.min)} />
              <StatCard label="Maxim" value={fmt(c1Data.stats.max)} />
              <StatCard label="Medie" value={fmt(c1Data.stats.avg)} />
              <StatCard label="Mediană" value={fmt(c1Data.stats.median)} />
            </div>
          )}

          {c1Data?.stats === null && c1Data !== null && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-700">
              Nu există perioade FINALIZED pentru filtrele selectate.
            </div>
          )}

          {/* Histogram */}
          {c1Data?.histogram && c1Data.histogram.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h2 className="font-semibold text-slate-800 text-sm mb-1">
                Histogram distribuție — {c1Data.stats?.count} apartamente
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                20 intervale egale între valoarea minimă și maximă. Axa X = nr. interval, axa Y = nr. apartamente.
              </p>
              <div className="w-full overflow-x-auto">
                <div style={{ minWidth: 420, height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={c1Data.histogram} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="bucket" tick={{ fontSize: 11 }} tickFormatter={b => `I${b}`} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(v: any) => [v, "Apartamente"]}
                        labelFormatter={(l: unknown) => `Interval ${l}`}
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {c1Data.histogram.map((_, idx) => (
                          <Cell key={idx}
                            fill={`hsl(${244 + idx * 2}, 70%, ${55 - idx}%)`}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Detail table */}
          {c1Data?.items && c1Data.items.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h2 className="font-semibold text-slate-800 text-sm">
                  Detaliu ({c1Data.items.length} rânduri{c1Data.items.length === 500 ? " — limitat la 500" : ""})
                </h2>
                <button
                  onClick={() => downloadCSV("cheltuieli.csv", c1Data.items.map(r => ({
                    Asociatie: r.associationName, Bloc: r.buildingName, Apartament: r.aptNumber,
                    Etaj: r.floor ?? "", Suprafata_mp: r.area ?? "", Camere: r.rooms ?? "",
                    Cota_lunara_RON: r.unitAmount, Total_datorat_RON: r.totalDue,
                    Platit_RON: r.paidAmount, Status: STATUS_LABELS[r.status] ?? r.status,
                    An: r.year, Luna: r.month,
                  })))}
                  className="btn-outline text-xs px-3 py-1.5"
                >
                  ↓ Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-slate-500 whitespace-nowrap">
                      <th className="pb-2 pr-4 font-medium">Asociație / Bloc</th>
                      <th className="pb-2 pr-4 font-medium">Apt.</th>
                      <th className="pb-2 pr-3 font-medium">Etaj</th>
                      <th className="pb-2 pr-3 font-medium">mp</th>
                      <th className="pb-2 pr-3 font-medium">Cam.</th>
                      <th className="pb-2 pr-4 font-medium">Cotă lunară</th>
                      <th className="pb-2 pr-4 font-medium">Total datorat</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {c1Data.items.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 pr-4">
                          <div className="font-medium text-slate-800 text-xs leading-tight">{r.associationName}</div>
                          <div className="text-slate-400 text-xs">{r.buildingName}</div>
                        </td>
                        <td className="py-2 pr-4 font-mono text-slate-700 text-xs">{r.aptNumber}</td>
                        <td className="py-2 pr-3 text-slate-600 text-xs">{r.floor !== null ? (r.floor === 0 ? "P" : r.floor) : "—"}</td>
                        <td className="py-2 pr-3 text-slate-600 text-xs">{r.area ?? "—"}</td>
                        <td className="py-2 pr-3 text-slate-600 text-xs">{r.rooms ?? "—"}</td>
                        <td className="py-2 pr-4 font-semibold text-slate-800 tabular-nums text-xs">{fmt(r.unitAmount)}</td>
                        <td className="py-2 pr-4 tabular-nums text-slate-700 text-xs">{fmt(r.totalDue)}</td>
                        <td className="py-2">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] ?? "bg-slate-100 text-slate-600"}`}>
                            {STATUS_LABELS[r.status] ?? r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          RAPORT 2 — Restanțieri
      ════════════════════════════════════════════════════════ */}
      {tab === "restantieri" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
            <h2 className="font-semibold text-slate-800 text-sm">Filtre</h2>
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Asociație</label>
                <select className="select-sm" value={c2Filters.associationId}
                  onChange={e => updateC2("associationId", e.target.value)}>
                  <option value="">Toate</option>
                  {assocList.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Datorie minimă (RON)</label>
                <input type="number" min={0} step={10} value={c2Filters.minDebt}
                  onChange={e => updateC2("minDebt", +e.target.value)}
                  className="input w-32 py-1.5 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Luni restante min.</label>
                <input type="number" min={1} max={24} value={c2Filters.minMonths}
                  onChange={e => updateC2("minMonths", +e.target.value)}
                  className="input w-24 py-1.5 text-sm" />
              </div>
            </div>
            <button onClick={fetchRestantieri} disabled={c2Loading}
              className="btn-primary px-5 py-2 text-sm disabled:opacity-60">
              {c2Loading ? "Se calculează…" : "Generează raport"}
            </button>
          </div>

          {/* Per-association totals — sticky cards */}
          {c2Data?.associationTotals && c2Data.associationTotals.length > 0 && (
            <div className="sticky top-0 z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {c2Data.associationTotals.map(a => (
                <div key={a.associationId} className="bg-white rounded-2xl border border-red-100 p-4">
                  <div className="text-xs text-slate-500 font-medium mb-1 truncate">{a.associationName}</div>
                  <div className="text-xl font-bold text-red-600">{fmt(a.totalOutstanding)}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{a.debtorCount} ap. restante</div>
                </div>
              ))}
            </div>
          )}

          {c2Data?.debtors && c2Data.debtors.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h2 className="font-semibold text-slate-800 text-sm">
                  Restanțieri — {c2Data.debtors.length} apartamente
                </h2>
                <button
                  onClick={() => downloadCSV("restantieri.csv", c2Data.debtors.map(r => ({
                    Asociatie: r.associationName, Bloc: r.buildingName, Apartament: r.aptNumber,
                    Total_datorie_RON: r.totalDebt, Luni_restante: r.monthsInDebt,
                    Ultima_perioada: r.lastPeriod,
                  })))}
                  className="btn-outline text-xs px-3 py-1.5"
                >
                  ↓ Export CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[540px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs text-slate-500 whitespace-nowrap">
                      <th className="pb-2 pr-4 font-medium">Asociație / Bloc</th>
                      <th className="pb-2 pr-4 font-medium">Apt.</th>
                      <th className="pb-2 pr-4 font-medium">Datorie totală</th>
                      <th className="pb-2 pr-4 font-medium">Luni restante</th>
                      <th className="pb-2 font-medium">Ultima perioadă</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {c2Data.debtors.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 pr-4">
                          <div className="font-medium text-slate-800 text-xs leading-tight">{r.associationName}</div>
                          <div className="text-slate-400 text-xs">{r.buildingName}</div>
                        </td>
                        <td className="py-2 pr-4 font-mono text-slate-700 text-xs">{r.aptNumber}</td>
                        <td className="py-2 pr-4 font-bold text-red-600 tabular-nums text-sm">{fmt(r.totalDebt)}</td>
                        <td className="py-2 pr-4">
                          <span className={`text-sm font-semibold ${r.monthsInDebt >= 3 ? "text-red-600" : "text-amber-600"}`}>
                            {r.monthsInDebt} luni
                          </span>
                        </td>
                        <td className="py-2 text-slate-500 text-xs">{r.lastPeriod}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {c2Data?.debtors?.length === 0 && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-sm text-emerald-700">
              Nu există restanțieri pentru filtrele selectate.
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          RAPORT 3 — Activitate pe asociații
      ════════════════════════════════════════════════════════ */}
      {tab === "asociatii" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
            <h2 className="font-semibold text-slate-800 text-sm">Perioadă analizată</h2>
            <PeriodRange
              yearFrom={c3Filters.yearFrom} monthFrom={c3Filters.monthFrom}
              yearTo={c3Filters.yearTo}     monthTo={c3Filters.monthTo}
              onChange={updateC3}
            />
            <button onClick={fetchAsociatii} disabled={c3Loading}
              className="btn-primary px-5 py-2 text-sm disabled:opacity-60">
              {c3Loading ? "Se calculează…" : "Generează raport"}
            </button>
          </div>

          {c3Data?.associations && c3Data.associations.length > 0 && (
            <>
              {/* Bar chart */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <h2 className="font-semibold text-slate-800 text-sm">Cost mediu lunar per asociație (RON)</h2>
                  <button
                    onClick={() => downloadCSV("asociatii.csv", c3Data.associations.map(r => ({
                      Asociatie: r.associationName, Nr_apartamente: r.unitCount,
                      Cost_mediu_RON: r.avgMonthlyCost ?? "",
                      Procent_restantieri: r.pctDebtors ?? "",
                      Total_restante_RON: r.totalOutstanding,
                    })))}
                    className="btn-outline text-xs px-3 py-1.5"
                  >
                    ↓ Export CSV
                  </button>
                </div>
                <div className="w-full overflow-x-auto">
                  <div style={{ minWidth: Math.max(400, c3Data.associations.length * 72), height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={c3Data.associations.map(a => ({
                          name: a.associationName.length > 20
                            ? a.associationName.slice(0, 18) + "…"
                            : a.associationName,
                          cost: a.avgMonthlyCost ?? 0,
                          pct:  a.pctDebtors ?? 0,
                        }))}
                        margin={{ top: 4, right: 8, bottom: 52, left: 44 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}`} />
                        <Tooltip
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          formatter={(v: any, n: any) =>
                            n === "cost"
                              ? [fmt(v as number), "Cost mediu lunar"]
                              : [`${fmtN(v as number)}%`, "% restanțieri"]
                          }
                          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                        />
                        <Bar dataKey="cost" name="cost" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Comparison table */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <h2 className="font-semibold text-slate-800 text-sm mb-4">Comparație asociații</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[560px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs text-slate-500 whitespace-nowrap">
                        <th className="pb-2 pr-6 font-medium">Asociație</th>
                        <th className="pb-2 pr-6 font-medium">Ap.</th>
                        <th className="pb-2 pr-6 font-medium">Cost mediu</th>
                        <th className="pb-2 pr-6 font-medium">% restanțieri</th>
                        <th className="pb-2 font-medium">Total restante</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {c3Data.associations.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 pr-6 font-medium text-slate-800 text-sm">{r.associationName}</td>
                          <td className="py-2 pr-6 text-slate-600 tabular-nums">{r.unitCount}</td>
                          <td className="py-2 pr-6 font-semibold text-slate-800 tabular-nums">{fmt(r.avgMonthlyCost)}</td>
                          <td className="py-2 pr-6">
                            <div className="flex items-center gap-2 min-w-[100px]">
                              <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${(r.pctDebtors ?? 0) > 30 ? "bg-red-500" : (r.pctDebtors ?? 0) > 15 ? "bg-amber-400" : "bg-emerald-500"}`}
                                  style={{ width: `${Math.min(r.pctDebtors ?? 0, 100)}%` }}
                                />
                              </div>
                              <span className={`text-xs font-semibold tabular-nums w-10 text-right ${(r.pctDebtors ?? 0) > 30 ? "text-red-600" : (r.pctDebtors ?? 0) > 15 ? "text-amber-600" : "text-emerald-600"}`}>
                                {fmtN(r.pctDebtors)}%
                              </span>
                            </div>
                          </td>
                          <td className={`py-2 font-semibold tabular-nums ${r.totalOutstanding > 0 ? "text-red-600" : "text-slate-500"}`}>
                            {fmt(r.totalOutstanding)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {c3Data?.associations?.length === 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-700">
              Nu există date pentru perioada selectată.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
