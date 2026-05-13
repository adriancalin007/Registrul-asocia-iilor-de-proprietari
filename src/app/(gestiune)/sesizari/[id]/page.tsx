"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Sesizare = {
  id: string;
  title: string;
  description: string;
  category: string;
  routing: "UAT_GENERAL" | "POLICE";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  response: string | null;
  createdAt: string;
  respondedAt: string | null;
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

export default function SesizareDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [sesizare, setSesizare] = useState<Sesizare | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/sesizari/${id}`)
      .then(r => r.json())
      .then(data => { setSesizare(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6 text-sm text-gray-500">Se încarcă...</div>;
  if (!sesizare) return <div className="p-6 text-sm text-red-500">Sesizarea nu a fost găsită.</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{sesizare.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{sesizare.category} · {sesizare.routing === "POLICE" ? "Poliție locală" : "Primărie"}</p>
        </div>
        <span className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLORS[sesizare.status]}`}>
          {STATUS_LABELS[sesizare.status]}
        </span>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Descriere</p>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{sesizare.description}</p>
        </div>
        <div className="flex gap-6 text-sm text-gray-500 pt-2 border-t border-gray-100">
          <span>Depusă de: <strong className="text-gray-700">{sesizare.submitter?.fullName ?? "—"}</strong></span>
          <span>Data: <strong className="text-gray-700">{new Date(sesizare.createdAt).toLocaleDateString("ro-RO")}</strong></span>
        </div>
      </div>

      {sesizare.response && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-2">Răspuns oficial</p>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{sesizare.response}</p>
          {sesizare.responder && (
            <p className="text-xs text-gray-500 mt-3">
              Răspuns de {sesizare.responder.fullName} · {sesizare.respondedAt ? new Date(sesizare.respondedAt).toLocaleDateString("ro-RO") : ""}
            </p>
          )}
        </div>
      )}

      {!sesizare.response && sesizare.status === "OPEN" && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
          Sesizarea este în așteptarea unui răspuns din partea operatorului.
        </div>
      )}
    </div>
  );
}
