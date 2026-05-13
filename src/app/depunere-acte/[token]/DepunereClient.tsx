"use client";
// src/app/depunere-acte/[token]/DepunereClient.tsx
import { useState, useRef } from "react";
import { formatFileSize, ALLOWED_TYPES, MAX_FILE_SIZE } from "@/lib/storage";

type SubmissionFile = {
  id: string;
  docType: string;
  fileUrl: string;
  fileSize: number | null;
  uploadedAt: string;
};

type Submission = {
  id: string;
  status: string;
  submitterName: string;
  submitterRole: string;
  tokenExpiresAt: string;
  notes: string | null;
  association: { id: string; name: string; address: string | null; rawAddress: string | null };
  files: SubmissionFile[];
};

const DOC_TYPES = [
  { value: "carte_identitate",    label: "Carte de identitate" },
  { value: "proces_verbal_ag",    label: "Proces-verbal AGA" },
  { value: "hotarare_judecatoreasca", label: "Hotărâre judecătorească" },
  { value: "contract_presedinte", label: "Contract mandat președinte" },
  { value: "contract_administrator", label: "Contract administrator" },
  { value: "regulament_intern",   label: "Regulament interior" },
  { value: "lista_proprietari",   label: "Listă proprietari" },
  { value: "situatie_financiara", label: "Situație financiară" },
  { value: "altele",              label: "Alt document" },
];

const ROLE_LABELS: Record<string, string> = {
  PRESEDINTE:    "Președinte CA",
  ADMINISTRATOR: "Administrator",
  COMITET:       "Membru comitet",
  CENZOR:        "Cenzor",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  IDENTITY_PENDING:  { label: "În așteptare verificare identitate", color: "text-amber-700 bg-amber-50 border-amber-200" },
  IDENTITY_VERIFIED: { label: "Identitate verificată",              color: "text-blue-700 bg-blue-50 border-blue-200" },
  MANUAL_REVIEW:     { label: "În verificare manuală",             color: "text-blue-700 bg-blue-50 border-blue-200" },
  COMPLETED:         { label: "Finalizat",                          color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  REJECTED:          { label: "Respins",                            color: "text-red-700 bg-red-50 border-red-200" },
};

interface Props { token: string; initial: Submission }

export default function DepunereClient({ token, initial }: Props) {
  const [submission, setSubmission] = useState<Submission>(initial);
  const [docType, setDocType]       = useState("carte_identitate");
  const [file, setFile]             = useState<File | null>(null);
  const [uploading, setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isExpired   = new Date(submission.tokenExpiresAt) < new Date();
  const isClosed    = submission.status === "COMPLETED" || submission.status === "REJECTED";
  const canUpload   = !isExpired && !isClosed;
  const statusCfg   = STATUS_LABELS[submission.status] ?? STATUS_LABELS.MANUAL_REVIEW;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(null);
    setUploadError(null);
    if (!f) return;
    if (!ALLOWED_TYPES.includes(f.type)) { setUploadError(`Tip neacceptat: ${f.type}`); return; }
    if (f.size > MAX_FILE_SIZE) { setUploadError("Fișierul depășește 10 MB."); return; }
    setFile(f);
  }

  async function upload() {
    if (!file) return;
    setUploading(true); setUploadError(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("docType", docType);

    const res = await fetch(`/api/public/doc-submissions/${token}/upload`, { method: "POST", body: fd });
    setUploading(false);

    if (!res.ok) { const d = await res.json(); setUploadError(d.error ?? "Eroare la încărcare."); return; }

    const newFile = await res.json() as SubmissionFile;
    setSubmission(s => ({ ...s, files: [...s.files, newFile] }));
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Depunere documente</h1>
          <p className="text-slate-500 mt-1">{submission.association.name}</p>
          {submission.association.rawAddress ?? submission.association.address ? (
            <p className="text-sm text-slate-400">{submission.association.rawAddress ?? submission.association.address}</p>
          ) : null}
        </div>

        {/* Status */}
        <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${statusCfg.color}`}>
          <div className="flex-1">
            <p className="font-medium text-sm">{statusCfg.label}</p>
            <p className="text-xs opacity-75 mt-0.5">
              {submission.submitterName} · {ROLE_LABELS[submission.submitterRole] ?? submission.submitterRole}
            </p>
          </div>
          <div className="text-xs opacity-60 text-right">
            <p>{submission.files.length} fișiere încărcate</p>
            {!isExpired && (
              <p>Expiră: {new Date(submission.tokenExpiresAt).toLocaleDateString("ro-RO")}</p>
            )}
          </div>
        </div>

        {/* Expired */}
        {isExpired && (
          <div className="card p-6 text-center text-slate-500">
            <p className="font-medium text-slate-700 mb-1">Link expirat</p>
            <p className="text-sm">Contactați Primăria Sector 1 pentru a solicita un nou link.</p>
          </div>
        )}

        {/* Closed */}
        {!isExpired && isClosed && (
          <div className="card p-6 text-center text-slate-500">
            <p className="font-medium text-slate-700 mb-1">Dosar finalizat</p>
            <p className="text-sm">Operatorul a procesat dosarul dvs. Nu mai pot fi adăugate documente.</p>
          </div>
        )}

        {/* Upload form */}
        {canUpload && (
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-slate-900">Adaugă document</h2>

            <div>
              <label className="label-text">Tip document</label>
              <select className="input" value={docType} onChange={e => setDocType(e.target.value)}>
                {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>

            <div>
              <label className="label-text">Fișier (PDF, imagini, Word — max 10 MB)</label>
              <label
                className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors ${
                  file ? "border-uat-300 bg-uat-50" : "border-slate-200 hover:border-uat-300 hover:bg-slate-50"
                }`}
              >
                {file ? (
                  <>
                    <p className="font-medium text-slate-900 text-sm">{file.name}</p>
                    <p className="text-xs text-slate-400">{formatFileSize(file.size)} · click pentru a schimba</p>
                  </>
                ) : (
                  <>
                    <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
                    </svg>
                    <p className="text-sm text-slate-500">Click pentru a selecta fișierul</p>
                  </>
                )}
                <input ref={fileRef} type="file" className="sr-only" onChange={handleFile}
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" />
              </label>
            </div>

            {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}

            <button
              onClick={upload}
              disabled={!file || uploading}
              className="btn-primary w-full"
            >
              {uploading ? "Se încarcă..." : "Încarcă documentul"}
            </button>
          </div>
        )}

        {/* Uploaded files */}
        {submission.files.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold text-slate-900">Documente încărcate</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {submission.files.map(f => {
                const docLabel = DOC_TYPES.find(d => d.value === f.docType)?.label ?? f.docType;
                return (
                  <div key={f.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{docLabel}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {f.fileSize ? formatFileSize(f.fileSize) + " · " : ""}
                        {new Date(f.uploadedAt).toLocaleString("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <a href={f.fileUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-uat-600 hover:underline flex-shrink-0">
                      Vizualizare →
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="text-center text-xs text-slate-400 pb-4">
          Documentele dvs. sunt procesate în conformitate cu legislația privind protecția datelor cu caracter personal.
          <br />
          Primăria Sectorului 1 București
        </div>
      </div>
    </div>
  );
}
