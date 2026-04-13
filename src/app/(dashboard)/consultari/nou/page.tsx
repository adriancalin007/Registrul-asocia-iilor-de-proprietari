// src/app/(dashboard)/consultari/nou/page.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ConsultareNouaPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erori, setErori] = useState<Record<string, string>>({});
  const [trimis, setTrimis] = useState(false);
  const [optiuniText, setOptiuniText] = useState("Da\nNu\nAbțin");

  const [form, setForm] = useState({
    subiect: "", descriere: "",
    dataStart: new Date().toISOString().split("T")[0],
    dataExpirare: "",
  });

  function update(camp: string, val: string) {
    setForm(p => ({ ...p, [camp]: val }));
    setErori(p => ({ ...p, [camp]: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const e2: Record<string, string> = {};
    if (!form.subiect.trim()) e2.subiect = "Obligatoriu";
    if (!form.dataExpirare) e2.dataExpirare = "Obligatoriu";
    if (new Date(form.dataExpirare) <= new Date(form.dataStart)) e2.dataExpirare = "Data expirare trebuie să fie după data start";
    const optiuni = optiuniText.split("\n").map(o => o.trim()).filter(Boolean);
    if (optiuni.length < 2) e2.optiuni = "Minim 2 opțiuni";
    if (Object.keys(e2).length > 0) { setErori(e2); return; }

    startTransition(async () => {
      const res = await fetch("/api/consultari", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, optiuni }),
      });
      const data = await res.json();
      if (!res.ok) { setErori({ general: data.eroare ?? "Eroare." }); return; }
      setTrimis(true);
      setTimeout(() => router.push("/consultari"), 1500);
    });
  }

  if (trimis) return (
    <div className="max-w-lg mx-auto text-center py-20">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-slate-900">Consultare inițiată!</h2>
      <p className="text-slate-500 mt-1">Proprietarii au fost notificați. Redirecționare...</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <Link href="/consultari" className="hover:text-slate-700">Consultări</Link>
          <span>›</span><span>Consultare nouă</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Inițiază consultare digitală</h1>
        <p className="text-sm text-slate-500 mt-1">
          Consultarea digitală permite exprimarea punctelor de vedere ale proprietarilor.
          Nu înlocuiește Adunarea Generală și nu produce hotărâri cu valoare juridică.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="card-body space-y-5">
            <div>
              <label className="label">Subiect consultare <span className="text-red-500">*</span></label>
              <input type="text" value={form.subiect} onChange={e => update("subiect", e.target.value)}
                placeholder="ex: Aprobare deviz reparații acoperiș 2026"
                className={`input ${erori.subiect ? "border-red-400" : ""}`} />
              {erori.subiect && <p className="text-red-500 text-xs mt-1">⚠ {erori.subiect}</p>}
            </div>

            <div>
              <label className="label">Descriere și context (opțional)</label>
              <textarea value={form.descriere} onChange={e => update("descriere", e.target.value)}
                placeholder="Explicați proprietarilor contextul și de ce este necesară consultarea..."
                rows={3} className="input resize-none" />
            </div>

            <div>
              <label className="label">
                Opțiuni de exprimare a punctului de vedere <span className="text-red-500">*</span>
              </label>
              <textarea value={optiuniText}
                onChange={e => { setOptiuniText(e.target.value); setErori(p => ({ ...p, optiuni: "" })); }}
                placeholder="Câte o opțiune pe linie"
                rows={4} className={`input resize-none font-mono text-sm ${erori.optiuni ? "border-red-400" : ""}`} />
              <p className="text-xs text-slate-400 mt-1">Câte o opțiune pe linie. Implicit: Da / Nu / Abțin</p>
              {erori.optiuni && <p className="text-red-500 text-xs mt-1">⚠ {erori.optiuni}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Data start</label>
                <input type="date" value={form.dataStart} onChange={e => update("dataStart", e.target.value)}
                  className="input" />
              </div>
              <div>
                <label className="label">Data expirare <span className="text-red-500">*</span></label>
                <input type="date" value={form.dataExpirare} onChange={e => update("dataExpirare", e.target.value)}
                  className={`input ${erori.dataExpirare ? "border-red-400" : ""}`} />
                {erori.dataExpirare && <p className="text-red-500 text-xs mt-1">⚠ {erori.dataExpirare}</p>}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <p className="font-medium mb-1">⚠ Important</p>
              <p>Consultarea digitală este un instrument de culegere a punctelor de vedere ale proprietarilor.
              Rezultatele au caracter informativ și nu constituie hotărâri ale Adunării Generale.</p>
            </div>

            {erori.general && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-700 text-sm">⚠ {erori.general}</p>
              </div>
            )}
          </div>
          <div className="card-header border-t border-b-0 flex justify-between">
            <Link href="/consultari" className="btn-secondary">Anulează</Link>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? "Se inițiază..." : "Inițiază consultarea"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
