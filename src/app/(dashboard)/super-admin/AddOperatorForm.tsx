"use client";
// src/app/(dashboard)/super-admin/AddOperatorForm.tsx
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface UAT          { id: string; name: string; }
interface Association  { id: string; name: string; address: string; }
interface Building     { id: string; name: string; address: string; }
interface Unit         { id: string; number: string; floor: number | null; area: number | null; }

type RoleOption = "UAT_OPERATOR" | "SUPER_ADMIN" | "MANAGER" | "BOARD_PRESIDENT" | "OWNER";

const ROLE_OPTIONS: { value: RoleOption; label: string; desc: string; color: string }[] = [
  { value: "UAT_OPERATOR",    label: "UAT Operator",    desc: "Municipality staff",           color: "border-uat-400 bg-uat-50 text-uat-700" },
  { value: "MANAGER",         label: "Administrator",   desc: "Building manager",              color: "border-blue-400 bg-blue-50 text-blue-700" },
  { value: "BOARD_PRESIDENT", label: "Board President", desc: "Președinte CA",                 color: "border-purple-400 bg-purple-50 text-purple-700" },
  { value: "OWNER",           label: "Owner",           desc: "Proprietar / locatar",          color: "border-green-400 bg-green-50 text-green-700" },
  { value: "SUPER_ADMIN",     label: "Super Admin",     desc: "Full platform access",          color: "border-red-400 bg-red-50 text-red-700" },
];

export default function AddOperatorForm({
  uats,
  associations,
  currentUserId,
}: {
  uats: UAT[];
  associations: Association[];
  currentUserId: string;
}) {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const prefillEmail = searchParams.get("prefillEmail") ?? "";
  const prefillRole  = (searchParams.get("role") ?? "UAT_OPERATOR") as RoleOption;

  const [role, setRole]               = useState<RoleOption>(prefillRole);
  const [fullName, setFullName]       = useState("");
  const [email, setEmail]             = useState(prefillEmail);
  const [phone, setPhone]             = useState("");
  const [uatId, setUatId]             = useState(uats[0]?.id ?? "");
  const [jobTitle, setJobTitle]       = useState("");
  const [associationId, setAssocId]   = useState("");
  const [buildingId, setBuildingId]   = useState("");
  const [unitId, setUnitId]           = useState("");
  const [ownerType, setOwnerType]     = useState<"OWNER" | "TENANT" | "CO_OWNER">("OWNER");
  const [startDate, setStartDate]     = useState(new Date().toISOString().slice(0, 10));
  const [buildings, setBuildings]     = useState<Building[]>([]);
  const [units, setUnits]             = useState<Unit[]>([]);
  const [loadingBuildings, setLB]     = useState(false);
  const [loadingUnits, setLU]         = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [success, setSuccess]         = useState<string | null>(null);

  // Sync form when URL prefill params change (e.g. clicking a different manager's "+ asociație" link)
  useEffect(() => {
    if (prefillEmail) {
      setEmail(prefillEmail);
      setRole(prefillRole);
      // Scroll the form into view
      document.getElementById("add-operator-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillEmail]);

  // Load buildings when association changes
  useEffect(() => {
    if (!associationId || (role !== "OWNER")) { setBuildings([]); setBuildingId(""); setUnits([]); setUnitId(""); return; }
    setLB(true); setBuildingId(""); setUnits([]); setUnitId("");
    fetch(`/api/super-admin/buildings?associationId=${associationId}`)
      .then(r => r.json())
      .then((data: Building[]) => setBuildings(data))
      .finally(() => setLB(false));
  }, [associationId, role]);

  // Load units when building changes
  useEffect(() => {
    if (!buildingId) { setUnits([]); setUnitId(""); return; }
    setLU(true); setUnitId("");
    fetch(`/api/super-admin/units?buildingId=${buildingId}`)
      .then(r => r.json())
      .then((data: Unit[]) => setUnits(data))
      .finally(() => setLU(false));
  }, [buildingId]);

  // Reset context fields when role changes
  useEffect(() => {
    setAssocId(""); setBuildingId(""); setUnitId(""); setBuildings([]); setUnits([]);
  }, [role]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setSuccess(null);

    const payload: Record<string, unknown> = { role, fullName, email };
    if (phone) payload.phone = phone;
    if (role === "UAT_OPERATOR") { payload.uatId = uatId; payload.jobTitle = jobTitle; }
    if (role === "MANAGER" || role === "BOARD_PRESIDENT") { payload.associationId = associationId; payload.startDate = startDate; }
    if (role === "OWNER") { payload.unitId = unitId; payload.ownerType = ownerType; payload.startDate = startDate; }

    const res  = await fetch("/api/super-admin/operators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
    } else {
      const note = data.created
        ? `Account created for ${email}. They must set a password via "Forgot password".`
        : `Existing account for ${email} linked with new role.`;
      setSuccess(note);
      setFullName(""); setEmail(""); setPhone(""); setJobTitle("");
      setAssocId(""); setBuildingId(""); setUnitId("");
      router.refresh();
    }
    setLoading(false);
  }

  const needsAssociation = role === "MANAGER" || role === "BOARD_PRESIDENT";
  const needsUnit        = role === "OWNER";

  return (
    <form id="add-operator-form" onSubmit={handleSubmit} className="space-y-5">
      {/* Role selector */}
      <div>
        <p className="text-xs font-medium text-slate-500 mb-2">Role *</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {ROLE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRole(opt.value)}
              className={`py-2 px-2 rounded-xl text-xs font-semibold border-2 transition-all text-center ${
                role === opt.value ? opt.color + " border-current" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
              }`}
            >
              <p>{opt.label}</p>
              <p className={`font-normal mt-0.5 ${role === opt.value ? "opacity-75" : "text-slate-400"}`}>{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Common fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Full name *</label>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
            placeholder="Ion Popescu"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uat-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Email *</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            placeholder="ion@example.ro"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uat-500" />
        </div>

        {/* Phone — for non-admin roles */}
        {(role !== "SUPER_ADMIN") && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="0721 000 000"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uat-500" />
          </div>
        )}

        {/* UAT Operator fields */}
        {role === "UAT_OPERATOR" && (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Job title</label>
              <input type="text" value={jobTitle} onChange={e => setJobTitle(e.target.value)}
                placeholder="Platform coordinator"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uat-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">UAT *</label>
              <select value={uatId} onChange={e => setUatId(e.target.value)} required
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-uat-500">
                {uats.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </>
        )}

        {/* Manager / Board President — association + start date */}
        {needsAssociation && (
          <>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Asociație *
                <span className="ml-1 font-normal text-slate-400">({associations.length} disponibile)</span>
              </label>
              <select value={associationId} onChange={e => setAssocId(e.target.value)} required
                size={Math.min(associations.length + 1, 8)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-uat-500">
                <option value="">— selectează —</option>
                {associations.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">
                Dacă utilizatorul are deja un mandat activ, i se adaugă această asociație în plus.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Mandate start date *</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uat-500" />
            </div>
          </>
        )}

        {/* Owner — cascade association → building → unit */}
        {needsUnit && (
          <>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Association *</label>
              <select value={associationId} onChange={e => setAssocId(e.target.value)} required
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-uat-500">
                <option value="">— select —</option>
                {associations.map(a => (
                  <option key={a.id} value={a.id}>{a.name} · {a.address}</option>
                ))}
              </select>
            </div>

            {associationId && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Building * {loadingBuildings && <span className="text-slate-400">(loading…)</span>}
                </label>
                <select value={buildingId} onChange={e => setBuildingId(e.target.value)} required
                  disabled={loadingBuildings || buildings.length === 0}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-uat-500 disabled:opacity-50">
                  <option value="">— select —</option>
                  {buildings.map(b => <option key={b.id} value={b.id}>{b.name} · {b.address}</option>)}
                </select>
              </div>
            )}

            {buildingId && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Apartment * {loadingUnits && <span className="text-slate-400">(loading…)</span>}
                </label>
                <select value={unitId} onChange={e => setUnitId(e.target.value)} required
                  disabled={loadingUnits || units.length === 0}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-uat-500 disabled:opacity-50">
                  <option value="">— select —</option>
                  {units.map(u => (
                    <option key={u.id} value={u.id}>
                      Apt. {u.number}{u.floor != null ? `, floor ${u.floor}` : ""}{u.area ? `, ${u.area} m²` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Ownership type *</label>
              <select value={ownerType} onChange={e => setOwnerType(e.target.value as typeof ownerType)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-uat-500">
                <option value="OWNER">Owner (proprietar)</option>
                <option value="TENANT">Tenant (chirias)</option>
                <option value="CO_OWNER">Co-owner (coproprietar)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Ownership start *</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-uat-500" />
            </div>
          </>
        )}
      </div>

      {/* Feedback */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">✓ {success}</div>
      )}

      <button type="submit" disabled={loading}
        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Creating…
          </>
        ) : "Create account"}
      </button>

      <p className="text-xs text-slate-400">
        Conturile noi nu au parolă — utilizatorul și-o setează prin &quot;Am uitat parola&quot; la login.
        Dacă email-ul există deja, noul rol/mandat se adaugă la contul existent.
        <strong className="text-slate-500"> Pentru a da acces la mai multe asociații: introdu același email și alege o altă asociație.</strong>
      </p>
    </form>
  );
}
