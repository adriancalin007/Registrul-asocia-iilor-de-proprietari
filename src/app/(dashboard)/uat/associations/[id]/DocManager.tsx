"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import FileUpload from "@/components/FileUpload";

type DocKey = "statute" | "courtRegistration" | "presidentMandate" | "presidentId" | "administratorAuthorization" | string;

interface DocEntry { key: DocKey; label: string; required: boolean; }

const STANDARD_DOCS: DocEntry[] = [
  { key: "statute",                    label: "Statut / Act constitutiv",           required: true },
  { key: "courtRegistration",          label: "Certificat de înregistrare tribunal", required: true },
  { key: "presidentMandate",           label: "Mandat președinte CA",                required: true },
  { key: "presidentId",                label: "Copie CI Președinte CA",              required: true },
  { key: "administratorAuthorization", label: "Dovadă autorizare administrator",     required: true },
];

interface Props {
  associationId: string;
  initialDocs: Record<string, string>;
}

export default function DocManager({ associationId, initialDocs }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [docs, setDocs] = useState<Record<string, string>>(initialDocs ?? {});
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  async function saveAll(updated: Record<string, string>) {
    startTransition(async () => {
      setMessage(null);
      const res = await fetch(`/api/uat/associations/${associationId}/docs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requiredDocuments: updated }),
      });
      const json = await res.json();
      if (!res.ok) { setMessage({ type: "error", text: json.error ?? "Eroare" }); return; }
      setMessage({ type: "success", text: "Documente actualizate." });
      setEditing(null);
      router.refresh();
    });
  }

  function startEdit(key: string) {
    setEditing(key);
    setEditValue(extractUrl(docs[key] as unknown));
  }

  function saveEdit() {
    const updated = { ...docs, [editing!]: editValue };
    setDocs(updated);
    saveAll(updated);
  }

  function deleteDoc(key: string) {
    const updated = { ...docs };
    delete updated[key];
    setDocs(updated);
    saveAll(updated);
  }

  function addCustomDoc() {
    if (!newKey.trim() || !newLabel.trim()) return;
    const key = newKey.trim().replace(/\s+/g, "_");
    const updated = { ...docs, [key]: newUrl.trim() };
    setDocs(updated);
    setNewKey(""); setNewLabel(""); setNewUrl(""); setShowAdd(false);
    saveAll(updated);
  }

  function extractUrl(raw: unknown): string {
    if (!raw) return "";
    if (typeof raw === "object") return (raw as Record<string, string>).url ?? "";
    return (raw as string);
  }

  const allKeys = [
    ...STANDARD_DOCS.map(d => d.key),
    ...Object.keys(docs).filter(k => !STANDARD_DOCS.some(d => d.key === k)),
  ];

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Documente asociație</h2>
        <button type="button" onClick={() => setShowAdd(s => !s)}
          className="text-xs text-uat-600 font-semibold hover:text-uat-700">
          + Document nou
        </button>
      </div>

      {message && (
        <div className={`mx-6 mt-4 rounded-xl px-4 py-2.5 text-sm font-medium border ${
          message.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"
        }`}>{message.text}</div>
      )}

      {showAdd && (
        <div className="mx-6 mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-800">Document personalizat</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text">Etichetă</label>
              <input className="input text-sm" value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="ex. Proces verbal AGA" />
            </div>
            <div>
              <label className="label-text">Cheie internă (fără spații)</label>
              <input className="input text-sm" value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="ex. procesVerbalAGA" />
            </div>
            <div className="col-span-2">
              <FileUpload
                hint="PDF, imagine, Word, Excel · max 20 MB"
                onUpload={(url) => setNewUrl(url)}
              />
              <input className="input text-sm mt-2" value={newUrl}
                onChange={e => setNewUrl(e.target.value)} placeholder="sau URL extern..." />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={addCustomDoc} disabled={isPending || !newKey.trim() || !newLabel.trim()} className="btn-primary text-sm">
              Adaugă
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="btn-ghost text-sm">Anulează</button>
          </div>
        </div>
      )}

      <div className="divide-y divide-slate-100 mt-2">
        {allKeys.map(key => {
          const stdDoc = STANDARD_DOCS.find(d => d.key === key);
          const label = stdDoc?.label ?? key;
          const url = extractUrl(docs[key] as unknown);
          const isEditing = editing === key;

          return (
            <div key={key} className="px-6 py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${
                    url ? "bg-uat-50 text-uat-600" : "bg-amber-50 text-amber-500"
                  }`}>📄</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">{label}</p>
                      {stdDoc?.required && !url && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Lipsă</span>
                      )}
                    </div>
                    {url && !isEditing && (
                      <a href={url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-uat-600 hover:underline truncate block max-w-xs mt-0.5">
                        {url}
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {!isEditing && (
                    <>
                      {url && (
                        <a href={url} target="_blank" rel="noopener noreferrer"
                          className="btn-secondary text-xs py-1 px-2.5">Deschide</a>
                      )}
                      <button type="button" onClick={() => startEdit(key)}
                        className="btn-secondary text-xs py-1 px-2.5">
                        {url ? "Înlocuiește" : "Adaugă URL"}
                      </button>
                      {!stdDoc?.required && url && (
                        <button type="button" onClick={() => deleteDoc(key)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium px-1">✕</button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="mt-3 space-y-2">
                  <FileUpload
                    hint="PDF, imagine, Word, Excel · max 20 MB"
                    onUpload={(url) => { setEditValue(url); }}
                  />
                  <div className="flex gap-2 items-center">
                    <input className="input text-sm flex-1" value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      placeholder="sau inserează URL extern..." />
                    <button type="button" onClick={saveEdit} disabled={isPending || !editValue.trim()}
                      className="btn-primary text-sm px-3 flex-shrink-0">Salvează</button>
                    <button type="button" onClick={() => setEditing(null)} className="btn-ghost text-sm flex-shrink-0">✕</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
