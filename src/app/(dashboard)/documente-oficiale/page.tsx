"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Doc = {
  id: string;
  type: string;
  title: string;
  fileUrl: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "ARCHIVED";
  createdAt: string;
  notes: string | null;
  uploader?: { fullName: string };
};

const TYPE_LABELS: Record<string, string> = {
  CONTRACT_MANDAT: "Contract de mandat",
  STATUT: "Statut asociație",
  CI_PRESEDINTE: "CI Președinte",
  CI_ADMINISTRATOR: "CI Administrator",
  CONTRACT_ADMINISTRARE: "Contract administrare",
  HOT_AGA_ALEGERE: "Hotărâre AGA – Alegere",
  HOT_AGA_APROBARE: "Hotărâre AGA – Aprobare",
  REGULAMENT_INTERN: "Regulament intern",
  CERTIFICAT_FISCAL: "Certificat fiscal",
  ALTE: "Alte documente",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "În așteptare",
  APPROVED: "Aprobat",
  REJECTED: "Respins",
  ARCHIVED: "Arhivat",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  ARCHIVED: "bg-gray-100 text-gray-500",
};

export default function DocumeOfficialeMembruPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role ?? "";
  const canUpload = ["MANAGER", "BOARD_PRESIDENT", "SUPER_ADMIN"].includes(role);

  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "CONTRACT_MANDAT", title: "", fileUrl: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    fetch("/api/documente-oficiale")
      .then(r => r.json())
      .then(data => { setDocs(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/documente-oficiale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Eroare"); setSaving(false); return; }
    setShowForm(false);
    setForm({ type: "CONTRACT_MANDAT", title: "", fileUrl: "", notes: "" });
    setSaving(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Sigur vrei să ștergi acest document?")) return;
    await fetch(`/api/documente-oficiale/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Documente oficiale</h1>
        {canUpload && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            + Adaugă document
          </button>
        )}
      </div>
      {canUpload && (
        <p className="text-sm text-gray-500 mb-6">
          Documentele încărcate de asociație sunt transmise către Sectorul 1 pentru validare și aprobare.
        </p>
      )}
      {!canUpload && <div className="mb-6" />}

      {showForm && canUpload && (
        <form onSubmit={handleAdd} className="bg-white border border-blue-200 rounded-xl p-5 mb-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tip document</label>
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
              <label className="block text-xs font-medium text-gray-700 mb-1">Titlu *</label>
              <input
                required
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Titlu document"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">URL fișier *</label>
            <input
              required
              type="url"
              value={form.fileUrl}
              onChange={e => setForm(f => ({ ...f, fileUrl: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="https://..."
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
              {saving ? "Se salvează..." : "Adaugă"}
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
        <p className="text-sm text-gray-500">Nu există documente oficiale.</p>
      ) : (
        <div className="space-y-3">
          {docs.map(doc => (
            <div key={doc.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{TYPE_LABELS[doc.type] ?? doc.type}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[doc.status]}`}>{STATUS_LABELS[doc.status]}</span>
                </div>
                <p className="font-medium text-gray-900 mt-1 text-sm truncate">{doc.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Adăugat de {doc.uploader?.fullName ?? "—"} · {new Date(doc.createdAt).toLocaleDateString("ro-RO")}
                </p>
                {doc.notes && <p className="text-xs text-gray-400 mt-1">{doc.notes}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-xs"
                >
                  Vizualizează
                </a>
                {canUpload && doc.status !== "APPROVED" && (
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    Șterge
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
