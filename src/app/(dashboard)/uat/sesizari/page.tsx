"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Sesizare = {
  id: string;
  title: string;
  category: string;
  routing: "UAT_GENERAL" | "POLICE";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  createdAt: string;
  submitter?: { fullName: string; email: string };
  responder?: { fullName: string } | null;
  association?: { name: string; neighborhood: string };
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Deschisă",
  IN_PROGRESS: "În curs",
  RESOLVED: "Rezolvată",
  CLOSED: "Închisă",
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-700",
};

type Action = "RESPOND" | "REROUTE" | "STATUS";

function ActionPanel({ sesizare, onDone }: { sesizare: Sesizare; onDone: () => void }) {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role ?? "";
  const isPolice = role === "POLICE_OPERATOR";

  const [action, setAction] = useState<Action>("RESPOND");
  const [response, setResponse] = useState("");
  const [status, setStatus] = useState("IN_PROGRESS");
  const [routing, setRouting] = useState<"UAT_GENERAL" | "POLICE">("UAT_GENERAL");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSaving(true);
    setError("");
    let body: Record<string, string> = { action };
    if (action === "RESPOND") { body.response = response; body.status = status; }
    if (action === "REROUTE") body.routing = routing;
    if (action === "STATUS") body.status = status;

    const res = await fetch(`/api/sesizari/${sesizare.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Eroare"); setSaving(false); return; }
    onDone();
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <div className="flex gap-2">
        {!isPolice && (
          <>
            <button onClick={() => setAction("RESPOND")} className={`text-xs px-3 py-1 rounded-full border ${action === "RESPOND" ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 text-gray-600"}`}>Răspunde</button>
            <button onClick={() => setAction("REROUTE")} className={`text-xs px-3 py-1 rounded-full border ${action === "REROUTE" ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 text-gray-600"}`}>Redirecționează</button>
            <button onClick={() => setAction("STATUS")} className={`text-xs px-3 py-1 rounded-full border ${action === "STATUS" ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 text-gray-600"}`}>Schimbă status</button>
          </>
        )}
        {isPolice && (
          <button onClick={() => setAction("RESPOND")} className="text-xs px-3 py-1 rounded-full border bg-blue-600 text-white border-blue-600">Răspunde</button>
        )}
      </div>

      {action === "RESPOND" && (
        <div className="space-y-3">
          <textarea
            rows={3}
            value={response}
            onChange={e => setResponse(e.target.value)}
            placeholder="Răspunsul oficial..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="IN_PROGRESS">În curs</option>
            <option value="RESOLVED">Rezolvată</option>
            <option value="CLOSED">Închisă</option>
          </select>
        </div>
      )}

      {action === "REROUTE" && (
        <select
          value={routing}
          onChange={e => setRouting(e.target.value as "UAT_GENERAL" | "POLICE")}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="UAT_GENERAL">Administrație Sector 1</option>
          <option value="POLICE">Poliție Locală Sector 1</option>
        </select>
      )}

      {action === "STATUS" && (
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="OPEN">Deschisă</option>
          <option value="IN_PROGRESS">În curs</option>
          <option value="RESOLVED">Rezolvată</option>
          <option value="CLOSED">Închisă</option>
        </select>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        onClick={submit}
        disabled={saving}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Se salvează..." : "Salvează"}
      </button>
    </div>
  );
}

export default function UATSesizariPage() {
  const [sesizari, setSesizari] = useState<Sesizare[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Sesizare | null>(null);
  const [filter, setFilter] = useState("");
  const [routingFilter, setRoutingFilter] = useState<string>("");

  function load() {
    fetch("/api/sesizari")
      .then(r => r.json())
      .then(data => { setSesizari(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const filtered = sesizari.filter(s =>
    (!filter || s.title.toLowerCase().includes(filter.toLowerCase()) || s.submitter?.fullName.toLowerCase().includes(filter.toLowerCase())) &&
    (!routingFilter || s.routing === routingFilter)
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Sesizări cetățeni</h1>

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Caută..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={routingFilter}
          onChange={e => setRoutingFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Toate</option>
          <option value="UAT_GENERAL">Administrație S1</option>
          <option value="POLICE">Poliție Locală</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-gray-500">Se încarcă...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-500">Nu există sesizări.</p>
          ) : filtered.map(s => (
            <button
              key={s.id}
              onClick={() => setSelected(s)}
              className={`w-full text-left bg-white border rounded-xl p-4 transition-colors ${selected?.id === s.id ? "border-blue-500" : "border-gray-200 hover:border-blue-300"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate text-sm">{s.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.association?.name} · {s.category}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status]}`}>
                    {STATUS_LABELS[s.status]}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.routing === "POLICE" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>
                    {s.routing === "POLICE" ? "Poliție Locală" : "Administrație S1"}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-2">{s.submitter?.fullName} · {new Date(s.createdAt).toLocaleDateString("ro-RO")}</div>
            </button>
          ))}
        </div>

        {selected && (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="font-semibold text-gray-900 mb-1">{selected.title}</h2>
              <p className="text-xs text-gray-500 mb-3">{selected.association?.name} · {selected.association?.neighborhood}</p>
              <div className="flex gap-2 mb-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[selected.status]}`}>{STATUS_LABELS[selected.status]}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${selected.routing === "POLICE" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>
                  {selected.routing === "POLICE" ? "Poliție" : "Primărie"}
                </span>
              </div>
              <p className="text-xs text-gray-500">De: {selected.submitter?.fullName} ({selected.submitter?.email})</p>
            </div>

            <ActionPanel sesizare={selected} onDone={() => { load(); setSelected(null); }} />
          </div>
        )}
      </div>
    </div>
  );
}
