"use client";

import { useState, useEffect, useRef } from "react";
import FileUpload from "@/components/FileUpload";

type ThreadStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

type Message = {
  id: string;
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
  association: { id: string; name: string; neighborhood: string | null };
  initiator: { id: string; name: string | null; email: string };
  messages: Message[];
  _count: { messages: number };
};

const STATUS_LABEL: Record<ThreadStatus, string> = {
  OPEN:        "Deschis",
  IN_PROGRESS: "În curs",
  RESOLVED:    "Rezolvat",
  CLOSED:      "Închis",
};

const STATUS_CLASS: Record<ThreadStatus, string> = {
  OPEN:        "bg-blue-50 text-blue-700 border-blue-200",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200",
  RESOLVED:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  CLOSED:      "bg-slate-100 text-slate-500 border-slate-200",
};

const FILTERS: { label: string; value: ThreadStatus | "ALL" }[] = [
  { label: "Toate", value: "ALL" },
  { label: "Deschise", value: "OPEN" },
  { label: "În curs", value: "IN_PROGRESS" },
  { label: "Rezolvate", value: "RESOLVED" },
  { label: "Închise", value: "CLOSED" },
];

function fmt(iso: string) {
  return new Date(iso).toLocaleString("ro-RO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function UATComunicarePage() {
  const [threads, setThreads]     = useState<Thread[]>([]);
  const [filter, setFilter]       = useState<ThreadStatus | "ALL">("ALL");
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState<Thread | null>(null);
  const [loading, setLoading]     = useState(true);
  const [replyBody, setReplyBody] = useState("");
  const [replyFile, setReplyFile] = useState<{ url: string; name: string } | null>(null);
  const [sending, setSending]     = useState(false);
  const [statusWorking, setStatusWorking] = useState(false);
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

  const visible = threads.filter(t => {
    if (filter !== "ALL" && t.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        t.subject.toLowerCase().includes(q) ||
        t.association.name.toLowerCase().includes(q) ||
        (t.initiator.name ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

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

  async function updateStatus(status: ThreadStatus) {
    if (!selected) return;
    setStatusWorking(true);
    const res = await fetch(`/api/comunicare/${selected.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      await openThread(selected.id);
      await loadThreads();
    }
    setStatusWorking(false);
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Comunicare — solicitări asociații</h1>
        <p className="text-sm text-slate-500 mt-0.5">Gestionați corespondența cu asociațiile din portal</p>
      </div>

      <div className="grid grid-cols-5 gap-4" style={{ minHeight: "70vh" }}>
        {/* Left panel */}
        <div className="col-span-2 space-y-3">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input className="input pl-9 text-sm" placeholder="Caută după subiect, asociație..." value={search}
              onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Status filters */}
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map(f => (
              <button key={f.value} onClick={() => setFilter(f.value)}
                className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${filter === f.value ? "bg-uat-600 text-white border-uat-600" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}`}>
                {f.label}
                {f.value !== "ALL" && (
                  <span className="ml-1 opacity-70">{threads.filter(t => t.status === f.value).length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Thread list */}
          {loading ? (
            <div className="card p-6 text-center text-sm text-slate-400">Se încarcă...</div>
          ) : visible.length === 0 ? (
            <div className="card p-6 text-center text-sm text-slate-400">
              {search || filter !== "ALL" ? "Nicio conversație pentru filtrele selectate" : "Nicio conversație în sistem"}
            </div>
          ) : visible.map(t => (
            <button key={t.id} onClick={() => openThread(t.id)}
              className={`w-full text-left rounded-xl border p-3.5 transition-all ${selected?.id === t.id ? "border-uat-400 bg-uat-50/60" : "border-slate-200 bg-white hover:border-slate-300"}`}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-medium text-slate-900 truncate flex-1">{t.subject}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium flex-shrink-0 ${STATUS_CLASS[t.status]}`}>
                  {STATUS_LABEL[t.status]}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">{t.association.name}{t.association.neighborhood ? ` — ${t.association.neighborhood}` : ""}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-slate-400 truncate">{t.initiator.name}</p>
                <p className="text-xs text-slate-400 flex-shrink-0">{fmt(t.updatedAt)}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Right panel — thread detail */}
        <div className="col-span-3">
          {!selected ? (
            <div className="card h-full flex items-center justify-center text-center p-8">
              <div>
                <svg className="w-10 h-10 text-slate-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
                <p className="text-sm text-slate-400">Selectați o conversație din stânga</p>
              </div>
            </div>
          ) : (
            <div className="card flex flex-col" style={{ maxHeight: "75vh" }}>
              {/* Header */}
              <div className="card-header flex-shrink-0">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{selected.subject}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      <span className="text-slate-600 font-medium">{selected.association.name}</span>
                      {selected.association.neighborhood && <span> — {selected.association.neighborhood}</span>}
                      {" · "}{selected.initiator.name} · {fmt(selected.createdAt)}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${STATUS_CLASS[selected.status]}`}>
                    {STATUS_LABEL[selected.status]}
                  </span>
                </div>

                {/* Status controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-400">Schimbă starea:</span>
                  {(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as ThreadStatus[])
                    .filter(s => s !== selected.status)
                    .map(s => (
                      <button key={s} onClick={() => updateStatus(s)} disabled={statusWorking}
                        className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-colors hover:opacity-80 disabled:opacity-40 ${STATUS_CLASS[s]}`}>
                        → {STATUS_LABEL[s]}
                      </button>
                    ))}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {selected.messages.map(m => (
                  <div key={m.id} className={`flex ${m.isFromUAT ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${m.isFromUAT
                      ? "bg-uat-600 text-white rounded-tr-sm"
                      : "bg-slate-100 text-slate-800 rounded-tl-sm"}`}>
                      <p className={`text-xs font-semibold mb-1 ${m.isFromUAT ? "text-uat-100" : "text-slate-500"}`}>
                        {m.isFromUAT ? (m.sender.name ?? "Operator UAT") : (m.sender.name ?? "Asociație")}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                      {m.attachmentUrl && (
                        <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer"
                          className={`mt-2 flex items-center gap-1.5 text-xs underline ${m.isFromUAT ? "text-uat-100" : "text-uat-600"}`}>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                          </svg>
                          {m.attachmentName ?? "Atașament"}
                        </a>
                      )}
                      <p className={`text-xs mt-1.5 ${m.isFromUAT ? "text-uat-200" : "text-slate-400"}`}>{fmt(m.createdAt)}</p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Reply */}
              {selected.status !== "CLOSED" ? (
                <form onSubmit={sendReply} className="border-t border-slate-100 p-3 space-y-2 flex-shrink-0">
                  <textarea
                    value={replyBody}
                    onChange={e => setReplyBody(e.target.value)}
                    placeholder="Scrieți un răspuns oficial..."
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
                          hint="Atașați un document oficial"
                          onUpload={(url, meta) => setReplyFile({ url, name: meta.name })}
                        />
                      )}
                    </div>
                    <button type="submit" disabled={sending || !replyBody.trim()} className="btn-primary text-sm flex-shrink-0">
                      {sending ? "..." : "Răspunde"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="border-t border-slate-100 px-4 py-3 flex-shrink-0">
                  <p className="text-xs text-slate-400 text-center">Conversație închisă · redeschideți dacă este necesar</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
