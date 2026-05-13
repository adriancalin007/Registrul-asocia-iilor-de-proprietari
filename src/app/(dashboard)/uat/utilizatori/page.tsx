"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

type UserMandate = {
  role: string;
  associationId: string;
  associationName: string;
  mandateId: string;
};

type UserRecord = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  mustChangePassword: boolean;
  derivedRole: string | null;
  mandates: UserMandate[];
  hasUatAccount: boolean;
  hasSuperAdminAccount: boolean;
};

const ROLE_LABEL: Record<string, string> = {
  OWNER:           "Proprietar",
  MANAGER:         "Administrator",
  BOARD_PRESIDENT: "Președinte CA",
  AUDITOR:         "Cenzor",
  SUPPLIER:        "Furnizor",
  UAT_OPERATOR:    "Operator UAT",
  POLICE_OPERATOR: "Operator Poliție",
  SUPER_ADMIN:     "Super Admin",
};

const ROLE_BADGE: Record<string, string> = {
  OWNER:           "bg-gray-100 text-gray-700",
  MANAGER:         "bg-blue-50 text-blue-700",
  BOARD_PRESIDENT: "bg-purple-50 text-purple-700",
  AUDITOR:         "bg-amber-50 text-amber-700",
  SUPPLIER:        "bg-orange-50 text-orange-700",
  UAT_OPERATOR:    "bg-uat-50 text-uat-700",
  POLICE_OPERATOR: "bg-indigo-50 text-indigo-700",
  SUPER_ADMIN:     "bg-red-50 text-red-700",
};

const OPERATOR_VISIBLE_ROLES = ["OWNER", "MANAGER", "BOARD_PRESIDENT", "AUDITOR", "SUPPLIER"];
const ALL_ROLES = Object.keys(ROLE_LABEL);

// ─── Access panel (invite / set temp password) ───────────────────────────────

function AccessPanel({ userId }: { userId: string }) {
  const [mode, setMode] = useState<"idle" | "password">("idle");
  const [tempPw, setTempPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function sendInvite() {
    setBusy(true); setErr(null); setMsg(null);
    const res = await fetch(`/api/uat/users/${userId}/invite`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(data.error); return; }
    if (data.emailSent) { setMsg("Email de activare trimis."); }
    else { setInviteUrl(data.inviteUrl); setMsg("Email neconfigurat — copiați linkul:"); }
  }

  async function setPassword() {
    if (tempPw.length < 8) { setErr("Minim 8 caractere."); return; }
    setBusy(true); setErr(null);
    const res = await fetch(`/api/uat/users/${userId}/set-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: tempPw }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(data.error); return; }
    setMode("idle"); setTempPw(""); setMsg("Parolă temporară setată.");
  }

  return (
    <div className="space-y-2">
      {msg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-800 space-y-1">
          <p>{msg}</p>
          {inviteUrl && (
            <div className="flex gap-1.5 items-center">
              <input readOnly value={inviteUrl}
                className="flex-1 text-xs bg-white border border-emerald-200 rounded px-2 py-1 text-slate-700 min-w-0" />
              <button onClick={() => navigator.clipboard.writeText(inviteUrl)}
                className="text-xs text-uat-600 font-semibold hover:underline whitespace-nowrap">
                Copiază
              </button>
            </div>
          )}
          <button onClick={() => { setMsg(null); setInviteUrl(null); }}
            className="text-xs text-slate-400 hover:text-slate-600">Închide</button>
        </div>
      )}

      {!msg && mode === "idle" && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={sendInvite} disabled={busy}
            className="text-xs border border-uat-200 text-uat-700 px-3 py-1.5 rounded-lg hover:bg-uat-50 transition-colors disabled:opacity-50">
            {busy ? "..." : "Trimite invitație"}
          </button>
          <button onClick={() => setMode("password")}
            className="text-xs border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
            Parolă temporară
          </button>
        </div>
      )}

      {mode === "password" && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
          <p className="text-xs text-slate-500">Utilizatorul va fi obligat să o schimbe la prima autentificare.</p>
          <div className="flex gap-2">
            <input type="password" value={tempPw} onChange={e => setTempPw(e.target.value)}
              placeholder="Minim 8 caractere"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={setPassword} disabled={busy}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-50">
              {busy ? "..." : "Setează"}
            </button>
            <button onClick={() => { setMode("idle"); setTempPw(""); setErr(null); }}
              className="text-xs text-slate-500 hover:text-slate-700 px-2">
              Anulează
            </button>
          </div>
          {err && <p className="text-xs text-red-600">{err}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  user,
  sessionRole,
  onUpdate,
}: {
  user: UserRecord;
  sessionRole: string | undefined;
  onUpdate: (updated: Partial<UserRecord>) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [opType, setOpType] = useState<"GENERAL" | "POLICE">("GENERAL");

  async function patch(action: string, extra?: object) {
    setBusy(action); setErr(null); setNotice(null);
    const res = await fetch(`/api/uat/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) { setErr(data.error ?? "Eroare"); return; }

    if (action === "toggle_active")      onUpdate({ isActive: data.isActive });
    if (action === "set_civic_type")     { onUpdate({ derivedRole: data.civicType === "PROPRIETAR" ? "OWNER" : "OWNER" }); setNotice("Modificarea se aplică la proxima autentificare."); }
    if (action === "promote_uat")        { onUpdate({ hasUatAccount: true, derivedRole: opType === "POLICE" ? "POLICE_OPERATOR" : "UAT_OPERATOR" }); setNotice("Modificarea se aplică la proxima autentificare a utilizatorului."); }
    if (action === "revoke_uat")         { onUpdate({ hasUatAccount: false, derivedRole: user.mandates.length ? user.mandates[0].role : "OWNER" }); setNotice("Modificarea se aplică la proxima autentificare a utilizatorului."); }
    if (action === "promote_super_admin") { onUpdate({ hasSuperAdminAccount: true, derivedRole: "SUPER_ADMIN" }); setNotice("Modificarea se aplică la proxima autentificare a utilizatorului."); }
    if (action === "revoke_super_admin") { onUpdate({ hasSuperAdminAccount: false, derivedRole: null }); setNotice("Modificarea se aplică la proxima autentificare a utilizatorului."); }
  }

  const isSuperSession = sessionRole === "SUPER_ADMIN";
  const isOperatorSession = sessionRole === "UAT_OPERATOR";

  return (
    <div className="space-y-5">
      {/* Identity */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-900 text-base">{user.fullName}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
            {user.phone && <p className="text-xs text-gray-400">{user.phone}</p>}
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
              {user.isActive ? "Activ" : "Dezactivat"}
            </span>
            {user.mustChangePassword && (
              <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
                Trebuie să schimbe parola
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs text-gray-500">Rol curent:</span>
          {user.derivedRole ? (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[user.derivedRole] ?? "bg-gray-100 text-gray-600"}`}>
              {ROLE_LABEL[user.derivedRole] ?? user.derivedRole}
            </span>
          ) : (
            <span className="text-xs text-gray-400 italic">Fără rol</span>
          )}
        </div>

        {/* Mandates */}
        {user.mandates.length > 0 && (
          <div className="space-y-1 pt-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Mandate active</p>
            {user.mandates.map(m => (
              <div key={m.mandateId} className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[m.role] ?? "bg-gray-100 text-gray-600"}`}>
                  {ROLE_LABEL[m.role] ?? m.role}
                </span>
                <Link href={`/uat/associations/${m.associationId}`}
                  className="text-xs text-blue-600 hover:underline truncate max-w-48">
                  {m.associationName}
                </Link>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400">
          Înregistrat: {new Date(user.createdAt).toLocaleDateString("ro-RO")}
          {user.lastLoginAt && (
            <> · Ultimul login: {new Date(user.lastLoginAt).toLocaleString("ro-RO")}</>
          )}
          {!user.lastLoginAt && " · Nu s-a autentificat niciodată"}
        </p>
      </div>

      {/* Role management */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <p className="text-sm font-medium text-gray-700">Gestionare rol</p>

        {err    && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
        {notice && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{notice}</p>}

        {/* Toggle active */}
        <button
          onClick={() => patch("toggle_active")}
          disabled={busy === "toggle_active"}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
            user.isActive
              ? "border-red-100 text-red-600 hover:bg-red-50"
              : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          }`}
        >
          {busy === "toggle_active" ? "..." : user.isActive ? "Dezactivează cont" : "Reactivează cont"}
        </button>

        {/* Operator: CITIZEN ↔ OWNER toggle (civicType) */}
        {isOperatorSession && !user.hasUatAccount && !user.hasSuperAdminAccount && (
          <div className="space-y-1.5 pt-1 border-t border-gray-100">
            <p className="text-xs text-gray-500 font-medium">Tip cetățean</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => patch("set_civic_type", { civicType: "PROPRIETAR" })}
                disabled={busy === "set_civic_type" || user.derivedRole === "OWNER"}
                className="text-xs border border-cyan-200 text-cyan-700 px-3 py-1.5 rounded-lg hover:bg-cyan-50 transition-colors disabled:opacity-40"
              >
                {busy === "set_civic_type" ? "..." : "Marchează proprietar"}
              </button>
              <button
                onClick={() => patch("set_civic_type", { civicType: "CETATEAN_S1" })}
                disabled={busy === "set_civic_type" || user.derivedRole !== "OWNER"}
                className="text-xs border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-40"
              >
                Revertit cetățean simplu
              </button>
            </div>
            <p className="text-xs text-gray-400">Statut proprietar necesită confirmare ulterioară DGITL.</p>
          </div>
        )}

        {/* Super Admin: promote/revoke UAT */}
        {isSuperSession && !user.hasUatAccount && (
          <div className="space-y-1.5">
            <p className="text-xs text-gray-500">Promovează ca operator UAT:</p>
            <div className="flex gap-2 flex-wrap items-center">
              <select
                value={opType}
                onChange={e => setOpType(e.target.value as "GENERAL" | "POLICE")}
                className="text-xs border border-gray-300 rounded-lg px-2 py-1.5"
              >
                <option value="GENERAL">Operator General</option>
                <option value="POLICE">Operator Poliție Locală</option>
              </select>
              <button
                onClick={() => patch("promote_uat", { operatorType: opType })}
                disabled={busy === "promote_uat"}
                className="text-xs border border-uat-200 text-uat-700 px-3 py-1.5 rounded-lg hover:bg-uat-50 transition-colors disabled:opacity-50"
              >
                {busy === "promote_uat" ? "..." : "Promovează UAT"}
              </button>
            </div>
          </div>
        )}

        {isSuperSession && user.hasUatAccount && (
          <button
            onClick={() => patch("revoke_uat")}
            disabled={busy === "revoke_uat"}
            className="text-xs border border-red-100 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {busy === "revoke_uat" ? "..." : "Revocă acces UAT"}
          </button>
        )}

        {isSuperSession && !user.hasSuperAdminAccount && (
          <button
            onClick={() => patch("promote_super_admin")}
            disabled={busy === "promote_super_admin"}
            className="text-xs border border-red-200 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {busy === "promote_super_admin" ? "..." : "Promovează Super Admin"}
          </button>
        )}

        {isSuperSession && user.hasSuperAdminAccount && (
          <button
            onClick={() => patch("revoke_super_admin")}
            disabled={busy === "revoke_super_admin"}
            className="text-xs border border-red-100 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {busy === "revoke_super_admin" ? "..." : "Revocă Super Admin"}
          </button>
        )}

        {/* Management roles — link to association */}
        {(user.derivedRole === "MANAGER" || user.derivedRole === "BOARD_PRESIDENT" || user.derivedRole === "AUDITOR") && (
          <p className="text-xs text-gray-500">
            Pentru modificarea mandatelor, accesați pagina asociației.
            {user.mandates[0] && (
              <Link href={`/uat/associations/${user.mandates[0].associationId}`}
                className="ml-1 text-blue-600 hover:underline">
                {user.mandates[0].associationName} →
              </Link>
            )}
          </p>
        )}
      </div>

      {/* Access management */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <p className="text-sm font-medium text-gray-700">Acces platformă</p>
        <AccessPanel userId={user.id} />
      </div>
    </div>
  );
}

const CLASSIFICATION_LABELS: Record<string, string> = {
  CONFORME:    "Conformă (≥80%)",
  AVERTISMENT: "Avertisment (60–79%)",
  SOMATIE:     "Somație (40–59%)",
  SANCTIUNE:   "Sancțiune (<40%)",
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function UtilizatoriPage() {
  const { data: session } = useSession();
  const sessionRole = session?.user?.role as string | undefined;

  const [users, setUsers]                   = useState<UserRecord[]>([]);
  const [loading, setLoading]               = useState(true);
  const [search, setSearch]                 = useState("");
  const [roleFilter, setRoleFilter]         = useState("");
  const [neighborhoodFilter, setNeighborhoodFilter] = useState("");
  const [assocFilter, setAssocFilter]       = useState("");
  const [classFilter, setClassFilter]       = useState("");
  const [selected, setSelected]             = useState<UserRecord | null>(null);

  // Filter options loaded once
  const [neighborhoods, setNeighborhoods]   = useState<string[]>([]);
  const [associations, setAssociations]     = useState<{ id: string; name: string; neighborhood: string | null }[]>([]);

  useEffect(() => {
    fetch("/api/uat/users/filters").then(r => r.json()).then(d => {
      setNeighborhoods(d.neighborhoods ?? []);
      setAssociations(d.associations ?? []);
    });
  }, []);

  const load = useCallback(async (q: string, role: string, neighborhood: string, assocId: string, classification: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q)              params.set("q",              q);
    if (role)           params.set("role",           role);
    if (neighborhood)   params.set("neighborhood",   neighborhood);
    if (assocId)        params.set("assocId",        assocId);
    if (classification) params.set("classification", classification);
    const res = await fetch(`/api/uat/users?${params}`);
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => load(search, roleFilter, neighborhoodFilter, assocFilter, classFilter), 300);
    return () => clearTimeout(id);
  }, [search, roleFilter, neighborhoodFilter, assocFilter, classFilter, load]);

  function updateSelected(patch: Partial<UserRecord>) {
    setSelected(prev => prev ? { ...prev, ...patch } : null);
    setUsers(prev => prev.map(u => u.id === selected?.id ? { ...u, ...patch } : u));
  }

  // Associations filtered by selected neighborhood for the assoc dropdown
  const filteredAssocs = neighborhoodFilter
    ? associations.filter(a => a.neighborhood === neighborhoodFilter)
    : associations;

  const hasFilters = !!(search || roleFilter || neighborhoodFilter || assocFilter || classFilter);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Utilizatori</h1>
        <p className="text-sm text-gray-500 mt-1">
          Toți utilizatorii platformei — vizualizare și gestionare roluri.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 space-y-3">
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Caută după nume sau email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Toate rolurile</option>
            {(sessionRole === "SUPER_ADMIN" ? ALL_ROLES : OPERATOR_VISIBLE_ROLES).map(r => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-3 flex-wrap">
          <select
            value={neighborhoodFilter}
            onChange={e => { setNeighborhoodFilter(e.target.value); setAssocFilter(""); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-36"
          >
            <option value="">Toate cartierele</option>
            {neighborhoods.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <select
            value={assocFilter}
            onChange={e => setAssocFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-48"
          >
            <option value="">Toate asociațiile</option>
            {filteredAssocs.map(a => (
              <option key={a.id} value={a.id}>
                {a.name}{a.neighborhood ? ` — ${a.neighborhood}` : ""}
              </option>
            ))}
          </select>
          <select
            value={classFilter}
            onChange={e => setClassFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-44"
          >
            <option value="">Orice scor UAT</option>
            {Object.entries(CLASSIFICATION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {hasFilters && (
            <button
              onClick={() => { setSearch(""); setRoleFilter(""); setNeighborhoodFilter(""); setAssocFilter(""); setClassFilter(""); }}
              className="text-sm text-slate-500 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              ✕ Resetează
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User list */}
        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-gray-500 py-8 text-center">Se încarcă...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">
              {search || roleFilter ? "Niciun rezultat." : "Nu există utilizatori."}
            </p>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-1">{users.length} utilizatori</p>
              {users.map(user => (
                <button
                  key={user.id}
                  onClick={() => setSelected(user)}
                  className={`w-full text-left bg-white border rounded-xl p-4 transition-colors ${
                    selected?.id === user.id ? "border-blue-500 shadow-sm" : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900 text-sm">{user.fullName}</p>
                        {!user.isActive && (
                          <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full">Dezactivat</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{user.email}</p>
                    </div>
                    {user.derivedRole ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${ROLE_BADGE[user.derivedRole] ?? "bg-gray-100 text-gray-600"}`}>
                        {ROLE_LABEL[user.derivedRole] ?? user.derivedRole}
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-400 shrink-0">Fără rol</span>
                    )}
                  </div>

                  {user.mandates.length > 0 && (
                    <p className="text-xs text-gray-400 mt-1.5 truncate">
                      {user.mandates.map(m => m.associationName).join(", ")}
                    </p>
                  )}

                  <p className="text-xs text-gray-400 mt-1">
                    {user.lastLoginAt
                      ? `Login: ${new Date(user.lastLoginAt).toLocaleDateString("ro-RO")}`
                      : "Nu s-a autentificat"}
                  </p>
                </button>
              ))}
            </>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div>
            <DetailPanel
              user={selected}
              sessionRole={sessionRole}
              onUpdate={updateSelected}
            />
          </div>
        )}
      </div>
    </div>
  );
}
