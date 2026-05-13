"use client";
// src/app/(dashboard)/dashboard/ServiciiInline.tsx
//
// Section that renders all 4 inline civic-service panels.
// Each panel calls its own /api/servicii/… endpoint — no CNP in client.

import { useState } from "react";
import ServicePanel from "./ServicePanel";
import type { JustDosar } from "@/app/api/servicii/just/dosare/route";
import type { AnofmInfo } from "@/app/api/servicii/anofm/statut/route";

type ApiResponse = { success: boolean; data: unknown; fallbackUrl: string; userMessage?: string | null };

async function postService(path: string, body: Record<string, unknown> = {}): Promise<ApiResponse> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 429) {
    return {
      success: false,
      data: null,
      fallbackUrl: "",
      userMessage: "Prea multe cereri. Încearcă din nou peste un minut.",
    };
  }
  return res.json();
}

/* ─── CNAS success renderer ──────────────────────────────────────────────── */
// Always a fallback — kept separate for clarity
function CnasSuccess() {
  return <p className="text-sm text-slate-700">Statut CNAS disponibil pe portalul oficial.</p>;
}

/* ─── Just success renderer ──────────────────────────────────────────────── */
function JustSuccess({ data }: { data: unknown }) {
  const dosare = data as JustDosar[];
  if (!dosare.length) {
    return <p className="text-sm text-slate-500">Nu au fost găsite dosare pe numele tău.</p>;
  }
  return (
    <div className="space-y-2">
      {dosare.slice(0, 5).map((d, i) => (
        <div key={i} className="rounded-lg bg-slate-50 border border-slate-100 p-3">
          <p className="text-xs font-semibold text-slate-800">{d.numarDosar}</p>
          <p className="text-xs text-slate-500 truncate">{d.obiect}</p>
          <p className="text-xs text-slate-400">{d.institutie} · {d.stadiu}</p>
          {d.dataUltimeiActiuni && (
            <p className="text-xs text-slate-400 mt-0.5">{d.dataUltimeiActiuni}</p>
          )}
        </div>
      ))}
      {dosare.length > 5 && (
        <p className="text-xs text-slate-400">… și alte {dosare.length - 5} dosare</p>
      )}
    </div>
  );
}

/* ─── Just search form ───────────────────────────────────────────────────── */
function JustPanel() {
  const [customName, setCustomName] = useState("");

  return (
    <ServicePanel
      title="portal.just.ro — Dosare"
      description="Caută dosarele judecătorești pe numele tău sau un alt nume"
      icon="⚖️"
      actionLabel="Caută dosarele mele"
      accentClass="bg-indigo-50"
      onFetch={() =>
        postService("/api/servicii/just/dosare", customName.trim() ? { numeParte: customName.trim() } : {})
      }
      renderSuccess={(data) => <JustSuccess data={data} />}
      beforeAction={
        <input
          type="text"
          value={customName}
          onChange={e => setCustomName(e.target.value)}
          placeholder="Alt nume (opțional)"
          className="w-full text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-uat-300"
        />
      }
    />
  );
}

/* ─── AEP success renderer ───────────────────────────────────────────────── */
function AepSuccess() {
  return <p className="text-sm text-slate-700">Secție de votare disponibilă pe Registrul Electoral.</p>;
}

/* ─── ANOFM success renderer ─────────────────────────────────────────────── */
function AnofmSuccess({ data }: { data: unknown }) {
  const info = data as AnofmInfo;
  return (
    <div className="space-y-2">
      {info.links.map((link, i) => (
        <a
          key={i}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-uat-600 hover:underline"
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
          {link.label}
        </a>
      ))}
    </div>
  );
}

/* ─── Main export ─────────────────────────────────────────────────────────── */
export default function ServiciiInline() {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">Servicii publice — acces direct</h2>
        <p className="text-xs text-slate-400 mt-0.5">Rezultatele se afișează în pagină · CNP-ul rămâne pe server</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* CNAS */}
        <ServicePanel
          title="CNAS — Asigurare sănătate"
          description="Verifică statutul de asigurat în sistemul de sănătate"
          icon="🏥"
          actionLabel="Verifică asigurarea"
          accentClass="bg-green-50"
          onFetch={() => postService("/api/servicii/cnas/verificare")}
          renderSuccess={() => <CnasSuccess />}
        />

        {/* Just */}
        <JustPanel />

        {/* AEP */}
        <ServicePanel
          title="Registrul Electoral — Secție votare"
          description="Află secția de votare alocată pentru adresa ta"
          icon="🗳️"
          actionLabel="Caută secția mea"
          accentClass="bg-amber-50"
          onFetch={() => postService("/api/servicii/aep/sectie-votare")}
          renderSuccess={() => <AepSuccess />}
        />

        {/* ANOFM */}
        <ServicePanel
          title="ANOFM — Servicii șomaj"
          description="Verifică stagiul de cotizare și ofertele de muncă"
          icon="💼"
          actionLabel="Accesează serviciile"
          accentClass="bg-orange-50"
          onFetch={() => postService("/api/servicii/anofm/statut")}
          renderSuccess={(data) => <AnofmSuccess data={data} />}
        />
      </div>
    </section>
  );
}
