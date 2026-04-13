// src/app/(dashboard)/adeverinte/nou/page.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const TIPURI = [
  {
    valoare: "PLATI_LA_ZI",
    eticheta: "Adeverință plăți la zi",
    descriere: "Confirmă că nu aveți restanțe la plata cotelor de întreținere",
  },
  {
    valoare: "PROPRIETATE",
    eticheta: "Adeverință de proprietate",
    descriere: "Confirmă dreptul de proprietate/folosință asupra apartamentului",
  },
  {
    valoare: "FOND_RULMENT",
    eticheta: "Adeverință fond de rulment",
    descriere: "Situația fondului de rulment aferent apartamentului",
  },
  {
    valoare: "GENERALA",
    eticheta: "Adeverință generală",
    descriere: "Adeverință cu date generale despre apartament și asociație",
  },
];

export default function AdeverintaNouaPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tipSelectat, setTipSelectat] = useState("");
  const [eroare, setEroare] = useState("");
  const [trimis, setTrimis] = useState(false);

  async function handleSubmit() {
    if (!tipSelectat) {
      setEroare("Selectați tipul adeverinței");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/adeverinte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tip: tipSelectat }),
      });

      const data = await res.json();

      if (!res.ok) {
        setEroare(data.eroare ?? "A apărut o eroare.");
        return;
      }

      setTrimis(true);
      setTimeout(() => router.push("/adeverinte"), 2000);
    });
  }

  if (trimis) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Solicitare trimisă!</h2>
        <p className="text-slate-500 mt-2">
          Administratorul va procesa solicitarea în cel mai scurt timp. Veți fi notificat când adeverința este gata.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <Link href="/adeverinte" className="hover:text-slate-700">Adeverințe</Link>
          <span>›</span>
          <span>Solicitare nouă</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Solicită adeverință</h1>
        <p className="text-slate-500 mt-1">
          Selectați tipul adeverinței de care aveți nevoie. Solicitarea va fi procesată de administratorul asociației.
        </p>
      </div>

      <div className="space-y-3">
        {TIPURI.map((tip) => (
          <button
            key={tip.valoare}
            type="button"
            onClick={() => { setTipSelectat(tip.valoare); setEroare(""); }}
            className={`w-full text-left card transition-all hover:shadow-md ${
              tipSelectat === tip.valoare
                ? "border-uat-400 ring-2 ring-uat-400 ring-offset-1"
                : "hover:border-uat-200"
            }`}
          >
            <div className="card-body flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                tipSelectat === tip.valoare ? "bg-uat-600" : "bg-slate-100"
              }`}>
                <svg className={`w-5 h-5 ${tipSelectat === tip.valoare ? "text-white" : "text-slate-400"}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">{tip.eticheta}</p>
                <p className="text-sm text-slate-500 mt-0.5">{tip.descriere}</p>
              </div>
              {tipSelectat === tip.valoare && (
                <svg className="w-5 h-5 text-uat-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>

      {eroare && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-red-700 text-sm">{eroare}</p>
        </div>
      )}

      <div className="flex justify-between">
        <Link href="/adeverinte" className="btn-secondary">Anulează</Link>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || !tipSelectat}
          className="btn-primary px-8"
        >
          {isPending ? "Se trimite..." : "Trimite solicitarea"}
        </button>
      </div>
    </div>
  );
}
