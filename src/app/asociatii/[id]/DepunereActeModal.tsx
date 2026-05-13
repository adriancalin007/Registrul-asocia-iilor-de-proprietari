"use client";
// src/app/asociatii/[id]/DepunereActeModal.tsx
import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

const ROLES = [
  { value: "PRESEDINTE",    label: "Președinte CA" },
  { value: "ADMINISTRATOR", label: "Administrator" },
  { value: "COMITET",       label: "Membru comitet" },
  { value: "CENZOR",        label: "Cenzor" },
];

interface Props {
  associationId:   string;
  associationName: string;
}

export default function DepunereActeModal({ associationId, associationName }: Props) {
  const router = useRouter();
  const [open,    setOpen]    = useState(false);
  const [step,    setStep]    = useState<"form" | "success">("form");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const [form, setForm] = useState({
    submitterRole:  "PRESEDINTE",
    submitterName:  "",
    submitterEmail: "",
    submitterPhone: "",
    notes:          "",
  });

  const emailSchema = z.string().email();

  function valid() {
    return form.submitterName.trim().length >= 3
      && emailSchema.safeParse(form.submitterEmail.trim()).success;
  }

  async function submit() {
    setSaving(true); setError(null);
    const res = await fetch("/api/public/doc-submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ associationId, ...form }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Eroare"); return; }
    const data = await res.json();
    setStep("success");
    router.push(`/depunere-acte/${data.token}`);
  }

  return (
    <>
      <button onClick={() => { setOpen(true); setStep("form"); setError(null); }} className="btn-primary w-full text-center">
        Depune acte pentru această asociație →
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl leading-none"
            >
              ✕
            </button>

            {step === "success" ? (
              <div className="text-center space-y-3 py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto text-xl">✓</div>
                <h2 className="text-lg font-bold text-slate-900">Cerere înregistrată</h2>
                <p className="text-sm text-slate-500">Veți fi redirecționat către pagina de încărcare documente...</p>
              </div>
            ) : (
              <>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Depunere acte</h2>
                  <p className="text-sm text-slate-500 mt-0.5">{associationName}</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="label-text">Calitate *</label>
                    <select
                      className="input"
                      value={form.submitterRole}
                      onChange={e => setForm(f => ({ ...f, submitterRole: e.target.value }))}
                    >
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-text">Nume complet *</label>
                    <input
                      className="input"
                      placeholder="Ion Popescu"
                      value={form.submitterName}
                      onChange={e => setForm(f => ({ ...f, submitterName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label-text">Email *</label>
                    <input
                      className="input"
                      type="email"
                      placeholder="ion@exemplu.ro"
                      value={form.submitterEmail}
                      onChange={e => setForm(f => ({ ...f, submitterEmail: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label-text">Telefon</label>
                    <input
                      className="input"
                      type="tel"
                      placeholder="07XX XXX XXX"
                      value={form.submitterPhone}
                      onChange={e => setForm(f => ({ ...f, submitterPhone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label-text">Mențiuni (opțional)</label>
                    <textarea
                      className="input"
                      rows={2}
                      placeholder="Mențiuni suplimentare..."
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    />
                  </div>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex gap-3">
                  <button
                    onClick={submit}
                    disabled={!valid() || saving}
                    className="btn-primary flex-1"
                  >
                    {saving ? "Se procesează..." : "Continuă →"}
                  </button>
                  <button onClick={() => setOpen(false)} className="btn-ghost">Anulează</button>
                </div>

                <p className="text-xs text-slate-400 text-center">
                  Datele dvs. sunt utilizate exclusiv pentru verificarea dosarului.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
