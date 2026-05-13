"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type RoleRow    = { id: string; name: string; accountType: string; assignedAt: string; permissions: string[] };
type Ownership  = { id: string; unitNumber: string; floor: number | null; area: number | null; buildingName: string; associationName: string; associationId: string | null; isActive: boolean };
type AuditEntry = { id: string; action: string; actorId: string | null; metadata: Record<string, unknown>; createdAt: string };
type AvailRole  = { id: string; name: string; accountType: string };

type UserDetail = {
  id:              string;
  email:           string;
  fullName:        string;
  firstName:       string;
  lastName:        string;
  phone:           string | null;
  cnp:             string | null;
  status:          string;
  accountType:     string;
  isActive:        boolean;
  createdAt:       string;
  lastLoginAt:     string | null;
  mustChangePassword: boolean;
  civicType:       string | null;
  domiciliuSector: number | null;
  createdByAdminId: string | null;
  roles:           RoleRow[];
  ownerships:      Ownership[];
  auditLogs:       AuditEntry[];
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE:        "Activ",
  DEACTIVATED:   "Dezactivat",
  PENDING_MERGE: "Pending merge",
};
const STATUS_BADGE: Record<string, string> = {
  ACTIVE:        "bg-emerald-50 text-emerald-700",
  DEACTIVATED:   "bg-red-50 text-red-600",
  PENDING_MERGE: "bg-amber-50 text-amber-700",
};

type Tab = "date" | "roluri" | "proprietati" | "audit";

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [user,        setUser]       = useState<UserDetail | null>(null);
  const [loading,     setLoading]    = useState(true);
  const [tab,         setTab]        = useState<Tab>("date");
  const [availRoles,  setAvailRoles] = useState<AvailRole[]>([]);
  const [assigning,   setAssigning]  = useState(false);
  const [assignRoleId, setAssignRoleId] = useState("");
  const [roleError,   setRoleError]  = useState("");

  // Status change modal
  const [statusModal,   setStatusModal]  = useState(false);
  const [newStatus,     setNewStatus]    = useState("");
  const [statusReason,  setStatusReason] = useState("");
  const [statusSaving,  setStatusSaving] = useState(false);
  const [statusError,   setStatusError]  = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/users/${id}`);
    if (res.ok) setUser(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/admin/roles")
      .then(r => r.json())
      .then(setAvailRoles);
  }, []);

  const handleAssignRole = async () => {
    if (!assignRoleId) return;
    setRoleError("");
    setAssigning(true);
    const res = await fetch(`/api/admin/users/${id}/roles`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ roleId: assignRoleId }),
    });
    const data = await res.json();
    setAssigning(false);
    if (!res.ok) { setRoleError(data.error ?? "Eroare."); return; }
    setAssignRoleId("");
    load();
  };

  const handleRevokeRole = async (roleId: string) => {
    if (!confirm("Revocați acest rol?")) return;
    const res = await fetch(`/api/admin/users/${id}/roles`, {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ roleId }),
    });
    if (res.ok) load();
  };

  const handleStatusChange = async () => {
    if (!newStatus) return;
    setStatusSaving(true);
    setStatusError("");
    const res = await fetch(`/api/admin/users/${id}/status`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ status: newStatus, reason: statusReason || undefined }),
    });
    const data = await res.json();
    setStatusSaving(false);
    if (!res.ok) { setStatusError(data.error ?? "Eroare."); return; }
    setStatusModal(false);
    setStatusReason("");
    load();
  };

  if (loading) return <div className="py-16 text-center text-sm text-slate-400">Se încarcă...</div>;
  if (!user)   return <div className="py-16 text-center text-sm text-red-500">Utilizatorul nu a fost găsit.</div>;

  const unassignedRoles = availRoles.filter(r => !user.roles.some(ur => ur.id === r.id));

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-600 text-sm">← Înapoi</button>
          </div>
          <h1 className="text-xl font-bold text-slate-900">{user.fullName}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{user.email}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_BADGE[user.status] ?? "bg-gray-100 text-gray-500"}`}>
            {STATUS_LABEL[user.status] ?? user.status}
          </span>
          <button onClick={() => { setNewStatus(""); setStatusError(""); setStatusModal(true); }}
            className="text-xs border border-slate-200 hover:border-slate-300 text-slate-600 px-3 py-1.5 rounded-lg font-medium transition-colors">
            Schimbă status
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-6">
        {([["date", "Date personale"], ["roluri", "Roluri"], ["proprietati", "Proprietăți"], ["audit", "Audit"]] as [Tab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`pb-2.5 text-sm font-medium border-b-2 transition-colors ${tab === key ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Date personale */}
      {tab === "date" && (
        <div className="card p-6 space-y-4">
          <Row label="ID" value={user.id} mono />
          <Row label="Email" value={user.email} />
          <Row label="Telefon" value={user.phone ?? "—"} />
          <Row label="CNP" value={user.cnp ?? "—"} mono />
          <Row label="Tip cont" value={user.accountType === "CIVIL" ? "Civil" : "Funcționar"} />
          <Row label="Tip civic" value={user.civicType ?? "—"} />
          <Row label="Domiciliu sector" value={user.domiciliuSector?.toString() ?? "—"} />
          <Row label="Activ" value={user.isActive ? "Da" : "Nu"} />
          <Row label="Trebuie să schimbe parola" value={user.mustChangePassword ? "Da" : "Nu"} />
          <Row label="Creat la" value={new Date(user.createdAt).toLocaleString("ro-RO")} />
          <Row label="Ultima autentificare" value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("ro-RO") : "—"} />
          {user.createdByAdminId && (
            <Row label="Creat de admin" value={
              <Link href={`/admin/users/${user.createdByAdminId}`} className="text-blue-600 hover:underline text-xs">
                {user.createdByAdminId}
              </Link>
            } />
          )}
        </div>
      )}

      {/* Tab: Roluri */}
      {tab === "roluri" && (
        <div className="space-y-4">
          <div className="card divide-y divide-slate-100">
            {user.roles.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">Niciun rol asignat.</div>
            ) : user.roles.map(r => (
              <div key={r.id} className="px-5 py-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900 text-sm">{r.name}</p>
                  <p className="text-xs text-slate-400">{r.accountType} — asignat {new Date(r.assignedAt).toLocaleDateString("ro-RO")}</p>
                  {r.permissions.length > 0 && (
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {r.permissions.slice(0, 5).join(", ")}{r.permissions.length > 5 ? ` +${r.permissions.length - 5}` : ""}
                    </p>
                  )}
                </div>
                <button onClick={() => handleRevokeRole(r.id)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium whitespace-nowrap">
                  Revocare
                </button>
              </div>
            ))}
          </div>

          {/* Asignare rol nou */}
          {unassignedRoles.length > 0 && (
            <div className="card p-4 flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">Asignează rol</label>
                <select value={assignRoleId} onChange={e => setAssignRoleId(e.target.value)} className="input w-full text-sm">
                  <option value="">— Selectați —</option>
                  {unassignedRoles.map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.accountType})</option>
                  ))}
                </select>
              </div>
              <button onClick={handleAssignRole} disabled={assigning || !assignRoleId}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                {assigning ? "..." : "Asignează"}
              </button>
            </div>
          )}
          {roleError && <p className="text-sm text-red-600">{roleError}</p>}
        </div>
      )}

      {/* Tab: Proprietăți */}
      {tab === "proprietati" && (
        <div className="card divide-y divide-slate-100">
          {user.ownerships.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">Nicio proprietate înregistrată.</div>
          ) : user.ownerships.map(o => (
            <div key={o.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900 text-sm">Ap. {o.unitNumber} — {o.buildingName}</p>
                  {o.associationId ? (
                    <Link href={`/uat/associations/${o.associationId}`} className="text-xs text-blue-600 hover:underline">
                      {o.associationName}
                    </Link>
                  ) : (
                    <p className="text-xs text-slate-400">{o.associationName}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">
                    {o.floor !== null ? `Etaj ${o.floor}` : ""}
                    {o.area ? ` · ${o.area} m²` : ""}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${o.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {o.isActive ? "Activ" : "Inactiv"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Audit */}
      {tab === "audit" && (
        <div className="card divide-y divide-slate-100">
          {user.auditLogs.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">Nicio înregistrare în audit.</div>
          ) : user.auditLogs.map(l => (
            <div key={l.id} className="px-5 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{l.action}</p>
                  {Object.keys(l.metadata).length > 0 && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {Object.entries(l.metadata).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                    </p>
                  )}
                </div>
                <p className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                  {new Date(l.createdAt).toLocaleString("ro-RO")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal schimbare status */}
      {statusModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Schimbare status</h2>
            <p className="text-sm text-slate-600">Status curent: <strong>{STATUS_LABEL[user.status]}</strong></p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nou status</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="input w-full">
                <option value="">— Selectați —</option>
                {["ACTIVE", "DEACTIVATED", "PENDING_MERGE"].filter(s => s !== user.status).map(s => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Motiv (opțional)</label>
              <textarea value={statusReason} onChange={e => setStatusReason(e.target.value)}
                rows={2} className="input w-full resize-none" placeholder="Motivul schimbării de status..." />
            </div>
            {statusError && <p className="text-sm text-red-600">{statusError}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={handleStatusChange} disabled={statusSaving || !newStatus}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                {statusSaving ? "Se salvează..." : "Confirmă"}
              </button>
              <button onClick={() => setStatusModal(false)}
                className="text-sm text-slate-600 hover:text-slate-900 px-3 py-2">
                Anulare
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex gap-4 text-sm">
      <span className="w-44 shrink-0 text-slate-500">{label}</span>
      <span className={`text-slate-900 break-all ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
