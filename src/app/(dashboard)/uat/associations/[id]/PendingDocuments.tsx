"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Doc {
  id: string;
  title: string;
  category: string;
  folder: string | null;
  fileUrl: string;
  documentDate: string | null;
  createdAt: string;
}

interface Props {
  associationId: string;
  initialDocs: Doc[];
}

export default function PendingDocuments({ associationId, initialDocs }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [docs, setDocs] = useState<Doc[]>(initialDocs);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (docs.length === 0) return null;

  async function review(docId: string, action: "APPROVE" | "REJECT", notes?: string) {
    startTransition(async () => {
      setMessage(null);
      const res = await fetch(`/api/uat/documente/${docId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes }),
      });
      const json = await res.json();
      if (!res.ok) { setMessage({ type: "error", text: json.error ?? "Eroare" }); return; }
      setDocs(d => d.filter(x => x.id !== docId));
      setRejectId(null);
      setRejectNote("");
      setMessage({ type: "success", text: action === "APPROVE" ? "Document aprobat și publicat." : "Document respins." });
      router.refresh();
    });
  }

  return (
    <div className="card border-amber-200">
      <div className="card-header bg-amber-50 border-b border-amber-100">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
          <h2 className="font-semibold text-slate-900">Documente în așteptare ({docs.length})</h2>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">Documente încărcate de manager care necesită aprobare.</p>
      </div>

      {message && (
        <div className={`mx-6 mt-4 rounded-xl px-4 py-2.5 text-sm font-medium border ${
          message.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"
        }`}>{message.text}</div>
      )}

      <div className="divide-y divide-slate-100 mt-2">
        {docs.map(doc => (
          <div key={doc.id} className="px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-slate-900">{doc.title}</p>
                  <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{doc.category}</span>
                  {doc.folder && <span className="text-xs text-slate-400">📁 {doc.folder}</span>}
                </div>
                {doc.documentDate && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Data doc.: {new Date(doc.documentDate).toLocaleDateString("ro-RO")}
                  </p>
                )}
                <p className="text-xs text-slate-400">
                  Încărcat: {new Date(doc.createdAt).toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="btn-secondary text-xs py-1 px-2.5">
                  Deschide
                </a>
                {rejectId !== doc.id ? (
                  <>
                    <button
                      type="button"
                      onClick={() => review(doc.id, "APPROVE")}
                      disabled={isPending}
                      className="text-xs font-semibold px-3 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
                    >
                      Aprobă
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRejectId(doc.id); setRejectNote(""); }}
                      className="text-xs font-semibold px-3 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      Respinge
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            {rejectId === doc.id && (
              <div className="mt-3 space-y-2">
                <textarea
                  value={rejectNote}
                  onChange={e => setRejectNote(e.target.value)}
                  rows={2}
                  placeholder="Motivul respingerii (opțional)..."
                  className="input text-sm resize-none w-full"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => review(doc.id, "REJECT", rejectNote || undefined)}
                    disabled={isPending}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40"
                  >
                    Confirmă respingere
                  </button>
                  <button type="button" onClick={() => setRejectId(null)} className="btn-ghost text-xs">
                    Anulează
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
