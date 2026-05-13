"use client";
// src/app/(dashboard)/documente/page.tsx

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type Doc = {
  id: string;
  title: string;
  category: string;
  folder: string | null;
  description: string | null;
  fileUrl: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "EXPIRED";
  isPublic: boolean;
  documentDate: string | null;
  expiresAt: string | null;
  createdAt: string;
  version: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  DRAFT:     "bg-slate-100 text-slate-500",
  PUBLISHED: "bg-emerald-50 text-emerald-700",
  ARCHIVED:  "bg-amber-50 text-amber-600",
  EXPIRED:   "bg-red-50 text-red-600",
};
const STATUS_LABEL: Record<string, string> = {
  DRAFT:     "Ciornă",
  PUBLISHED: "Publicat",
  ARCHIVED:  "Arhivat",
  EXPIRED:   "Expirat",
};

const STATUSES = ["PUBLISHED", "DRAFT", "ARCHIVED"] as const;

// ─── Helper ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" });
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v8.25m19.5 0v1.5A2.25 2.25 0 0119.5 18H4.5a2.25 2.25 0 01-2.25-2.25V6.75m0 0h19.5"/>
    </svg>
  );
}

function DocIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [docs, setDocs]           = useState<Doc[]>([]);
  const [folders, setFolders]     = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading]     = useState(true);

  // Filters
  const [activeFolder,   setActiveFolder]   = useState<string | null>(null); // null = all
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [activeStatus,   setActiveStatus]   = useState<string>("");
  const [dateFrom,       setDateFrom]       = useState<string>("");
  const [dateTo,         setDateTo]         = useState<string>("");

  // New folder modal
  const [showNewFolder,  setShowNewFolder]  = useState(false);
  const [newFolderName,  setNewFolderName]  = useState("");

  // Load metadata once
  useEffect(() => {
    Promise.all([
      fetch("/api/documente?list=folders").then(r => r.ok ? r.json() : []),
      fetch("/api/documente?list=categories").then(r => r.ok ? r.json() : []),
    ]).then(([f, c]) => { setFolders(f); setCategories(c); });
  }, []);

  const loadDocs = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeFolder !== null) params.set("folder", activeFolder ?? "");
    if (activeCategory)        params.set("category", activeCategory);
    if (activeStatus)          params.set("status", activeStatus);
    if (dateFrom)              params.set("dateFrom", dateFrom);
    if (dateTo)                params.set("dateTo", dateTo);
    fetch(`/api/documente?${params}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { setDocs(d); setLoading(false); });
  }, [activeFolder, activeCategory, activeStatus, dateFrom, dateTo]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  function createFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    if (!folders.includes(name)) setFolders(prev => [...prev, name].sort());
    setActiveFolder(name);
    setNewFolderName("");
    setShowNewFolder(false);
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Documente</h1>
        <Link href="/documente/nou" className="btn-primary">+ Document nou</Link>
      </div>

      <div className="flex gap-5">
        {/* ── Folder sidebar ── */}
        <aside className="w-52 flex-shrink-0 space-y-1">
          <button
            onClick={() => setActiveFolder(null)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeFolder === null ? "bg-uat-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <DocIcon className="w-4 h-4 flex-shrink-0" />
            Toate documentele
          </button>
          <button
            onClick={() => setActiveFolder("")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeFolder === "" ? "bg-uat-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <DocIcon className="w-4 h-4 flex-shrink-0 opacity-40" />
            Neclasificate
          </button>

          {folders.length > 0 && (
            <div className="border-t border-slate-100 pt-2 mt-1">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 px-3 mb-1">Foldere</p>
              {folders.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFolder(f)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                    activeFolder === f ? "bg-uat-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <FolderIcon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{f}</span>
                </button>
              ))}
            </div>
          )}

          {showNewFolder ? (
            <div className="pt-1 space-y-1">
              <input
                autoFocus
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") setShowNewFolder(false); }}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-uat-500"
                placeholder="Nume folder..."
              />
              <div className="flex gap-1">
                <button onClick={createFolder} className="flex-1 btn-primary text-xs py-1">Creează</button>
                <button onClick={() => setShowNewFolder(false)} className="flex-1 btn-secondary text-xs py-1">Renunță</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewFolder(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <span className="text-lg leading-none">+</span>
              Folder nou
            </button>
          )}
        </aside>

        {/* ── Main content ── */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Filters bar */}
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 space-y-3">
            {/* Category chips */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveCategory("")}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  !activeCategory ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Toate categoriile
              </button>
              {categories.map(c => (
                <button
                  key={c}
                  onClick={() => setActiveCategory(activeCategory === c ? "" : c)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    activeCategory === c ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Status + date row */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-1.5">
                <button
                  onClick={() => setActiveStatus("")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    !activeStatus ? "bg-uat-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Toate stările
                </button>
                {STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={() => setActiveStatus(activeStatus === s ? "" : s)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      activeStatus === s ? "bg-uat-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-slate-400">Data doc.</span>
                <input
                  type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-uat-500"
                />
                <span className="text-xs text-slate-400">—</span>
                <input
                  type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-uat-500"
                />
                {(dateFrom || dateTo) && (
                  <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
                )}
              </div>
            </div>
          </div>

          {/* Document list */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {loading ? "Se încarcă..." : `${docs.length} document${docs.length !== 1 ? "e" : ""}`}
                {activeFolder && activeFolder !== "" ? <span className="ml-2 font-medium text-slate-700">/ {activeFolder}</span> : null}
              </p>
            </div>

            {loading ? (
              <div className="py-16 text-center text-slate-400 text-sm">Se încarcă...</div>
            ) : docs.length === 0 ? (
              <div className="py-16 text-center">
                <DocIcon className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Niciun document găsit</p>
                <Link href="/documente/nou" className="btn-primary mt-4 inline-flex">Adaugă document</Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {docs.map(doc => (
                  <div key={doc.id} className="px-5 py-4 flex items-start gap-4 hover:bg-slate-50 group">
                    <div className="w-9 h-9 rounded-lg bg-uat-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <DocIcon className="w-4.5 h-4.5 text-uat-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-semibold text-slate-900">{doc.title}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[doc.status]}`}>
                          {STATUS_LABEL[doc.status]}
                        </span>
                        {doc.isPublic && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">Public</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                        <span className="bg-slate-100 px-2 py-0.5 rounded-full text-slate-600">{doc.category}</span>
                        {doc.folder && (
                          <span className="flex items-center gap-1">
                            <FolderIcon className="w-3 h-3" />
                            {doc.folder}
                          </span>
                        )}
                        {doc.documentDate && <span>Data: {fmtDate(doc.documentDate)}</span>}
                        {doc.expiresAt && (
                          <span className={new Date(doc.expiresAt) < new Date() ? "text-red-500" : ""}>
                            Expiră: {fmtDate(doc.expiresAt)}
                          </span>
                        )}
                        <span className="text-slate-300">v{doc.version}</span>
                      </div>
                      {doc.description && (
                        <p className="text-sm text-slate-500 mt-1 truncate">{doc.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {doc.fileUrl && (
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                          className="btn-secondary text-xs py-1.5 px-3">
                          Descarcă
                        </a>
                      )}
                      <Link href={`/documente/${doc.id}`} className="btn-ghost text-xs py-1.5 px-3">
                        Editează
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
