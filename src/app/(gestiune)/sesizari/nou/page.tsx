"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FileUpload from "@/components/FileUpload";

const CATEGORIES = [
  "Zgomot și deranj (vecini)",
  "Nerespectare regulament intern",
  "Deteriorare sau murdărire spații comune",
  "Probleme tehnice (lift, instalații, acoperiș)",
  "Animale de companie (nerespectare norme)",
  "Parcare neregulamentară în spații comune",
  "Acces neautorizat sau intrușii",
  "Deșeuri și salubritate",
  "Conflict între locatari",
  "Altele",
];

export default function SesizareNouaPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: CATEGORIES[0],
    routing: "UAT_GENERAL" as "UAT_GENERAL" | "POLICE",
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/sesizari", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, photos }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Eroare"); setSaving(false); return; }
      router.push(`/sesizari/${data.id}`);
    } catch {
      setError("Eroare de rețea");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sesizare nouă</h1>
        <p className="text-sm text-slate-500 mt-1">Semnalați o problemă în asociație sau în spațiile comune.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="card-body space-y-5">
            <div>
              <label className="label">Titlu <span className="text-red-500">*</span></label>
              <input
                required
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="input"
                placeholder="Descriere scurtă a problemei"
              />
            </div>

            <div>
              <label className="label">Descriere <span className="text-red-500">*</span></label>
              <textarea
                required
                rows={4}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="input resize-none"
                placeholder="Descrie problema în detaliu..."
              />
            </div>

            <div>
              <label className="label">Categorie <span className="text-red-500">*</span></label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="input"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="label mb-2 block">Direcționare <span className="text-red-500">*</span></label>
              <div className="flex flex-col sm:flex-row gap-3">
                {[
                  { val: "UAT_GENERAL", label: "Administrație Sector 1", desc: "Probleme de fond locativ, spații comune" },
                  { val: "POLICE", label: "Poliție Locală Sector 1", desc: "Ordine publică, acces, parcare" },
                ].map(opt => (
                  <label key={opt.val}
                    className={`flex-1 flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${form.routing === opt.val ? "border-uat-400 bg-uat-50" : "border-slate-200 hover:border-slate-300"}`}>
                    <input type="radio" value={opt.val} checked={form.routing === opt.val}
                      onChange={() => setForm(f => ({ ...f, routing: opt.val as "UAT_GENERAL" | "POLICE" }))}
                      className="mt-0.5 accent-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{opt.label}</p>
                      <p className="text-xs text-slate-500">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Photo upload */}
            <div>
              <label className="label mb-1 block">Fotografii / dovezi <span className="text-xs text-slate-400">(opțional)</span></label>
              <FileUpload
                accept="image/*,application/pdf"
                hint="Imagini sau PDF-uri · max 20 MB"
                onUpload={(url) => setPhotos(prev => [...prev, url])}
              />
              {photos.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {photos.map((url, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                      <span className="text-emerald-600">✓</span>
                      <span className="truncate max-w-[140px] text-slate-600">{url.split("/").pop()}</span>
                      <button type="button" onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                        className="text-red-400 hover:text-red-600 ml-1">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
          </div>

          <div className="card-header border-t border-b-0 flex justify-between">
            <button type="button" onClick={() => router.back()} className="btn-secondary">Anulează</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Se trimite..." : "Trimite sesizarea"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
