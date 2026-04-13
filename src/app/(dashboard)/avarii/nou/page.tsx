// src/app/(dashboard)/avarii/nou/page.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const CATEGORII = [
  "Instalații sanitare", "Instalații electrice", "Instalații termice",
  "Structură (fisuri, infiltrații)", "Lift", "Acoperiș / terasă",
  "Spații comune", "Instalații gaze", "Altele",
];

export default function AvarieNouaPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erori, setErori] = useState<Record<string, string>>({});
  const [trimis, setTrimis] = useState(false);

  const [form, setForm] = useState({
    categorie: "", locatie: "", descriere: "", prioritate: "NORMALA",
  });

  function update(camp: string, val: string) {
    setForm(p => ({ ...p, [camp]: val }));
    setErori(p => ({ ...p, [camp]: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const e2: Record<string, string> = {};
    if (!form.categorie) e2.categorie = "Selectați categoria";
    if (!form.locatie.trim()) e2.locatie = "Obligatoriu";
    if (!form.descriere.trim()) e2.descriere = "Descrieți avaria";
    if (Object.keys(e2).length > 0) { setErori(e2); return; }

    startTransition(async () => {
      const res = await fetch("/api/avarii", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setErori({ general: data.eroare ?? "Eroare." }); return; }
      setTrimis(true);
      setTimeout(() => router.push("/avarii"), 1500);
    });
  }

  if (trimis) return (
    <div className="max-w-lg mx-auto text-center py-20">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-slate-900">Sesizare înregistrată!</h2>
      <p className="text-slate-500 mt-1">Administratorul a fost notificat. Redirecționare...</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <Link href="/avarii" className="hover:text-slate-700">Avarii</Link>
          <span>›</span><span>Sesizare nouă</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Înregistrează avarie</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="card-body space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Categorie <span className="text-red-500">*</span></label>
                <select value={form.categorie} onChange={e => update("categorie", e.target.value)}
                  className={`input ${erori.categorie ? "border-red-400" : ""}`}>
                  <option value="">— Selectați —</option>
                  {CATEGORII.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {erori.categorie && <p className="text-red-500 text-xs mt-1">⚠ {erori.categorie}</p>}
              </div>
              <div>
                <label className="label">Prioritate</label>
                <select value={form.prioritate} onChange={e => update("prioritate", e.target.value)} className="input">
                  <option value="SCAZUTA">Scăzută — poate aștepta</option>
                  <option value="NORMALA">Normală</option>
                  <option value="URGENTA">🔴 Urgentă — necesită intervenție rapidă</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Locație exactă <span className="text-red-500">*</span></label>
              <input type="text" value={form.locatie} onChange={e => update("locatie", e.target.value)}
                placeholder="ex: Subsol, lângă centrala termică / Etaj 3, casa scării"
                className={`input ${erori.locatie ? "border-red-400" : ""}`} />
              {erori.locatie && <p className="text-red-500 text-xs mt-1">⚠ {erori.locatie}</p>}
            </div>

            <div>
              <label className="label">Descriere <span className="text-red-500">*</span></label>
              <textarea value={form.descriere} onChange={e => update("descriere", e.target.value)}
                placeholder="Descrieți în detaliu avaria: ce s-a întâmplat, când a apărut, ce efecte are..."
                rows={4} className={`input resize-none ${erori.descriere ? "border-red-400" : ""}`} />
              {erori.descriere && <p className="text-red-500 text-xs mt-1">⚠ {erori.descriere}</p>}
            </div>

            {erori.general && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-700 text-sm">⚠ {erori.general}</p>
              </div>
            )}
          </div>
          <div className="card-header border-t border-b-0 flex justify-between">
            <Link href="/avarii" className="btn-secondary">Anulează</Link>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? "Se înregistrează..." : "Înregistrează sesizarea"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
