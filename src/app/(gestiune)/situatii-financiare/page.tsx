"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type SituatieFinanciara = {
  id: string;
  type: string;
  year: number;
  period: string;
  status: "DRAFT" | "SUBMITTED" | "ACCEPTED" | "REJECTED";
  fileUrl: string | null;
  generatedFromPlatform: boolean;
  notes: string | null;
  rejectionReason: string | null;
  createdAt: string;
  submittedAt: string | null;
  submitter?: { fullName: string } | null;
};

const TYPE_LABELS: Record<string, string> = {
  BILANT_ANUAL: "Bilanț anual",
  EXECUTIE_BUGETARA: "Execuție bugetară",
  SITUATIE_CHELTUIELI: "Situație cheltuieli",
  ALTELE: "Altele",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Ciornă",
  SUBMITTED: "Transmisă",
  ACCEPTED: "Acceptată",
  REJECTED: "Respinsă",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  SUBMITTED: "bg-blue-100 text-blue-800",
  ACCEPTED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

const CURRENT_YEAR = new Date().getFullYear();
const DEADLINE_MONTH = 3; // April (0-indexed)
const DEADLINE_DAY = 30;

function DeadlineBanner() {
  const now = new Date();
  const deadline = new Date(now.getFullYear(), DEADLINE_MONTH, DEADLINE_DAY);
  const msLeft = deadline.getTime() - now.getTime();
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

  if (daysLeft < 0 || daysLeft > 60) return null;

  return (
    <div className={`rounded-xl p-4 mb-6 text-sm ${daysLeft <= 30 ? "bg-orange-50 border border-orange-200 text-orange-800" : "bg-blue-50 border border-blue-200 text-blue-800"}`}>
      <strong>Termen limită depunere situații financiare:</strong> 30 aprilie {now.getFullYear()} ({daysLeft > 0 ? `${daysLeft} zile rămase` : "termenul a expirat"})
    </div>
  );
}

export default function SituatiiFinanciarePage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role ?? "";
  const canSubmit = ["MANAGER", "BOARD_PRESIDENT", "SUPER_ADMIN"].includes(role);

  const [docs, setDocs] = useState<SituatieFinanciara[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: "BILANT_ANUAL",
    year: CURRENT_YEAR,
    period: String(CURRENT_YEAR),
    fileUrl: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState<string | null>(null);

  function load() {
    fetch("/api/situatii-financiare")
      .then(r => r.json())
      .then(data => { setDocs(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/situatii-financiare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, fileUrl: form.fileUrl || undefined }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Eroare"); setSaving(false); return; }
    setShowForm(false);
    setForm({ type: "BILANT_ANUAL", year: CURRENT_YEAR, period: String(CURRENT_YEAR), fileUrl: "", notes: "" });
    setSaving(false);
    load();
  }

  async function handleSubmit(id: string) {
    setSubmitting(id);
    const res = await fetch(`/api/situatii-financiare/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "SUBMIT" }),
    });
    setSubmitting(null);
    if (res.ok) load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Sigur vrei să ștergi?")) return;
    await fetch(`/api/situatii-financiare/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Situații financiare</h1>
        {canSubmit && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            + Adaugă situație
          </button>
        )}
      </div>

      <DeadlineBanner />

      {showForm && canSubmit && (
        <form onSubmit={handleCreate} className="bg-white border border-blue-200 rounded-xl p-5 mb-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tip *</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">An *</label>
              <input
                type="number"
                required
                value={form.year}
                onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                min={2000}
                max={2100}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Perioadă *</label>
              <input
                required
                value={form.period}
                onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="ex: 2024, S1 2024, T1 2024"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">URL fișier PDF</label>
            <input
              type="url"
              value={form.fileUrl}
              onChange={e => setForm(f => ({ ...f, fileUrl: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="https://... (opțional)"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Note</label>
            <input
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Opțional"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              {saving ? "Se salvează..." : "Adaugă ciornă"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm">
              Anulează
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Se încarcă...</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-gray-500">Nu există situații financiare.</p>
      ) : (
        <div className="space-y-3">
          {docs.map(doc => (
            <div key={doc.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{TYPE_LABELS[doc.type] ?? doc.type}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[doc.status]}`}>{STATUS_LABELS[doc.status]}</span>
                    <span className="text-xs text-gray-500">{doc.period}</span>
                  </div>
                  {doc.rejectionReason && (
                    <p className="text-xs text-red-600 mt-1">Motiv respingere: {doc.rejectionReason}</p>
                  )}
                  {doc.notes && <p className="text-xs text-gray-400 mt-1">{doc.notes}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(doc.createdAt).toLocaleDateString("ro-RO")}
                    {doc.submittedAt && ` · transmis ${new Date(doc.submittedAt).toLocaleDateString("ro-RO")}`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {doc.fileUrl && (
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
                      Fișier
                    </a>
                  )}
                  {canSubmit && doc.status === "DRAFT" && (
                    <button
                      onClick={() => handleSubmit(doc.id)}
                      disabled={submitting === doc.id}
                      className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs disabled:opacity-50"
                    >
                      {submitting === doc.id ? "..." : "Transmite"}
                    </button>
                  )}
                  {canSubmit && (doc.status === "DRAFT" || doc.status === "REJECTED") && (
                    <button onClick={() => handleDelete(doc.id)} className="text-red-500 hover:text-red-700 text-xs">
                      Șterge
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
