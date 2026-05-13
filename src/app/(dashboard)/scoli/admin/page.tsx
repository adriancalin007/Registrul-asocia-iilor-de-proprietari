"use client";
// src/app/(dashboard)/scoli/admin/page.tsx
import { useState, useEffect } from "react";

type Inrolare = {
  id: string;
  numeElev: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: string;
  user: { name: string | null; email: string };
  clasa: { an: number; litera: string; scoala: { id: string; name: string } };
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-600 border-red-200",
};
const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Aprobat",
  REJECTED: "Respins",
};

export default function ScoliAdminPage() {
  const [items, setItems] = useState<Inrolare[]>([]);
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  function load(s: string) {
    setLoading(true);
    fetch(`/api/scoli/admin/inrolare?status=${s}`)
      .then((r) => r.json())
      .then((data) => { setItems(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(statusFilter); }, [statusFilter]);

  async function decide(id: string, action: "APPROVE" | "REJECT") {
    setSaving(id);
    try {
      await fetch("/api/scoli/admin/inrolare", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inrolareId: id, action }),
      });
      load(statusFilter);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <p className="text-xs font-semibold text-purple-600 uppercase tracking-widest mb-1">Administrare</p>
        <h1 className="text-2xl font-bold text-slate-900">Înrolări școli</h1>
        <p className="text-sm text-slate-500 mt-1">Aprobă sau respinge cererile de înrolare</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(["PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs font-medium px-4 py-1.5 rounded-lg transition-all ${
              statusFilter === s ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Se încarcă...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          Nu există cereri cu statusul „{STATUS_LABEL[statusFilter]}".
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-900 text-sm">{item.numeElev}</p>
                  <span className={`text-xs border px-2 py-0.5 rounded-full ${STATUS_BADGE[item.status]}`}>
                    {STATUS_LABEL[item.status]}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {item.clasa.scoala.name} · Clasa {item.clasa.an}{item.clasa.litera}
                </p>
                <p className="text-xs text-slate-400">
                  Părinte: {item.user.name ?? item.user.email} ·{" "}
                  {new Date(item.requestedAt).toLocaleDateString("ro-RO")}
                </p>
              </div>

              {item.status === "PENDING" && (
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => decide(item.id, "APPROVE")}
                    disabled={saving === item.id}
                    className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    Aprobă
                  </button>
                  <button
                    onClick={() => decide(item.id, "REJECT")}
                    disabled={saving === item.id}
                    className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                  >
                    Respinge
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
