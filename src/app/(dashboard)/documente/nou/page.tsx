// src/app/(dashboard)/documente/nou/page.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const CATEGORII = [
  "Regulament intern",
  "Proces verbal",
  "Contract",
  "Dare de seamă",
  "Buget",
  "Hotărâre AGA",
  "Raport financiar",
  "Corespondenţă oficială",
  "Altele",
];

export default function DocumentNouPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erori, setErori] = useState<Record<string, string>>({});
  const [mesajSucces, setMesajSucces] = useState(false);

  const [form, setForm] = useState({
    titlu: "",
    categorie: "",
    descriere: "",
    caleStocata: "",
    accesPublic: false,
    stare: "DRAFT",
    dataExpirare: "",
  });

  function update(camp: string, valoare: string | boolean) {
    setForm((prev) => ({ ...prev, [camp]: valoare }));
    setErori((prev) => ({ ...prev, [camp]: "" }));
  }

  function valideaza(): boolean {
    const e: Record<string, string> = {};
    if (!form.titlu.trim()) e.titlu = "Titlul este obligatoriu";
    if (!form.categorie) e.categorie = "Categoria este obligatorie";
    setErori(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valideaza()) return;

    startTransition(async () => {
      try {
        const res = await fetch("/api/documente", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        const data = await res.json();

        if (!res.ok) {
          setErori({ general: data.eroare ?? "A apărut o eroare." });
          return;
        }

        setMesajSucces(true);
        setTimeout(() => router.push("/documente"), 1500);
      } catch {
        setErori({ general: "Eroare de rețea. Încercați din nou." });
      }
    });
  }

  if (mesajSucces) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Document salvat!</h2>
        <p className="text-slate-500 mt-1">Redirecționare...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <Link href="/documente" className="hover:text-slate-700">Documente</Link>
          <span>›</span>
          <span>Document nou</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Adaugă document</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="card-body space-y-5">
            {/* Titlu */}
            <div>
              <label className="label">Titlu <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.titlu}
                onChange={(e) => update("titlu", e.target.value)}
                placeholder="ex: Proces verbal ședință 15 martie 2026"
                className={`input ${erori.titlu ? "border-red-400" : ""}`}
              />
              {erori.titlu && <p className="text-red-500 text-sm mt-1">{erori.titlu}</p>}
            </div>

            {/* Categorie */}
            <div>
              <label className="label">Categorie <span className="text-red-500">*</span></label>
              <select
                value={form.categorie}
                onChange={(e) => update("categorie", e.target.value)}
                className={`input ${erori.categorie ? "border-red-400" : ""}`}
              >
                <option value="">— Selectați categoria —</option>
                {CATEGORII.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {erori.categorie && <p className="text-red-500 text-sm mt-1">{erori.categorie}</p>}
            </div>

            {/* Descriere */}
            <div>
              <label className="label">Descriere (opțional)</label>
              <textarea
                value={form.descriere}
                onChange={(e) => update("descriere", e.target.value)}
                placeholder="Descriere scurtă a documentului..."
                rows={3}
                className="input resize-none"
              />
            </div>

            {/* Link document */}
            <div>
              <label className="label">Link document (URL)</label>
              <input
                type="url"
                value={form.caleStocata}
                onChange={(e) => update("caleStocata", e.target.value)}
                placeholder="https://... (Google Drive, OneDrive etc.)"
                className="input"
              />
              <p className="text-xs text-slate-400 mt-1">
                Introduceți linkul către document. Stocarea fișierelor va fi disponibilă în faza 2.
              </p>
            </div>

            {/* Data expirare */}
            <div>
              <label className="label">Dată expirare (opțional)</label>
              <input
                type="date"
                value={form.dataExpirare}
                onChange={(e) => update("dataExpirare", e.target.value)}
                className="input"
              />
            </div>

            {/* Stare și acces */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Stare publicare</label>
                <select
                  value={form.stare}
                  onChange={(e) => update("stare", e.target.value)}
                  className="input"
                >
                  <option value="DRAFT">Draft (nevizibil)</option>
                  <option value="PUBLICAT">Publicat</option>
                </select>
              </div>
              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-3 cursor-pointer pb-2">
                  <input
                    type="checkbox"
                    checked={form.accesPublic}
                    onChange={(e) => update("accesPublic", e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-uat-600 focus:ring-uat-500"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Vizibil proprietarilor
                  </span>
                </label>
                <p className="text-xs text-slate-400">
                  Dacă bifat, toți proprietarii pot vedea documentul
                </p>
              </div>
            </div>

            {erori.general && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-700 text-sm">{erori.general}</p>
              </div>
            )}
          </div>

          <div className="card-header border-t border-b-0 flex justify-between">
            <Link href="/documente" className="btn-secondary">
              Anulează
            </Link>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? "Se salvează..." : "Salvează documentul"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
