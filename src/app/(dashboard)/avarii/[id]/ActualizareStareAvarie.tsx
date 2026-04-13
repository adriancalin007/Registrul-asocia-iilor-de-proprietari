// src/app/(dashboard)/avarii/[id]/ActualizareStareAvarie.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  avarieId: string;
  stareActuala: string;
}

const TRANZITII: Record<string, { stare: string; label: string; culoare: string }[]> = {
  DESCHISA: [
    { stare: "IN_LUCRU", label: "Marchează în lucru", culoare: "btn-primary" },
    { stare: "REZOLVATA", label: "Marchează rezolvată", culoare: "btn-secondary" },
  ],
  IN_LUCRU: [
    { stare: "REZOLVATA", label: "Marchează rezolvată", culoare: "btn-primary" },
  ],
  REZOLVATA: [
    { stare: "INCHISA", label: "Închide dosarul", culoare: "btn-secondary" },
    { stare: "IN_LUCRU", label: "Redeschide — mai necesită intervenție", culoare: "btn-ghost" },
  ],
};

export default function ActualizareStareAvarie({ avarieId, stareActuala }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [observatii, setObservatii] = useState("");
  const [pvUrl, setPvUrl] = useState("");
  const [mesaj, setMesaj] = useState("");

  const tranzitiiPosibile = TRANZITII[stareActuala] ?? [];

  async function actualizeaza(stareNoua: string) {
    startTransition(async () => {
      const res = await fetch(`/api/avarii/${avarieId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stareNoua, observatii, pvUrl }),
      });
      const data = await res.json();
      if (!res.ok) { setMesaj(data.eroare ?? "Eroare."); return; }
      router.refresh();
    });
  }

  if (tranzitiiPosibile.length === 0) return null;

  return (
    <div className="card border-uat-200">
      <div className="card-body space-y-4">
        <h2 className="font-semibold text-slate-900">Actualizare stare</h2>

        <div>
          <label className="label text-sm">Observații (opțional)</label>
          <textarea value={observatii} onChange={e => setObservatii(e.target.value)}
            placeholder="Detalii despre acțiunile întreprinse..."
            rows={2} className="input resize-none text-sm" />
        </div>

        {stareActuala === "REZOLVATA" && (
          <div>
            <label className="label text-sm">Link PV Recepție (opțional)</label>
            <input type="url" value={pvUrl} onChange={e => setPvUrl(e.target.value)}
              placeholder="https://drive.google.com/..." className="input text-sm" />
          </div>
        )}

        {mesaj && <p className="text-red-600 text-sm">⚠ {mesaj}</p>}

        <div className="flex gap-3 flex-wrap">
          {tranzitiiPosibile.map(t => (
            <button key={t.stare} type="button" onClick={() => actualizeaza(t.stare)}
              disabled={isPending} className={t.culoare}>
              {isPending ? "Se actualizează..." : t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
