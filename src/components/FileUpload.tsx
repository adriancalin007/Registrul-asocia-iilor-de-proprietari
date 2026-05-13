"use client";
// Reusable drag-and-drop file upload component.
// Uploads via POST /api/upload (multipart), calls onUpload(url) on success.

import { useState, useRef, useCallback } from "react";

interface Props {
  onUpload: (url: string, meta: { name: string; size: number; mimeType: string }) => void;
  accept?: string;
  label?: string;
  hint?: string;
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function FileUpload({ onUpload, accept, label, hint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File) => {
    setError(null);
    setUploading(true);
    setProgress(10);
    setFileName(file.name);

    const fd = new FormData();
    fd.append("file", file);

    try {
      // Simulate progress since fetch doesn't expose upload progress
      const tick = setInterval(() => setProgress(p => Math.min(p + 15, 85)), 300);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      clearInterval(tick);

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Eroare la încărcare");
        setUploading(false);
        setProgress(0);
        return;
      }

      setProgress(100);
      onUpload(data.url, { name: data.name, size: data.size, mimeType: data.mimeType });
    } catch {
      setError("Eroare de rețea la încărcare");
    } finally {
      setUploading(false);
    }
  }, [onUpload]);

  const handleFiles = useCallback((files: FileList | null) => {
    const file = files?.[0];
    if (file) upload(file);
  }, [upload]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = (e: React.DragEvent) => {
    // Only clear when leaving the drop zone entirely (not when entering a child element)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
  };

  return (
    <div className="space-y-2">
      {label && <label className="label-text">{label}</label>}

      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`
          relative flex flex-col items-center justify-center gap-2 px-6 py-8
          border-2 border-dashed rounded-xl cursor-pointer select-none
          transition-all duration-150
          ${dragging ? "border-uat-500 bg-uat-50" : "border-slate-200 bg-slate-50/50 hover:border-uat-300 hover:bg-slate-50"}
          ${uploading ? "pointer-events-none opacity-70" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept ?? "application/pdf,image/*,.doc,.docx,.xls,.xlsx"}
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />

        {uploading ? (
          <div className="w-full max-w-xs space-y-2 text-center">
            <div className="w-8 h-8 mx-auto">
              <svg className="animate-spin text-uat-600 w-8 h-8" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <p className="text-sm text-slate-600 truncate">{fileName}</p>
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-uat-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-slate-400">Se încarcă...</p>
          </div>
        ) : fileName && progress === 100 ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">{fileName}</p>
              <p className="text-xs text-slate-400">Fișier încărcat · <span className="text-uat-600 hover:underline cursor-pointer" onClick={e => { e.stopPropagation(); setFileName(null); setProgress(0); }}>Înlocuiește</span></p>
            </div>
          </div>
        ) : (
          <>
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700">
                Trage fișierul aici sau <span className="text-uat-600">selectează</span>
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {hint ?? "PDF, imagine, Word, Excel · max 20 MB"}
              </p>
            </div>
          </>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}
    </div>
  );
}
