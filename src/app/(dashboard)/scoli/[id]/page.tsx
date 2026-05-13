"use client";
// src/app/(dashboard)/scoli/[id]/page.tsx
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type OrarClasa = {
  id: string; ziSaptamana: number; ora: number; materie: string; profesor: string | null; sala: string | null;
};
type Clasa = {
  id: string; an: number; litera: string; diriginte: string; nrElevi: number;
  orar: OrarClasa[];
  myEnrollment: { status: string; numeElev: string } | null;
};
type Scoala = {
  id: string; name: string; address: string; type: string;
  director: string | null; contactEmail: string | null; contactPhone: string | null; website: string | null;
  clase: Clasa[];
};

const ZILE = ["", "Luni", "Marți", "Miercuri", "Joi", "Vineri"];
const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-600 border-red-200",
};
const STATUS_LABEL: Record<string, string> = {
  PENDING: "În așteptare",
  APPROVED: "Aprobat",
  REJECTED: "Respins",
};

export default function ScoalaPage() {
  const { id } = useParams<{ id: string }>();
  const [scoala, setScoala] = useState<Scoala | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null); // clasaId
  const [numeElev, setNumeElev] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch(`/api/scoli/${id}`)
      .then((r) => r.json())
      .then((data) => { setScoala(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  async function handleEnroll(clasaId: string) {
    if (!numeElev.trim()) { setMsg("Introduceți numele elevului."); return; }
    setSaving(true); setMsg("");
    try {
      const res = await fetch(`/api/scoli/${id}/inrolare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clasaId, numeElev }),
      });
      if (res.ok) {
        setMsg("Cerere trimisă! Administratorul școlii o va aproba.");
        setEnrolling(null); setNumeElev("");
        // Refresh
        const updated = await fetch(`/api/scoli/${id}`).then((r) => r.json());
        setScoala(updated);
      } else {
        const e = await res.json();
        setMsg(e.error ?? "Eroare la înrolare.");
      }
    } finally { setSaving(false); }
  }

  if (loading) return <div className="text-center py-20 text-slate-400 text-sm">Se încarcă...</div>;
  if (!scoala) return <div className="text-center py-20 text-red-500 text-sm">Școala negăsită.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/scoli" className="text-xs text-uat-600 hover:underline flex items-center gap-1">
        ← Înapoi la școli
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-2xl flex-shrink-0">🎓</div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900">{scoala.name}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{scoala.address}</p>
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500">
              {scoala.director && <span>Director: {scoala.director}</span>}
              {scoala.contactPhone && <a href={`tel:${scoala.contactPhone}`} className="hover:text-uat-600">{scoala.contactPhone}</a>}
              {scoala.contactEmail && <a href={`mailto:${scoala.contactEmail}`} className="hover:text-uat-600">{scoala.contactEmail}</a>}
              {scoala.website && <a href={scoala.website} target="_blank" rel="noopener noreferrer" className="text-uat-600 hover:underline">Website →</a>}
            </div>
          </div>
        </div>
      </div>

      {msg && (
        <div className={`text-sm px-4 py-3 rounded-xl border ${msg.includes("Eroare") || msg.includes("Introduceți") ? "bg-red-50 text-red-600 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
          {msg}
        </div>
      )}

      {/* Classes */}
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-3">Clase</h2>
        <div className="space-y-3">
          {scoala.clase.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center font-bold text-slate-700">
                    {c.an}{c.litera}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 text-sm">Clasa {c.an}{c.litera}</p>
                    <p className="text-xs text-slate-400">Diriginte: {c.diriginte} · {c.nrElevi} elevi</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {c.myEnrollment ? (
                    <span className={`text-xs border px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[c.myEnrollment.status]}`}>
                      {STATUS_LABEL[c.myEnrollment.status]} — {c.myEnrollment.numeElev}
                    </span>
                  ) : (
                    <button
                      onClick={() => { setEnrolling(enrolling === c.id ? null : c.id); setMsg(""); setNumeElev(""); }}
                      className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Înrolează
                    </button>
                  )}
                  <Link
                    href={`/scoli/${scoala.id}/clasa/${c.id}`}
                    className="text-xs text-slate-400 hover:text-uat-600 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Orar →
                  </Link>
                </div>
              </div>

              {enrolling === c.id && !c.myEnrollment && (
                <div className="border-t border-slate-100 p-4 bg-purple-50/50">
                  <p className="text-xs font-medium text-slate-700 mb-2">Prenumele elevului:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={numeElev}
                      onChange={(e) => setNumeElev(e.target.value)}
                      placeholder="ex: Maria"
                      className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-purple-400"
                    />
                    <button
                      onClick={() => handleEnroll(c.id)}
                      disabled={saving}
                      className="text-sm bg-purple-600 text-white px-4 py-1.5 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                      Trimite
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
