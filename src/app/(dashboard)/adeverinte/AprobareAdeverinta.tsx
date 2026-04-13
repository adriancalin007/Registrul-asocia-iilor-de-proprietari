// src/app/(dashboard)/adeverinte/AprobareAdeverinta.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  adeverintaId: string;
  operatorId: string;
  asociatieId: string;
  tip: string;
  proprietar: string;
  apartament: string;
}

const TIP_ETICHETA: Record<string, string> = {
  PLATI_LA_ZI: "Plăți la zi",
  PROPRIETATE: "Proprietate",
  FOND_RULMENT: "Fond de rulment",
  GENERALA: "Generală",
};

export default function AprobareAdeverinta({ adeverintaId, operatorId, asociatieId, tip, proprietar, apartament }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [observatii, setObservatii] = useState("");
  const [arataMotivatia, setArataMotivatia] = useState(false);
  const [mesaj, setMesaj] = useState<{ tip: "succes" | "eroare"; text: string } | null>(null);

  async function handleActiune(actiune: "APROBA" | "RESPINGE" | "EMITE") {
    if (actiune === "RESPINGE" && !observatii.trim()) {
      setArataMotivatia(true);
      return;
    }

    startTransition(async () => {
      const res = await fetch(`/api/adeverinte/${adeverintaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actiune, observatii }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMesaj({ tip: "eroare", text: data.eroare ?? "A apărut o eroare." });
        return;
      }

      setMesaj({
        tip: "succes",
        text: actiune === "APROBA" ? "Adeverința a fost aprobată."
          : actiune === "EMITE" ? "Adeverința a fost emisă și PDF-ul generat."
          : "Solicitarea a fost respinsă.",
      });

      setTimeout(() => router.refresh(), 1500);
    });
  }

  if (mesaj) {
    return (
      <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
        mesaj.tip === "succes" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
      }`}>
        {mesaj.text}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {arataMotivatia && (
        <div>
          <label className="label text-sm">Motiv respingere <span className="text-red-500">*</span></label>
          <textarea
            value={observatii}
            onChange={(e) => setObservatii(e.target.value)}
            placeholder="Descrieți motivul respingerii..."
            rows={2}
            className="input resize-none text-sm"
          />
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => handleActiune("EMITE")}
          disabled={isPending}
          className="btn-primary text-sm"
        >
          ✓ Aprobă și emite PDF
        </button>
        <button
          type="button"
          onClick={() => handleActiune("APROBA")}
          disabled={isPending}
          className="btn-secondary text-sm"
        >
          Aprobă (fără PDF acum)
        </button>
        <button
          type="button"
          onClick={() => arataMotivatia ? handleActiune("RESPINGE") : setArataMotivatia(true)}
          disabled={isPending}
          className="btn-danger text-sm"
        >
          {arataMotivatia ? "Confirmă respingerea" : "Respinge"}
        </button>
        {arataMotivatia && (
          <button type="button" onClick={() => { setArataMotivatia(false); setObservatii(""); }} className="btn-ghost text-sm">
            Anulează
          </button>
        )}
      </div>
    </div>
  );
}
