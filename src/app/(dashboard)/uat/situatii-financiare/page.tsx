"use client";

import { useEffect, useState } from "react";

type SituatieFinanciara = {
  id: string;
  type: string;
  year: number;
  period: string;
  status: "DRAFT" | "SUBMITTED" | "ACCEPTED" | "REJECTED";
  fileUrl: string | null;
  notes: string | null;
  rejectionReason: string | null;
  createdAt: string;
  submittedAt: string | null;
  submitter?: { fullName: string } | null;
  association?: { name: string; id: string };
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

function ActionPanel({ doc, onDone }: { doc: SituatieFinanciara; onDone: () => void }) {
  const [action, setAction] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [notes, setNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSaving(true);
    setError("");
    const body = action === "APPROVE"
      ? { action: "APPROVE", notes }
      : { action: "REJECT", rejectionReason };

    const res = await fetch(`/api/situatii-financiare/${doc.id}`, {
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
          Acceptă
        </button>
        <button
          onClick={() => setAction("REJECT")}
          className={`text-xs px-3 py-1 rounded-full border ${action === "REJECT" ? "bg-red-600 text-white border-red-600" : "border-gray-300 text-gray-600"}`}
        >
          Respinge
        </button>
      </div>

      {action === "APPROVE" && (
        <input
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Note opționale"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      )}

      {action === "REJECT" && (
        <textarea
          rows={3}
          value={rejectionReason}
          onChange={e => setRejectionReason(e.target.value)}
          placeholder="Motivul respingerii *"
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

export default function UATSituatiiFinanciarePage() {
  const [docs, setDocs] = useState<SituatieFinanciara[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SituatieFinanciara | null>(null);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("SUBMITTED");
  const [neighborhoodFilter, setNeighborhoodFilter] = useState("");
  const [assocFilter, setAssocFilter] = useState("");

  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [associations, setAssociations]   = useState<{ id: string; name: string; neighborhood: string | null }[]>([]);

  useEffect(() => {
    fetch("/api/uat/users/filters").then(r => r.json()).then(d => {
      setNeighborhoods(d.neighborhoods ?? []);
      setAssociations(d.associations ?? []);
    });
  }, []);

  function load() {
    fetch("/api/situatii-financiare")
      .then(r => r.json())
      .then(data => { setDocs(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const filteredAssocs = neighborhoodFilter
    ? associations.filter(a => a.neighborhood === neighborhoodFilter)
    : associations;

  const filtered = docs.filter(d => {
    if (statusFilter && d.status !== statusFilter) return false;
    if (filter && !d.association?.name.toLowerCase().includes(filter.toLowerCase())) return false;
    if (assocFilter && d.association?.id !== assocFilter) return false;
    if (neighborhoodFilter) {
      const match = associations.find(a => a.id === d.association?.id);
      if (!match || match.neighborhood !== neighborhoodFilter) return false;
    }
    return true;
  });

  const hasFilters = !!(filter || statusFilter || neighborhoodFilter || assocFilter);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Situații financiare asociații</h1>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 space-y-3">
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Caută asociație..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="flex-1 min-w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Toate statusurile</option>
            <option value="SUBMITTED">Transmise</option>
            <option value="ACCEPTED">Acceptate</option>
            <option value="REJECTED">Respinse</option>
            <option value="DRAFT">Ciorne</option>
          </select>
        </div>
        <div className="flex gap-3 flex-wrap">
          <select
            value={neighborhoodFilter}
            onChange={e => { setNeighborhoodFilter(e.target.value); setAssocFilter(""); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-36"
          >
            <option value="">Toate cartierele</option>
            {neighborhoods.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <select
            value={assocFilter}
            onChange={e => setAssocFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-48"
          >
            <option value="">Toate asociațiile</option>
            {filteredAssocs.map(a => (
              <option key={a.id} value={a.id}>
                {a.name}{a.neighborhood ? ` — ${a.neighborhood}` : ""}
              </option>
            ))}
          </select>
          {hasFilters && (
            <button
              onClick={() => { setFilter(""); setStatusFilter("SUBMITTED"); setNeighborhoodFilter(""); setAssocFilter(""); }}
              className="text-sm text-slate-500 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50"
            >
              ✕ Resetează
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-gray-500">Se încarcă...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-500">Nu există situații financiare.</p>
          ) : filtered.map(doc => (
            <button
              key={doc.id}
              onClick={() => setSelected(doc)}
              className={`w-full text-left bg-white border rounded-xl p-4 transition-colors ${selected?.id === doc.id ? "border-blue-500" : "border-gray-200 hover:border-blue-300"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{doc.association?.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{TYPE_LABELS[doc.type] ?? doc.type} · {doc.period}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[doc.status]}`}>
                  {STATUS_LABELS[doc.status]}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {doc.submitter?.fullName ?? "—"} · {doc.submittedAt ? new Date(doc.submittedAt).toLocaleDateString("ro-RO") : new Date(doc.createdAt).toLocaleDateString("ro-RO")}
              </p>
            </button>
          ))}
        </div>

        {selected && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="font-semibold text-gray-900 mb-1">{selected.association?.name}</h2>
              <p className="text-xs text-gray-500 mb-3">{TYPE_LABELS[selected.type] ?? selected.type} · {selected.period} · An {selected.year}</p>
              <div className="mb-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[selected.status]}`}>
                  {STATUS_LABELS[selected.status]}
                </span>
              </div>
              {selected.notes && <p className="text-xs text-gray-600 mb-2">Note: {selected.notes}</p>}
              {selected.rejectionReason && <p className="text-xs text-red-600 mb-2">Motiv respingere: {selected.rejectionReason}</p>}
              <p className="text-xs text-gray-500">
                Transmis de: {selected.submitter?.fullName ?? "—"}
                {selected.submittedAt && ` · ${new Date(selected.submittedAt).toLocaleDateString("ro-RO")}`}
              </p>
              {selected.fileUrl && (
                <a href={selected.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm block mt-3">
                  Vizualizează fișier
                </a>
              )}
            </div>

            {selected.status === "SUBMITTED" && (
              <ActionPanel doc={selected} onDone={() => { load(); setSelected(null); }} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
