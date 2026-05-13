"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Sesizare = {
  id: string;
  title: string;
  category: string;
  routing: "UAT_GENERAL" | "POLICE";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  createdAt: string;
  submitter?: { fullName: string };
  responder?: { fullName: string } | null;
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

const ROUTING_LABELS: Record<string, string> = {
  UAT_GENERAL: "Administrație S1",
  POLICE: "Poliție Locală",
};

export default function SesizariPage() {
  const [sesizari, setSesizari] = useState<Sesizare[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");

  useEffect(() => {
    fetch("/api/sesizari")
      .then(r => r.json())
      .then(data => { setSesizari(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = sesizari.filter(s =>
    !filter ||
    s.title.toLowerCase().includes(filter.toLowerCase()) ||
    s.category.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sesizări</h1>
        <Link
          href="/sesizari/nou"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          + Sesizare nouă
        </Link>
      </div>

      <input
        type="text"
        placeholder="Caută sesizări..."
        value={filter}
        onChange={e => setFilter(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {loading ? (
        <p className="text-gray-500 text-sm">Se încarcă...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 text-sm">Nu există sesizări.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => (
            <Link
              key={s.id}
              href={`/sesizari/${s.id}`}
              className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-400 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{s.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{s.category}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status]}`}>
                    {STATUS_LABELS[s.status]}
                  </span>
                  <span className="text-xs text-gray-500">{ROUTING_LABELS[s.routing]}</span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                <span>De: {s.submitter?.fullName ?? "—"}</span>
                <span>{new Date(s.createdAt).toLocaleDateString("ro-RO")}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
