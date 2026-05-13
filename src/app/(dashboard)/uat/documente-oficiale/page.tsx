"use client";

import { useEffect, useState } from "react";

type Doc = {
  id: string;
  type: string;
  title: string;
  fileUrl: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "ARCHIVED";
  createdAt: string;
  notes: string | null;
  rejectionReason: string | null;
  uploader?: { fullName: string };
  association?: { name: string; id: string };
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

function ApprovalPanel({ doc, onDone }: { doc: Doc; onDone: () => void }) {
  const [action, setAction] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [docType, setDocType] = useState(doc.type);
  const [notes, setNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSaving(true);
    setError("");
    const body = action === "APPROVE"
      ? { action: "APPROVE", docType, notes }
      : { action: "REJECT", rejectionReason };

    const res = await fetch(`/api/documente-oficiale/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Eroare"); setSaving(false); return; }
    onDone();
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
      <p className="text-sm font-medium text-gray-700">Acțiune</p>
      <div className="flex gap-3">
        <button
          onClick={() => setAction("APPROVE")}
          className={`text-xs px-3 py-1 rounded-full border ${action === "APPROVE" ? "bg-green-600 text-white border-green-600" : "border-gray-300 text-gray-600"}`}
        >
          Aprobă
        </button>
        <button
          onClick={() => setAction("REJECT")}
          className={`text-xs px-3 py-1 rounded-full border ${action === "REJECT" ? "bg-red-600 text-white border-red-600" : "border-gray-300 text-gray-600"}`}
        >
          Respinge
        </button>
      </div>

      {action === "APPROVE" && (
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Tip document esențial <span className="text-gray-400">(versiunile anterioare se arhivează automat)</span>
            </label>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Note opționale"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      )}

      {action === "REJECT" && (
        <textarea
          rows={3}
          value={rejectionReason}
          onChange={e => setRejectionReason(e.target.value)}
          placeholder="Motivul respingerii (minim 5 caractere) *"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        onClick={submit}
        disabled={saving}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
      >
        {saving ? "Se salvează..." : "Salvează"}
      </button>
    </div>
  );
}

export default function UATDocumeOfficialeePage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Doc | null>(null);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  function load() {
    fetch("/api/documente-oficiale")
      .then(r => r.json())
      .then(data => { setDocs(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    if (!confirm("Sigur vrei să ștergi?")) return;
    await fetch(`/api/documente-oficiale/${id}`, { method: "DELETE" });
    setSelected(null);
    load();
  }

  const filtered = docs.filter(d =>
    (!filter || d.title.toLowerCase().includes(filter.toLowerCase()) || d.association?.name.toLowerCase().includes(filter.toLowerCase())) &&
    (!statusFilter || d.status === statusFilter)
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Aprobare documente oficiale</h1>
      <p className="text-sm text-gray-500 mb-6">Documentele sunt încărcate de administratorii asociațiilor și necesită validarea dumneavoastră.</p>

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Caută după titlu sau asociație..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Toate statusurile</option>
          <option value="PENDING">În așteptare</option>
          <option value="APPROVED">Aprobate</option>
          <option value="REJECTED">Respinse</option>
          <option value="ARCHIVED">Arhivate</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-gray-500">Se încarcă...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-500">Nu există documente.</p>
          ) : filtered.map(doc => (
            <button
              key={doc.id}
              onClick={() => setSelected(doc)}
              className={`w-full text-left bg-white border rounded-xl p-4 transition-colors ${selected?.id === doc.id ? "border-blue-500" : "border-gray-200 hover:border-blue-300"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{doc.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{doc.association?.name} · {TYPE_LABELS[doc.type] ?? doc.type}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[doc.status]}`}>
                  {STATUS_LABELS[doc.status]}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {doc.uploader?.fullName} · {new Date(doc.createdAt).toLocaleDateString("ro-RO")}
              </p>
            </button>
          ))}
        </div>

        {selected && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="font-semibold text-gray-900 mb-1">{selected.title}</h2>
              <p className="text-xs text-gray-500 mb-3">{selected.association?.name} · {TYPE_LABELS[selected.type] ?? selected.type}</p>
              <div className="flex gap-2 mb-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[selected.status]}`}>
                  {STATUS_LABELS[selected.status]}
                </span>
              </div>
              {selected.notes && <p className="text-xs text-gray-600 mb-2">Note: {selected.notes}</p>}
              {selected.rejectionReason && <p className="text-xs text-red-600 mb-2">Motiv respingere: {selected.rejectionReason}</p>}
              <div className="flex gap-3 items-center">
                <a href={selected.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                  Vizualizează fișier
                </a>
                <button onClick={() => handleDelete(selected.id)} className="text-red-500 hover:text-red-700 text-xs">
                  Șterge
                </button>
              </div>
            </div>

            {selected.status === "PENDING" && (
              <ApprovalPanel doc={selected} onDone={() => { load(); setSelected(null); }} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
