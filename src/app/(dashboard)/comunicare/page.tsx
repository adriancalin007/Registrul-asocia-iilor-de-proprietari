"use client";

import { useState, useEffect, useRef } from "react";
import FileUpload from "@/components/FileUpload";

type ThreadStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

type Message = {
  id: string;
  senderId: string;
  body: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  isFromUAT: boolean;
  createdAt: string;
  sender: { id: string; name: string | null; role: string };
};

type Thread = {
  id: string;
  subject: string;
  status: ThreadStatus;
  createdAt: string;
  updatedAt: string;
  initiator: { id: string; name: string | null };
  messages: Message[];
  _count: { messages: number };
};

type ThreadDetail = Thread & {
  association: { id: string; name: string; neighborhood: string | null };
};

const STATUS_LABEL: Record<ThreadStatus, string> = {
  OPEN: "Deschis",
  IN_PROGRESS: "În curs",
  RESOLVED: "Rezolvat",
  CLOSED: "Închis",
};

const STATUS_CLASS: Record<ThreadStatus, string> = {
  OPEN:        "bg-blue-50 text-blue-700 border-blue-200",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200",
  RESOLVED:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  CLOSED:      "bg-slate-100 text-slate-500 border-slate-200",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("ro-RO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ComunicarePage() {
  const [threads, setThreads]           = useState<Thread[]>([]);
  const [selected, setSelected]         = useState<ThreadDetail | null>(null);
  const [loading, setLoading]           = useState(true);
  const [showNew, setShowNew]           = useState(false);
  const [replyBody, setReplyBody]       = useState("");
  const [replyFile, setReplyFile]       = useState<{ url: string; name: string } | null>(null);
  const [sending, setSending]           = useState(false);
  const [newSubject, setNewSubject]     = useState("");
  const [newBody, setNewBody]           = useState("");
  const [newFile, setNewFile]           = useState<{ url: string; name: string } | null>(null);
  const [creating, setCreating]         = useState(false);
  const [createError, setCreateError]   = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadThreads() {
    const res = await fetch("/api/comunicare");
    if (res.ok) setThreads(await res.json());
    setLoading(false);
  }

  async function openThread(id: string) {
    const res = await fetch(`/api/comunicare/${id}`);
    if (res.ok) setSelected(await res.json());
  }

  useEffect(() => { loadThreads(); }, []);

  useEffect(() => {
    if (selected) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages.length]);

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !replyBody.trim()) return;
    setSending(true);
    const res = await fetch(`/api/comunicare/${selected.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: replyBody, attachmentUrl: replyFile?.url, attachmentName: replyFile?.name }),
    });
    if (res.ok) {
      setReplyBody(""); setReplyFile(null);
      await openThread(selected.id);
      await loadThreads();
    }
    setSending(false);
  }

  async function createThread(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    if (!newSubject.trim() || !newBody.trim()) { setCreateError("Subiectul și mesajul sunt obligatorii."); return; }
    setCreating(true);
    const res = await fetch("/api/comunicare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: newSubject, body: newBody, attachmentUrl: newFile?.url, attachmentName: newFile?.name }),
    });
    const data = await res.json();
    if (!res.ok) { setCreateError(data.error ?? "Eroare"); setCreating(false); return; }
    setShowNew(false); setNewSubject(""); setNewBody(""); setNewFile(null);
    await loadThreads();
    await openThread(data.id);
    setCreating(false);
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Comunicare cu autoritatea</h1>
          <p className="text-sm text-slate-500 mt-0.5">Solicitări și corespondență cu operatorii UAT Sector 1</p>
        </div>
        <button onClick={() => { setShowNew(v => !v); setSelected(null); }}
          className="btn-primary text-sm">
          {showNew ? "Anulează" : "+ Solicitare nouă"}
        </button>
      </div>

      {showNew && (
        <div className="card mb-6">
          <div className="card-header">
            <h2 className="font-semibold text-slate-900">Solicitare nouă</h2>
          </div>
          <form onSubmit={createThread} className="card-body space-y-4">
            <div>
              <label className="label">Subiect <span className="text-red-500">*</span></label>
              <input className="input" value={newSubject} onChange={e => setNewSubject(e.target.value)}
                placeholder="ex. Clarificare privind documentele de înregistrare" />
            </div>
            <div>
              <label className="label">Mesaj <span className="text-red-500">*</span></label>
              <textarea className="input resize-none" rows={4} value={newBody}
                onChange={e => setNewBody(e.target.value)}
                placeholder="Descrieți solicitarea în detaliu..." />
            </div>
            <div>
              <label className="label mb-1 block">Atașament <span className="text-xs text-slate-400">(opțional)</span></label>
              <FileUpload
                accept="image/*,application/pdf,.doc,.docx"
                hint="PDF, imagine sau document Word · max 20 MB"
                onUpload={(url, meta) => setNewFile({ url, name: meta.name })}
              />
              {newFile && (
                <div className="mt-2 flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 w-fit">
                  <span className="text-emerald-600">✓</span>
                  <span className="truncate max-w-[200px] text-slate-600">{newFile.name}</span>
                  <button type="button" onClick={() => setNewFile(null)} className="text-red-400 hover:text-red-600 ml-1">✕</button>
                </div>
              )}
            </div>
            {createError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{createError}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={creating} className="btn-primary text-sm">
                {creating ? "Se trimite..." : "Trimite solicitarea"}
              </button>
              <button type="button" onClick={() => setShowNew(false)} className="btn-secondary text-sm">Anulează</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-5 gap-4" style={{ minHeight: "60vh" }}>
        {/* Thread list */}
        <div className="col-span-2 space-y-2">
          {loading ? (
            <div className="card p-6 text-center text-sm text-slate-400">Se încarcă...</div>
          ) : threads.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-sm text-slate-500 font-medium">Nicio conversație încă</p>
              <p className="text-xs text-slate-400 mt-1">Creați prima solicitare folosind butonul de mai sus.</p>
            </div>
          ) : threads.map(t => (
            <button key={t.id} onClick={() => openThread(t.id)}
              className={`w-full text-left rounded-xl border p-3.5 transition-all ${selected?.id === t.id ? "border-uat-400 bg-uat-50/60" : "border-slate-200 bg-white hover:border-slate-300"}`}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-medium text-slate-900 truncate flex-1">{t.subject}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium flex-shrink-0 ${STATUS_CLASS[t.status]}`}>
                  {STATUS_LABEL[t.status]}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400 truncate">{t._count.messages} mesaj{t._count.messages !== 1 ? "e" : ""}</p>
                <p className="text-xs text-slate-400 flex-shrink-0">{fmt(t.updatedAt)}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Message view */}
        <div className="col-span-3">
          {!selected ? (
            <div className="card h-full flex items-center justify-center text-center p-8">
              <div>
                <svg className="w-10 h-10 text-slate-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
                <p className="text-sm text-slate-400">Selectați o conversație din lista din stânga</p>
              </div>
            </div>
          ) : (
            <div className="card flex flex-col" style={{ maxHeight: "75vh" }}>
              {/* Thread header */}
              <div className="card-header flex items-start justify-between gap-3 flex-shrink-0">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{selected.subject}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Inițiat de <span className="text-slate-600">{selected.initiator.name}</span> · {fmt(selected.createdAt)}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${STATUS_CLASS[selected.status]}`}>
                  {STATUS_LABEL[selected.status]}
                </span>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {selected.messages.map(m => (
                  <div key={m.id} className={`flex ${m.isFromUAT ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${m.isFromUAT
                      ? "bg-slate-100 text-slate-800 rounded-tl-sm"
                      : "bg-uat-600 text-white rounded-tr-sm"}`}>
                      <p className={`text-xs font-semibold mb-1 ${m.isFromUAT ? "text-slate-500" : "text-uat-100"}`}>
                        {m.isFromUAT ? "UAT Sector 1" : (m.sender.name ?? "Tu")}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                      {m.attachmentUrl && (
                        <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer"
                          className={`mt-2 flex items-center gap-1.5 text-xs underline ${m.isFromUAT ? "text-uat-600" : "text-uat-100"}`}>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                          </svg>
                          {m.attachmentName ?? "Atașament"}
                        </a>
                      )}
                      <p className={`text-xs mt-1.5 ${m.isFromUAT ? "text-slate-400" : "text-uat-200"}`}>{fmt(m.createdAt)}</p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Reply box */}
              {selected.status !== "CLOSED" ? (
                <form onSubmit={sendReply} className="border-t border-slate-100 p-3 space-y-2 flex-shrink-0">
                  <textarea
                    value={replyBody}
                    onChange={e => setReplyBody(e.target.value)}
                    placeholder="Scrieți un răspuns..."
                    rows={2}
                    className="input resize-none text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      {replyFile ? (
                        <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 w-fit">
                          <span className="text-emerald-600">✓</span>
                          <span className="truncate max-w-[160px] text-slate-600">{replyFile.name}</span>
                          <button type="button" onClick={() => setReplyFile(null)} className="text-red-400 hover:text-red-600 ml-1">✕</button>
                        </div>
                      ) : (
                        <FileUpload
                          accept="image/*,application/pdf,.doc,.docx"
                          hint="Atașați un fișier"
                          onUpload={(url, meta) => setReplyFile({ url, name: meta.name })}
                        />
                      )}
                    </div>
                    <button type="submit" disabled={sending || !replyBody.trim()} className="btn-primary text-sm flex-shrink-0">
                      {sending ? "..." : "Trimite"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="border-t border-slate-100 px-4 py-3 flex-shrink-0">
                  <p className="text-xs text-slate-400 text-center">Această conversație a fost închisă de operatorul UAT.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
