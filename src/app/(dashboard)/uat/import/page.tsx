"use client";
// src/app/(dashboard)/uat/import/page.tsx
import { useState, useRef } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";

interface ImportSummary {
  rowsProcessed: number;
  summary: {
    associations: { created: number; updated: number };
    buildings:    { created: number; existing: number };
    units:        { created: number; existing: number };
    users:        { created: number; existing: number };
    ownerships:   { created: number; existing: number };
  };
}

interface PreviewRow {
  [key: string]: unknown;
}

export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile]               = useState<File | null>(null);
  const [preview, setPreview]         = useState<{ headers: string[]; rows: PreviewRow[] } | null>(null);
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState<ImportSummary | null>(null);
  const [errors, setErrors]           = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  // ── Client-side preview parse ──────────────────────────────────────────
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(null);
    setResult(null);
    setErrors([]);
    setServerError(null);

    if (!f) return;

    const buf = await f.arrayBuffer();
    const wb  = XLSX.read(buf, { type: "array" });
    const sheetName = wb.SheetNames.includes("Data") ? "Data" : wb.SheetNames[0];
    if (!sheetName) return;

    const ws   = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<PreviewRow>(ws, { defval: "" });

    if (rows.length === 0) return;

    const headers = Object.keys(rows[0]);
    setPreview({ headers, rows: rows.slice(0, 8) });
  }

  // ── Submit import ──────────────────────────────────────────────────────
  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setErrors([]);
    setServerError(null);
    setResult(null);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res  = await fetch("/api/uat/import", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        else setServerError(data.error ?? "Import failed");
      } else {
        setResult(data as ImportSummary);
      }
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setErrors([]);
    setServerError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb + title */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
          <Link href="/uat" className="hover:text-slate-600">UAT Panel</Link>
          <span>›</span>
          <span className="text-slate-700">Import Associations</span>
        </div>
        <h1 className="page-title">Import from Excel</h1>
        <p className="page-subtitle">
          Upload the municipality&apos;s spreadsheet to create associations, buildings, units and owner accounts in bulk.
        </p>
      </div>

      {/* Step 1 — Download template */}
      {!result && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-900">Step 1 · Download the template</h2>
          </div>
          <div className="card-body flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-600 mb-3">
                The template contains two sheets: <strong>Instructions</strong> (column reference) and <strong>Data</strong>
                (one row per apartment). Fill in the Data sheet and upload it below.
              </p>
              <a href="/api/uat/import/template"
                className="btn-primary inline-flex items-center gap-2 text-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/>
                </svg>
                Download template (.xlsx)
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Step 2 — Upload */}
      {!result && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-900">Step 2 · Upload filled spreadsheet</h2>
          </div>
          <div className="card-body space-y-4">
            <label
              htmlFor="file-upload"
              className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-colors ${
                file ? "border-uat-300 bg-uat-50" : "border-slate-200 hover:border-uat-300 hover:bg-slate-50"
              }`}
            >
              {file ? (
                <>
                  <svg className="w-8 h-8 text-uat-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/>
                  </svg>
                  <p className="font-medium text-slate-900 text-sm">{file.name}</p>
                  <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB · click to change</p>
                </>
              ) : (
                <>
                  <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
                  </svg>
                  <p className="text-sm text-slate-500">Click to select or drag &amp; drop</p>
                  <p className="text-xs text-slate-400">.xlsx files only</p>
                </>
              )}
              <input
                ref={fileRef}
                id="file-upload"
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                onChange={handleFileChange}
              />
            </label>

            {/* Preview table */}
            {preview && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  Preview — first {preview.rows.length} rows
                </p>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="text-xs w-full">
                    <thead>
                      <tr className="bg-slate-50">
                        {preview.headers.map(h => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap border-b border-slate-200">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((row, i) => (
                        <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                          {preview.headers.map(h => (
                            <td key={h} className="px-3 py-2 text-slate-700 whitespace-nowrap">
                              {String(row[h] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Validation errors */}
            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1">
                <p className="text-sm font-semibold text-red-800 mb-2">
                  {errors.length} validation error{errors.length > 1 ? "s" : ""} — fix the spreadsheet and re-upload:
                </p>
                {errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-700">• {e}</p>
                ))}
              </div>
            )}

            {serverError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-800">{serverError}</p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleImport}
                disabled={!file || loading}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Importing…
                  </>
                ) : (
                  "Run import"
                )}
              </button>
              {file && !loading && (
                <button type="button" onClick={reset} className="btn-ghost text-sm">
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Result ──────────────────────────────────────────────────────────── */}
      {result && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div>
                <p className="font-semibold text-green-900">Import completed successfully</p>
                <p className="text-sm text-green-700">{result.rowsProcessed} rows processed</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                {
                  label: "Associations",
                  created: result.summary.associations.created,
                  other: result.summary.associations.updated,
                  otherLabel: "updated",
                  color: "bg-blue-50 border-blue-200",
                  textColor: "text-blue-800",
                },
                {
                  label: "Buildings",
                  created: result.summary.buildings.created,
                  other: result.summary.buildings.existing,
                  otherLabel: "already existed",
                  color: "bg-purple-50 border-purple-200",
                  textColor: "text-purple-800",
                },
                {
                  label: "Units",
                  created: result.summary.units.created,
                  other: result.summary.units.existing,
                  otherLabel: "already existed",
                  color: "bg-amber-50 border-amber-200",
                  textColor: "text-amber-800",
                },
                {
                  label: "Owner accounts",
                  created: result.summary.users.created,
                  other: result.summary.users.existing,
                  otherLabel: "already existed",
                  color: "bg-teal-50 border-teal-200",
                  textColor: "text-teal-800",
                },
                {
                  label: "Ownerships",
                  created: result.summary.ownerships.created,
                  other: result.summary.ownerships.existing,
                  otherLabel: "already existed",
                  color: "bg-green-50 border-green-200",
                  textColor: "text-green-800",
                },
              ].map(s => (
                <div key={s.label} className={`rounded-xl border ${s.color} p-4`}>
                  <p className={`text-2xl font-bold ${s.textColor}`}>{s.created}</p>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">{s.label} created</p>
                  {s.other > 0 && (
                    <p className="text-xs text-slate-400 mt-1">{s.other} {s.otherLabel}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <strong>Note:</strong> Newly created owner accounts have no password set.
            Owners should use the &quot;Forgot password&quot; link on the login page to activate their account.
          </div>

          <div className="flex gap-3">
            <Link href="/uat/associations" className="btn-primary">
              View associations →
            </Link>
            <button type="button" onClick={reset} className="btn-secondary">
              Import another file
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
