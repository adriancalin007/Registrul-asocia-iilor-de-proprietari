"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";

type Building = { id: string; name: string; address: string; units: { id: string; number: string }[] };

type ImportRow = {
  buildingId: string;
  _buildingName: string;
  number: string;
  floor?: number;
  area?: number;
  shareRatio?: number;
  residents?: number;
  heatingType?: string;
  customAttributes?: Record<string, string | number>;
};

const STANDARD_COLS = ["Apartament", "Etaj", "Suprafata (m2)", "Cota-parte (%)", "Persoane", "Termoficare"];
const HEATING_MAP: Record<string, string> = {
  "termoficare oras": "DISTRICT",
  "radet": "DISTRICT",
  "sacet": "DISTRICT",
  "centrala bloc": "CENTRALIZED",
  "centrala proprie": "INDIVIDUAL",
  "individual": "INDIVIDUAL",
  "none": "NONE",
  "-": "NONE",
  "": "NONE",
};

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["Apartament *", "Etaj", "Suprafata (m2)", "Cota-parte (%)", "Persoane", "Termoficare", "Suprafata incalzita (m2)", "Garaj (nr.)"],
    ["1", "0", "65.50", "4.5231", "2", "Termoficare oras", "60", "0"],
    ["2", "1", "55.00", "3.8120", "3", "Centrala proprie", "55", "1"],
    ["3", "1", "75.20", "5.1034", "1", "-", "", ""],
  ]);
  // Column widths
  ws["!cols"] = [{ wch: 14 }, { wch: 8 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 20 }, { wch: 22 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, "Apartamente");
  XLSX.writeFile(wb, "template_apartamente.xlsx");
}

export default function ImportPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/apartamente")
      .then(r => r.json())
      .then((data: Building[]) => {
        setBuildings(data);
        if (data.length) setSelectedBuildingId(data[0].id);
      });
  }, []);

  function handleFile(file: File) {
    setParseError(null);
    setRows([]);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = (XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown) as (string | number)[][];

        if (raw.length < 2) { setParseError("Fișierul nu conține date."); return; }

        const headers = raw[0].map(h => String(h ?? "").trim());
        const dataRows = raw.slice(1);

        const parsed: ImportRow[] = [];
        const building = buildings.find(b => b.id === selectedBuildingId);

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];
          if (!row || row.every(c => c === "" || c === null || c === undefined)) continue;

          const get = (col: string) => {
            const idx = headers.findIndex(h => h.toLowerCase() === col.toLowerCase());
            return idx >= 0 ? row[idx] : undefined;
          };

          const numStr = String(get("Apartament *") ?? get("Apartament") ?? "").trim();
          if (!numStr) { setParseError(`Rândul ${i + 2}: câmpul "Apartament *" lipsește.`); return; }

          const floor = get("Etaj") !== undefined && get("Etaj") !== "" ? Number(get("Etaj")) : undefined;
          const area  = get("Suprafata (m2)") !== undefined && get("Suprafata (m2)") !== "" ? Number(get("Suprafata (m2)")) : undefined;
          const share = get("Cota-parte (%)") !== undefined && get("Cota-parte (%)") !== "" ? Number(get("Cota-parte (%)")) : undefined;
          const prsns = get("Persoane") !== undefined && get("Persoane") !== "" ? Number(get("Persoane")) : undefined;
          const heatRaw = String(get("Termoficare") ?? "").trim().toLowerCase();
          const heatingType = HEATING_MAP[heatRaw] ?? "NONE";

          // Extra columns become customAttributes
          const customAttributes: Record<string, string | number> = {};
          headers.forEach((h, idx) => {
            if (STANDARD_COLS.some(s => h.toLowerCase().startsWith(s.toLowerCase().replace(" *", "")))) return;
            if (h === "") return;
            const val = row[idx];
            if (val !== undefined && val !== "") customAttributes[h] = val as string | number;
          });

          const importRow: ImportRow = {
            buildingId: selectedBuildingId,
            _buildingName: building?.name ?? "",
            number: numStr,
            floor: isNaN(floor as number) ? undefined : floor,
            area: isNaN(area as number) ? undefined : area,
            shareRatio: isNaN(share as number) ? undefined : share,
            residents: isNaN(prsns as number) ? undefined : prsns,
            heatingType: heatingType !== "NONE" ? heatingType : undefined,
          };
          if (Object.keys(customAttributes).length > 0) importRow.customAttributes = customAttributes;
          parsed.push(importRow);
        }

        if (parsed.length === 0) { setParseError("Nu s-au găsit rânduri valide."); return; }
        setRows(parsed);
      } catch {
        setParseError("Eroare la citirea fișierului. Verificați formatul.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function doImport() {
    setImporting(true); setResult(null);
    const res = await fetch("/api/apartamente/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: rows.map(r => {
        const { _buildingName, ...rest } = r;
        void _buildingName;
        return rest;
      }) }),
    });
    const data = await res.json();
    setImporting(false);
    if (res.ok) {
      setResult(data);
      setRows([]);
      if (fileRef.current) fileRef.current.value = "";
    } else {
      setParseError(data.error);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/locatari" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
          ← Locatari
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold text-slate-900">Import apartamente din Excel</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Importați apartamente în masă dintr-un fișier Excel. Coloanele extra devin atribute personalizate.
        </p>
      </div>

      {/* Step 1: Download template */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-900 text-sm">Pasul 1 — Descarcă template</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Completează templateul cu apartamentele tale. Poți adăuga coloane extra (ex: "Suprafata incalzita (m2)", "Garaj (nr.)") — acestea vor fi salvate ca atribute personalizate.
            </p>
          </div>
          <button type="button" onClick={downloadTemplate}
            className="btn-primary text-sm whitespace-nowrap flex-shrink-0 ml-4">
            <svg className="w-4 h-4 mr-1.5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Descarcă template
          </button>
        </div>
      </div>

      {/* Step 2: Choose building + upload file */}
      <div className="card p-6 space-y-4">
        <p className="font-medium text-slate-900 text-sm">Pasul 2 — Selectează scara / corpul și încarcă fișierul</p>

        {buildings.length === 0 ? (
          <p className="text-sm text-amber-600">Nu există scări / corpuri. <Link href="/locatari" className="underline">Creează mai întâi o scară.</Link></p>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="label-text">Scară / Corp *</label>
              <select value={selectedBuildingId} onChange={e => { setSelectedBuildingId(e.target.value); setRows([]); }}
                className="input">
                {buildings.map(b => <option key={b.id} value={b.id}>{b.name} — {b.address}</option>)}
              </select>
            </div>

            <div>
              <label className="label-text">Fișier Excel (.xlsx, .xls, .csv) *</label>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-uat-50 file:text-uat-700 hover:file:bg-uat-100 cursor-pointer" />
            </div>

            {parseError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                {parseError}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Preview */}
      {rows.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900 text-sm">Previzualizare — {rows.length} apartamente</p>
              <p className="text-xs text-slate-500 mt-0.5">Verificați datele înainte de import. Apartamentele care există deja vor fi sărite.</p>
            </div>
            <button type="button" onClick={doImport} disabled={importing}
              className="btn-primary text-sm">
              {importing ? "Se importă..." : `Importă ${rows.length} apartamente`}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {["Ap.", "Etaj", "Suprafață", "Cotă-parte", "Pers.", "Termoficare", "Atribute extra"].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-slate-500 px-4 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.slice(0, 50).map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2 font-medium text-slate-800">Ap. {r.number}</td>
                    <td className="px-4 py-2 text-slate-500">{r.floor != null ? `Et. ${r.floor}` : "—"}</td>
                    <td className="px-4 py-2 text-slate-500">{r.area ? `${r.area} m²` : "—"}</td>
                    <td className="px-4 py-2 text-slate-500">{r.shareRatio ? `${r.shareRatio}%` : "—"}</td>
                    <td className="px-4 py-2 text-slate-500">{r.residents ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-500">{r.heatingType ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-400 text-xs">
                      {r.customAttributes
                        ? Object.entries(r.customAttributes).map(([k,v]) => `${k}: ${v}`).join(", ")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 50 && (
              <p className="text-xs text-slate-400 text-center py-3">
                + {rows.length - 50} rânduri suplimentare (toate vor fi importate)
              </p>
            )}
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`rounded-2xl border px-6 py-4 ${result.errors.length > 0 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
          <p className="font-semibold text-slate-900 text-sm mb-1">Import finalizat</p>
          <p className="text-sm text-slate-700">
            ✓ {result.created} create · {result.skipped} sărite (existau deja)
            {result.errors.length > 0 && <span className="text-amber-600 ml-2">· {result.errors.length} erori</span>}
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 text-xs text-amber-700 space-y-0.5">
              {result.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
          <Link href="/locatari" className="mt-3 inline-block text-sm text-uat-600 font-medium hover:underline">
            ← Înapoi la locatari
          </Link>
        </div>
      )}
    </div>
  );
}
