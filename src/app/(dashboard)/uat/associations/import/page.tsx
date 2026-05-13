"use client";
// src/app/(dashboard)/uat/associations/import/page.tsx
import { useState, useRef } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import type { AssociationRow } from "@/lib/import-associations";

interface PreviewData {
  total: number;
  skipped: number;
  warnings: string[];
  preview: AssociationRow[];
}

interface CommitResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  warnings: string[];
}

const STATUS_LABEL: Record<string, string> = {
  OFFICIAL_REGISTRY: "Registru oficial",
  DISSOLVED:         "Dizolvată",
};

export default function ImportAssociationsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile]           = useState<File | null>(null);
  const [previewData, setPreview] = useState<PreviewData | null>(null);
  const [result, setResult]       = useState<CommitResult | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [clientPreview, setClientPreview] = useState<{ headers: string[]; rows: Record<string, unknown>[] } | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f); setPreview(null); setResult(null); setError(null); setClientPreview(null);
    if (!f) return;

    const buf = await f.arrayBuffer();
    const wb  = XLSX.read(buf, { type: "array" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return;
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], { defval: "" });
    if (rows.length === 0) return;
    setClientPreview({ headers: Object.keys(rows[0]).slice(0, 8), rows: rows.slice(0, 5) });
  }

  async function handlePreview() {
    if (!file) return;
    setLoading(true); setError(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("mode", "preview");
    try {
      const res = await fetch("/api/admin/import-associations", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Eroare la preview"); return; }
      setPreview(data as PreviewData);
    } catch { setError("Eroare de rețea."); }
    finally { setLoading(false); }
  }

  async function handleCommit() {
    if (!file) return;
    setLoading(true); setError(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("mode", "commit");
    try {
      const res = await fetch("/api/admin/import-associations", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Eroare la import"); return; }
      setResult(data as CommitResult);
      setPreview(null);
    } catch { setError("Eroare de rețea."); }
    finally { setLoading(false); }
  }

  function reset() {
    setFile(null); setPreview(null); setResult(null); setError(null); setClientPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
          <Link href="/uat/associations" className="hover:text-slate-600">Asociații</Link>
          <span>›</span>
          <span className="text-slate-700">Import din registru oficial</span>
        </div>
        <h1 className="page-title">Import Listă Oficială Asociații</h1>
        <p className="page-subtitle">
          Importul fișierului Excel din registrul Primăriei Sector 1 (2.465 rânduri).
          Re-rularea importului actualizează înregistrările existente fără a crea duplicate.
        </p>
      </div>

      {!result && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-900">Selectează fișierul</h2>
            <p className="text-xs text-slate-400 mt-0.5">Format acceptat: .xlsx · Coloana cheie: <strong>Nr. Dosar</strong></p>
          </div>
          <div className="p-6 space-y-4">
            <label
              htmlFor="file-import"
              className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-colors ${
                file ? "border-uat-300 bg-uat-50" : "border-slate-200 hover:border-uat-300 hover:bg-slate-50"
              }`}
            >
              {file ? (
                <>
                  <svg className="w-8 h-8 text-uat-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
                  </svg>
                  <p className="font-medium text-slate-900 text-sm">{file.name}</p>
                  <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB · Click pentru a schimba</p>
                </>
              ) : (
                <>
                  <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
                  </svg>
                  <p className="text-sm text-slate-500">Click sau drag &amp; drop</p>
                  <p className="text-xs text-slate-400">Fișier .xlsx</p>
                </>
              )}
              <input ref={fileRef} id="file-import" type="file" accept=".xlsx" className="sr-only" onChange={handleFile} />
            </label>

            {/* Quick column preview */}
            {clientPreview && !previewData && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Primele 5 rânduri (coloanele 1-8)</p>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="text-xs w-full">
                    <thead>
                      <tr className="bg-slate-50">
                        {clientPreview.headers.map(h => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 whitespace-nowrap border-b border-slate-200">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {clientPreview.rows.map((r, i) => (
                        <tr key={i} className="border-b border-slate-100 last:border-0">
                          {clientPreview.headers.map(h => (
                            <td key={h} className="px-3 py-1.5 text-slate-600 whitespace-nowrap max-w-xs truncate">{String(r[h] ?? "")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}

            {!previewData && (
              <div className="flex gap-3 pt-1">
                <button onClick={handlePreview} disabled={!file || loading} className="btn-primary disabled:opacity-50 flex items-center gap-2">
                  {loading ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Se analizează...</> : "Analizează fișierul →"}
                </button>
                {file && <button onClick={reset} className="btn-ghost text-sm">Resetează</button>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview results */}
      {previewData && !result && (
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold text-slate-900">Analiză completă</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total rânduri",  value: previewData.total,   color: "text-slate-700" },
                  { label: "Gata de import", value: previewData.total - previewData.skipped, color: "text-uat-700" },
                  { label: "Omise (goale)",  value: previewData.skipped, color: "text-slate-400" },
                ].map(s => (
                  <div key={s.label} className="bg-slate-50 rounded-xl p-4 text-center">
                    <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              {previewData.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1">
                  <p className="text-sm font-semibold text-amber-800">Avertismente:</p>
                  {previewData.warnings.map((w, i) => <p key={i} className="text-xs text-amber-700">• {w}</p>)}
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  Preview primele {previewData.preview.length} rânduri
                </p>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="text-xs w-full">
                    <thead>
                      <tr className="bg-slate-50">
                        {["Denumire", "Nr. Dosar", "An înreg.", "Adresă", "Status"].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.preview.map((r, i) => (
                        <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                          <td className="px-3 py-2 text-slate-800 font-medium max-w-xs truncate">{r.name}</td>
                          <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{r.courtDossierNumber ?? "—"}</td>
                          <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{r.registrationYear ?? "—"}</td>
                          <td className="px-3 py-2 text-slate-500 max-w-xs truncate">{r.address}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === "DISSOLVED" ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600"}`}>
                              {STATUS_LABEL[r.status] ?? r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={handleCommit} disabled={loading} className="btn-primary disabled:opacity-50 flex items-center gap-2">
                  {loading ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Se importă...</> : `Confirmă importul (${previewData.total - previewData.skipped} rânduri)`}
                </button>
                <button onClick={reset} className="btn-ghost text-sm">Anulează</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div>
                <p className="font-semibold text-emerald-900">Import finalizat cu succes</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Asociații create",     value: result.created, color: "text-emerald-700" },
                { label: "Asociații actualizate", value: result.updated, color: "text-uat-700" },
                { label: "Omise",                 value: result.skipped, color: "text-slate-400" },
              ].map(s => (
                <div key={s.label} className="bg-white/60 rounded-xl p-4 text-center">
                  <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
            {result.errors.length > 0 && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 space-y-1">
                <p className="text-sm font-semibold text-red-800">{result.errors.length} erori:</p>
                {result.errors.slice(0, 10).map((e, i) => <p key={i} className="text-xs text-red-700">• {e}</p>)}
                {result.errors.length > 10 && <p className="text-xs text-red-500">…și {result.errors.length - 10} altele</p>}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Link href="/uat/associations" className="btn-primary">Vezi toate asociațiile →</Link>
            <button onClick={reset} className="btn-secondary">Import nou</button>
          </div>
        </div>
      )}
    </div>
  );
}
