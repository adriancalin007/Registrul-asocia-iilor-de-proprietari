"use client";
// src/app/(dashboard)/documente/[id]/page.tsx

import { useState, useEffect, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import FileUpload from "@/components/FileUpload";

const PREDEFINED_CATEGORIES = [
  "Proces verbal",
  "Hotărâre AGA",
  "Regulament intern",
  "Contract",
  "Factură",
  "Raport financiar",
  "Buget",
  "Dare de seamă",
  "Corespondenţă oficială",
  "Lista cheltuielilor",
  "Lista de plată",
  "Notificare proprietari",
  "Altele",
];

export default function EditDocumentPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [folders, setFolders] = useState<string[]>([]);

  const [form, setForm] = useState({
    title:          "",
    category:       "",
    customCategory: "",
    folder:         "",
    customFolder:   "",
    description:    "",
    fileUrl:        "",
    isPublic:       false,
    status:         "DRAFT",
    documentDate:   "",
    expiresAt:      "",
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/documente/${id}`).then(r => r.ok ? r.json() : null),
      fetch("/api/documente?list=folders").then(r => r.ok ? r.json() : []),
    ]).then(([doc, flds]) => {
      setFolders(flds ?? []);
      if (!doc) { setNotFound(true); setLoading(false); return; }

      const isPredefined = PREDEFINED_CATEGORIES.includes(doc.category);
      setForm({
        title:          doc.title ?? "",
        category:       isPredefined ? doc.category : "Altele",
        customCategory: isPredefined ? "" : (doc.category ?? ""),
        folder:         doc.folder ?? "",
        customFolder:   "",
        description:    doc.description ?? "",
        fileUrl:        doc.fileUrl ?? "",
        isPublic:       doc.isPublic ?? false,
        status:         doc.status ?? "DRAFT",
        documentDate:   doc.documentDate ? doc.documentDate.slice(0, 10) : "",
        expiresAt:      doc.expiresAt    ? doc.expiresAt.slice(0, 10)    : "",
      });
      setLoading(false);
    });
  }, [id]);

  function update(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: "" }));
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = "Titlul este obligatoriu";
    const cat = form.category === "Altele" ? form.customCategory.trim() : form.category;
    if (!cat) errs.category = "Categoria este obligatorie";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const finalCategory = form.category === "Altele" && form.customCategory.trim()
      ? form.customCategory.trim()
      : form.category;

    const finalFolder = form.folder === "__new__"
      ? form.customFolder.trim()
      : form.folder;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/documente/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title:        form.title,
            category:     finalCategory,
            folder:       finalFolder || null,
            description:  form.description || null,
            fileUrl:      form.fileUrl || undefined,
            isPublic:     form.isPublic,
            status:       form.status,
            documentDate: form.documentDate || null,
            expiresAt:    form.expiresAt    || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) { setErrors({ general: data.error ?? "Eroare la salvare" }); return; }
        setSaved(true);
        setTimeout(() => router.push("/documente"), 1500);
      } catch {
        setErrors({ general: "Eroare la salvare" });
      }
    });
  }

  async function handleDelete() {
    if (!confirm("Ștergeți definitiv acest document?")) return;
    const res = await fetch(`/api/documente/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/documente");
    else setErrors({ general: "Eroare la ștergere" });
  }

  if (loading) {
    return <div className="max-w-2xl mx-auto py-20 text-center text-slate-400 text-sm">Se încarcă...</div>;
  }

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <p className="text-slate-600 font-semibold">Document negăsit</p>
        <Link href="/documente" className="btn-secondary mt-4 inline-flex">Înapoi la documente</Link>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Document actualizat!</h2>
        <p className="text-slate-500 mt-1">Redirecționare...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <Link href="/documente" className="hover:text-slate-700">Documente</Link>
          <span>›</span>
          <span>Editare document</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Editează document</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="card-body space-y-5">

            <div>
              <label className="label">Titlu <span className="text-red-500">*</span></label>
              <input
                type="text" value={form.title}
                onChange={e => update("title", e.target.value)}
                className={`input ${errors.title ? "border-red-400" : ""}`}
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="label">Categorie <span className="text-red-500">*</span></label>
              <select
                value={form.category}
                onChange={e => update("category", e.target.value)}
                className={`input ${errors.category ? "border-red-400" : ""}`}
              >
                <option value="">— Selectează categoria —</option>
                {PREDEFINED_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {form.category === "Altele" && (
                <input
                  type="text" value={form.customCategory}
                  onChange={e => update("customCategory", e.target.value)}
                  className="input mt-1.5"
                  placeholder="Specifică tipul documentului..."
                />
              )}
              {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
            </div>

            <div>
              <label className="label">Folder <span className="text-xs text-slate-400">(opțional)</span></label>
              <select
                value={form.folder}
                onChange={e => update("folder", e.target.value)}
                className="input"
              >
                <option value="">— Fără folder —</option>
                {folders.map(f => <option key={f} value={f}>{f}</option>)}
                <option value="__new__">+ Folder nou...</option>
              </select>
              {form.folder === "__new__" && (
                <input
                  type="text" value={form.customFolder}
                  onChange={e => update("customFolder", e.target.value)}
                  className="input mt-1.5"
                  placeholder="Nume folder nou..."
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Data documentului</label>
                <input
                  type="date" value={form.documentDate}
                  onChange={e => update("documentDate", e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Data expirare <span className="text-xs text-slate-400">(opțional)</span></label>
                <input
                  type="date" value={form.expiresAt}
                  onChange={e => update("expiresAt", e.target.value)}
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="label">Descriere <span className="text-xs text-slate-400">(opțional)</span></label>
              <textarea
                value={form.description}
                onChange={e => update("description", e.target.value)}
                rows={3} className="input resize-none"
              />
            </div>

            <div>
              <FileUpload
                label="Înlocuiește fișierul"
                hint="PDF, imagine, Word, Excel · max 20 MB"
                onUpload={(url) => update("fileUrl", url)}
              />
              {form.fileUrl && (
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <span className="text-emerald-600">✓</span>
                  <a href={form.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="text-uat-600 hover:underline truncate max-w-xs">
                    {form.fileUrl}
                  </a>
                  <button type="button" onClick={() => update("fileUrl", "")}
                    className="text-red-400 hover:text-red-600 flex-shrink-0">✕</button>
                </div>
              )}
              <p className="text-xs text-slate-400 mt-1.5">Sau introduceți manual un URL extern:</p>
              <input
                type="url" value={form.fileUrl}
                onChange={e => update("fileUrl", e.target.value)}
                placeholder="https://..."
                className="input mt-1 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Stare publicare</label>
                <select value={form.status} onChange={e => update("status", e.target.value)} className="input">
                  <option value="DRAFT">Ciornă (nevizibil)</option>
                  <option value="PUBLISHED">Publicat</option>
                  <option value="ARCHIVED">Arhivat</option>
                </select>
              </div>
              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-3 cursor-pointer pb-2">
                  <input
                    type="checkbox" checked={form.isPublic}
                    onChange={e => update("isPublic", e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-uat-600 focus:ring-uat-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Vizibil proprietarilor</span>
                </label>
              </div>
            </div>

            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-700 text-sm">{errors.general}</p>
              </div>
            )}
          </div>

          <div className="card-header border-t border-b-0 flex justify-between">
            <div className="flex gap-2">
              <Link href="/documente" className="btn-secondary">Anulează</Link>
              <button type="button" onClick={handleDelete}
                className="text-sm font-medium text-red-500 hover:text-red-700 px-3">
                Șterge
              </button>
            </div>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? "Se salvează..." : "Salvează modificările"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
