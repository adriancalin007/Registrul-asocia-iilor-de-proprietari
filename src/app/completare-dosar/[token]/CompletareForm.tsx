// src/app/completare-dosar/[token]/CompletareForm.tsx
"use client";

import { useState, useTransition } from "react";

interface Document {
  id: string;
  label: string;
  url: string;
}

interface Props {
  token: string;
  rundaId: string;
}

export default function CompletareForm({ token, rundaId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [trimis, setTrimis] = useState(false);
  const [observatii, setObservatii] = useState("");
  const [eroare, setEroare] = useState("");
  const [documente, setDocumente] = useState<Document[]>([
    { id: "1", label: "", url: "" },
  ]);

  function adaugaDocument() {
    setDocumente(prev => [...prev, { id: Date.now().toString(), label: "", url: "" }]);
  }

  function stergeDocument(id: string) {
    if (documente.length > 1) {
      setDocumente(prev => prev.filter(d => d.id !== id));
    }
  }

  function updateDocument(id: string, camp: "label" | "url", val: string) {
    setDocumente(prev => prev.map(d => d.id === id ? { ...d, [camp]: val } : d));
    setEroare("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const documenteValide = documente.filter(d => d.label.trim() && d.url.trim());
    if (documenteValide.length === 0) {
      setEroare("Adăugați cel puțin un document cu denumire și link");
      return;
    }

    startTransition(async () => {
      const res = await fetch(`/api/completare-dosar/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documenteNoi: documenteValide, observatii }),
      });
      const data = await res.json();
      if (!res.ok) { setEroare(data.eroare ?? "Eroare."); return; }
      setTrimis(true);
    });
  }

  if (trimis) return (
    <div className="bg-white rounded-2xl p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">Documente trimise!</h2>
      <p className="text-slate-500">
        Operatorul UAT va verifica documentele depuse și vă va contacta cu decizia finală.
      </p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 space-y-5">
          <h2 className="font-semibold text-slate-900">Documente noi</h2>
          <p className="text-sm text-slate-500">
            Încărcați documentele pe Google Drive și introduceți linkul de acces.
            Asigurați-vă că linkul permite vizualizarea.
          </p>

          <div className="space-y-4">
            {documente.map((doc, idx) => (
              <div key={doc.id} className="border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase">Document {idx + 1}</span>
                  {documente.length > 1 && (
                    <button type="button" onClick={() => stergeDocument(doc.id)}
                      className="text-xs text-red-400 hover:text-red-600">✕ Șterge</button>
                  )}
                </div>
                <div>
                  <label className="label text-xs">Denumire document <span className="text-red-500">*</span></label>
                  <input type="text" value={doc.label}
                    onChange={e => updateDocument(doc.id, "label", e.target.value)}
                    placeholder="ex: Copie CI Ion Popescu actualizată"
                    className="input text-sm" />
                </div>
                <div>
                  <label className="label text-xs">Link document <span className="text-red-500">*</span></label>
                  <input type="url" value={doc.url}
                    onChange={e => updateDocument(doc.id, "url", e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="input text-sm" />
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={adaugaDocument}
            className="text-sm text-uat-600 hover:text-uat-800 font-medium flex items-center gap-1">
            <span className="text-lg">+</span> Adaugă alt document
          </button>

          <div>
            <label className="label">Observații (opțional)</label>
            <textarea value={observatii} onChange={e => setObservatii(e.target.value)}
              placeholder="Orice informații suplimentare pentru operatorul UAT..."
              rows={3} className="input resize-none text-sm" />
          </div>

          {eroare && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-red-700 text-sm">⚠ {eroare}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button type="submit" disabled={isPending} className="btn-primary px-8">
            {isPending ? "Se trimite..." : "Trimite documentele"}
          </button>
        </div>
      </div>
    </form>
  );
}
