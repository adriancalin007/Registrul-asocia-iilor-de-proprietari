"use client";
// src/components/ui/FileUpload.tsx
import { useState, useRef, useCallback } from "react";
import {
  uploadFile,
  deleteFile,
  formatFileSize,
  ALLOWED_TYPES,
  MAX_FILE_SIZE,
  type DocumentCategory,
  type UploadResult,
} from "@/lib/storage";

interface FileUploadProps {
  associationId: string;
  category: DocumentCategory;
  label: string;
  required?: boolean;
  value?: UploadResult | null;
  onChange: (result: UploadResult | null) => void;
  error?: string;
  hint?: string;
  accept?: string;
}

export default function FileUpload({
  associationId,
  category,
  label,
  required,
  value,
  onChange,
  error,
  hint,
  accept,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptTypes = accept ?? ALLOWED_TYPES.join(",");

  async function handleFile(file: File) {
    setUploadError("");

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError("Tip de fișier neacceptat. Sunt acceptate: PDF, JPG, PNG, DOC, DOCX");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setUploadError(`Fișierul este prea mare. Limita este ${formatFileSize(MAX_FILE_SIZE)}`);
      return;
    }

    setUploading(true);
    try {
      // Delete previous file if exists
      if (value?.path) {
        await deleteFile(value.path).catch(() => {});
      }

      const result = await uploadFile(file, associationId, category);
      onChange(result);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Eroare la încărcare");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    if (!value) return;
    setUploading(true);
    try {
      await deleteFile(value.path).catch(() => {});
      onChange(null);
    } finally {
      setUploading(false);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [value]
  );

  const displayError = error || uploadError;

  return (
    <div>
      <label className="label text-sm">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
        {hint && <span className="text-slate-400 font-normal ml-1">({hint})</span>}
      </label>

      {value ? (
        // Uploaded state
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
          displayError ? "border-red-300 bg-red-50" : "border-emerald-200 bg-emerald-50"
        }`}>
          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-lg">{getFileIcon(value.type)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{value.name}</p>
            <p className="text-xs text-slate-500">{formatFileSize(value.size)}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={value.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs py-1 px-2.5"
            >
              Deschide
            </a>
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        // Upload zone
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-2 px-4 py-5 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
            dragOver
              ? "border-uat-400 bg-uat-50"
              : displayError
              ? "border-red-300 bg-red-50"
              : "border-slate-200 bg-slate-50 hover:border-uat-300 hover:bg-uat-50/30"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={acceptTypes}
            className="sr-only"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />

          {uploading ? (
            <>
              <svg className="animate-spin w-6 h-6 text-uat-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <p className="text-sm text-uat-600 font-medium">Se încarcă...</p>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700">
                  <span className="text-uat-600">Apasă pentru a încărca</span> sau trage fișierul aici
                </p>
                <p className="text-xs text-slate-400 mt-0.5">PDF, JPG, PNG, DOC — max. 10MB</p>
              </div>
            </>
          )}
        </div>
      )}

      {displayError && (
        <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {displayError}
        </p>
      )}
    </div>
  );
}

function getFileIcon(mimeType: string): string {
  if (mimeType.includes("pdf")) return "📄";
  if (mimeType.includes("image")) return "🖼️";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  return "📎";
}
