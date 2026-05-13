"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type RbacRole  = { id: string; name: string; accountType: string };
type Ownership = { id: string; unitNumber: string; associationName: string };

type UserRow = {
  id:          string;
  email:       string;
  fullName:    string;
  phone:       string | null;
  cnp:         string | null;
  status:      string;
  accountType: string;
  isActive:    boolean;
  createdAt:   string;
  lastLoginAt: string | null;
  roles:       RbacRole[];
  ownerships:  Ownership[];
};

const ACCOUNT_BADGE: Record<string, string> = {
  CIVIL:    "bg-blue-50 text-blue-700",
  OFFICIAL: "bg-purple-50 text-purple-700",
};
const STATUS_BADGE: Record<string, string> = {
  ACTIVE:        "bg-emerald-50 text-emerald-700",
  DEACTIVATED:   "bg-red-50 text-red-600",
  PENDING_MERGE: "bg-amber-50 text-amber-700",
};
const ROLE_COLORS: Record<string, string> = {
  CITIZEN:    "bg-gray-100 text-gray-600",
  OWNER:      "bg-cyan-50 text-cyan-700",
  OPERATOR:   "bg-uat-50 text-uat-700",
  SUPERADMIN: "bg-red-50 text-red-700",
};

export default function AdminUsersPage() {
  const [users,       setUsers]       = useState<UserRow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [q,           setQ]           = useState("");
  const [roleFilter,  setRoleFilter]  = useState("");
  const [typeFilter,  setTypeFilter]  = useState("");
  const [statusFilter,setStatusFilter]= useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q)           params.set("q", q);
    if (roleFilter)  params.set("role", roleFilter);
    if (typeFilter)  params.set("accountType", typeFilter);
    if (statusFilter)params.set("status", statusFilter);
    const res = await fetch(`/api/admin/users?${params}`);
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }, [q, roleFilter, typeFilter, statusFilter]);

  useEffect(() => {
    const id = setTimeout(load, 300);
    return () => clearTimeout(id);
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Management utilizatori</h1>
          <p className="text-sm text-slate-500 mt-0.5">Conturi civile și funcționari platformă</p>
        </div>
        <Link href="/admin/users/new-official"
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + Cont funcționar
        </Link>
      </div>

      {/* Filtre */}
      <div className="flex gap-3 flex-wrap">
        <input type="text" placeholder="Caută nume, email, CNP..." value={q}
          onChange={e => setQ(e.target.value)}
          className="input flex-1 min-w-48" />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input w-40">
          <option value="">Toate tipurile</option>
          <option value="CIVIL">Civil</option>
          <option value="OFFICIAL">Funcționar</option>
        </select>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input w-40">
          <option value="">Toate rolurile</option>
          <option value="CITIZEN">Cetățean</option>
          <option value="OWNER">Proprietar</option>
          <option value="OPERATOR">Operator</option>
          <option value="SUPERADMIN">Super Admin</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-40">
          <option value="">Toate statusurile</option>
          <option value="ACTIVE">Activ</option>
          <option value="DEACTIVATED">Dezactivat</option>
          <option value="PENDING_MERGE">Pending merge</option>
        </select>
      </div>

      {/* Tabel */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-400">Se încarcă...</div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">Niciun utilizator găsit.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-6 py-2 bg-slate-50 text-xs font-semibold text-slate-400 uppercase tracking-wide">
              <span>Utilizator</span>
              <span>Tip cont</span>
              <span>Roluri</span>
              <span>Status</span>
              <span />
            </div>

            {users.map(u => (
              <div key={u.id} className="px-6 py-4 hover:bg-slate-50/50 transition-colors">
                <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 items-center">
                  {/* Identitate */}
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{u.fullName}</p>
                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                    {u.ownerships.length > 0 && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {u.ownerships.length === 1
                          ? u.ownerships[0].associationName
                          : `${u.ownerships.length} proprietăți`}
                      </p>
                    )}
                  </div>

                  {/* Tip cont */}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${ACCOUNT_BADGE[u.accountType] ?? "bg-gray-100 text-gray-600"}`}>
                    {u.accountType === "CIVIL" ? "Civil" : "Funcționar"}
                  </span>

                  {/* Roluri RBAC */}
                  <div className="flex flex-wrap gap-1">
                    {u.roles.length === 0
                      ? <span className="text-xs text-slate-400 italic">Fără rol</span>
                      : u.roles.map(r => (
                          <span key={r.id} className={`text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_COLORS[r.name] ?? "bg-gray-100 text-gray-600"}`}>
                            {r.name}
                          </span>
                        ))
                    }
                  </div>

                  {/* Status */}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${STATUS_BADGE[u.status] ?? "bg-gray-100 text-gray-500"}`}>
                    {u.status === "ACTIVE" ? "Activ" : u.status === "DEACTIVATED" ? "Dezactivat" : "Pending merge"}
                  </span>

                  {/* Acțiuni */}
                  <Link href={`/admin/users/${u.id}`}
                    className="text-xs text-blue-600 hover:underline whitespace-nowrap font-medium">
                    Detalii →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!loading && <p className="text-xs text-slate-400">{users.length} utilizatori afișați (max 300)</p>}
    </div>
  );
}
