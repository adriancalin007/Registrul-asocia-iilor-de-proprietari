"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import FileUpload from "@/components/FileUpload";

// ── Types ──────────────────────────────────────────────────────────────────

interface PersonFields {
  firstName: string; lastName: string; email: string; phone: string;
}

interface Administrator extends PersonFields {
  entityType: "individual" | "company";
  companyName: string; cui: string; address: string; legalRepresentative: string;
  authorizationDocUrl: string;
}

interface Cenzor extends PersonFields {
  entityType: "individual" | "company";
  companyName: string; cui: string; address: string; legalRepresentative: string;
}

interface CEXMember extends PersonFields { role: string; idUrl: string; }

interface Props {
  associationId: string;
  initialPresident: PersonFields | null;
  initialAdministrator: Administrator | null;
  initialCenzor: Cenzor | null;
  initialCommittee: CEXMember[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

const emptyPerson = (): PersonFields => ({ firstName: "", lastName: "", email: "", phone: "" });
const emptyAdmin = (): Administrator => ({
  entityType: "individual", firstName: "", lastName: "", email: "", phone: "",
  companyName: "", cui: "", address: "", legalRepresentative: "", authorizationDocUrl: "",
});
const emptyCenzor = (): Cenzor => ({
  entityType: "individual", firstName: "", lastName: "", email: "", phone: "",
  companyName: "", cui: "", address: "", legalRepresentative: "",
});
const emptyMember = (): CEXMember => ({ firstName: "", lastName: "", role: "", email: "", phone: "", idUrl: "" });

function PersonForm({ value, onChange }: { value: PersonFields; onChange: (v: PersonFields) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="label-text">Prenume</label>
        <input className="input" value={value.firstName} onChange={e => onChange({ ...value, firstName: e.target.value })} />
      </div>
      <div>
        <label className="label-text">Nume</label>
        <input className="input" value={value.lastName} onChange={e => onChange({ ...value, lastName: e.target.value })} />
      </div>
      <div>
        <label className="label-text">Email</label>
        <input className="input" type="email" value={value.email} onChange={e => onChange({ ...value, email: e.target.value })} />
      </div>
      <div>
        <label className="label-text">Telefon</label>
        <input className="input" value={value.phone} onChange={e => onChange({ ...value, phone: e.target.value })} />
      </div>
    </div>
  );
}

function CompanyForm({ value, onChange }: { value: { companyName: string; cui: string; address: string; legalRepresentative: string }; onChange: (v: typeof value) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <label className="label-text">Denumire firmă</label>
        <input className="input" value={value.companyName} onChange={e => onChange({ ...value, companyName: e.target.value })} />
      </div>
      <div>
        <label className="label-text">CUI</label>
        <input className="input" value={value.cui} onChange={e => onChange({ ...value, cui: e.target.value })} />
      </div>
      <div>
        <label className="label-text">Reprezentant legal</label>
        <input className="input" value={value.legalRepresentative} onChange={e => onChange({ ...value, legalRepresentative: e.target.value })} />
      </div>
      <div className="col-span-2">
        <label className="label-text">Adresă sediu</label>
        <input className="input" value={value.address} onChange={e => onChange({ ...value, address: e.target.value })} />
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function LeadershipEditor({ associationId, initialPresident, initialAdministrator, initialCenzor, initialCommittee }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [president, setPresident] = useState<PersonFields>(initialPresident ?? emptyPerson());
  const [admin, setAdmin] = useState<Administrator>(initialAdministrator ?? emptyAdmin());
  const [cenzor, setCenzor] = useState<Cenzor>(initialCenzor ?? emptyCenzor());
  const [committee, setCommittee] = useState<CEXMember[]>(initialCommittee ?? []);

  const [activeSection, setActiveSection] = useState<"president" | "administrator" | "cenzor" | "committee" | null>(null);

  async function save(section: string, data: unknown) {
    startTransition(async () => {
      setMessage(null);
      const res = await fetch(`/api/uat/associations/${associationId}/leadership`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, data }),
      });
      const json = await res.json();
      if (!res.ok) { setMessage({ type: "error", text: json.error ?? "Eroare" }); return; }
      setMessage({ type: "success", text: "Salvat cu succes." });
      setActiveSection(null);
      router.refresh();
    });
  }

  function addMember() { setCommittee(c => [...c, emptyMember()]); }
  function removeMember(i: number) { setCommittee(c => c.filter((_, idx) => idx !== i)); }
  function updateMember(i: number, m: CEXMember) { setCommittee(c => c.map((x, idx) => idx === i ? m : x)); }

  const sections = [
    { id: "president" as const, label: "Președinte CA", color: "bg-uat-600", filled: !!initialPresident?.firstName },
    { id: "administrator" as const, label: "Administrator", color: "bg-emerald-600", filled: !!initialAdministrator },
    { id: "cenzor" as const, label: "Cenzor", color: "bg-purple-600", filled: !!initialCenzor },
    { id: "committee" as const, label: `CEX (${committee.length} membri)`, color: committee.length >= 2 ? "bg-blue-600" : "bg-amber-500", filled: committee.length >= 2 },
  ];

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="font-semibold text-slate-900">Structura de conducere</h2>
        <p className="text-xs text-slate-400 mt-0.5">Necesare pentru aprobare: Președinte, Administrator, Cenzor, minim 2 membri CEX</p>
      </div>
      <div className="card-body space-y-4">

        {/* Section pills */}
        <div className="flex flex-wrap gap-2">
          {sections.map(s => (
            <button key={s.id} type="button"
              onClick={() => setActiveSection(activeSection === s.id ? null : s.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeSection === s.id ? `${s.color} text-white shadow` : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.filled ? "bg-emerald-400" : "bg-amber-400"}`} />
              {s.label}
            </button>
          ))}
        </div>

        {message && (
          <div className={`rounded-xl px-4 py-2.5 text-sm font-medium border ${
            message.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"
          }`}>{message.text}</div>
        )}

        {/* President */}
        {activeSection === "president" && (
          <div className="bg-slate-50 rounded-xl p-4 space-y-4 border border-slate-200">
            <p className="font-semibold text-slate-800 text-sm">Președinte Comitet de Administrare</p>
            <PersonForm value={president} onChange={setPresident} />
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => save("president", president)} disabled={isPending} className="btn-primary text-sm">
                Salvează
              </button>
              <button type="button" onClick={() => setActiveSection(null)} className="btn-ghost text-sm">Anulează</button>
            </div>
          </div>
        )}

        {/* Administrator */}
        {activeSection === "administrator" && (
          <div className="bg-slate-50 rounded-xl p-4 space-y-4 border border-slate-200">
            <p className="font-semibold text-slate-800 text-sm">Administrator</p>

            <div className="flex gap-3">
              {(["individual", "company"] as const).map(t => (
                <button key={t} type="button"
                  onClick={() => setAdmin({ ...admin, entityType: t })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    admin.entityType === t ? "bg-uat-600 text-white border-uat-600" : "bg-white text-slate-600 border-slate-200 hover:border-uat-300"
                  }`}>
                  {t === "individual" ? "Persoană fizică" : "Persoană juridică"}
                </button>
              ))}
            </div>

            {admin.entityType === "individual" ? (
              <PersonForm value={admin} onChange={v => setAdmin({ ...admin, ...v })} />
            ) : (
              <CompanyForm value={admin} onChange={v => setAdmin({ ...admin, ...v })} />
            )}

            <div>
              <label className="label-text">Dovadă autorizare administrator</label>
              <FileUpload
                hint="PDF, Word · max 20 MB"
                onUpload={(url) => setAdmin({ ...admin, authorizationDocUrl: url })}
              />
              <input className="input text-sm mt-1.5" placeholder="sau URL extern (Google Drive, OneDrive...)"
                value={admin.authorizationDocUrl}
                onChange={e => setAdmin({ ...admin, authorizationDocUrl: e.target.value })} />
              {admin.authorizationDocUrl && (
                <a href={admin.authorizationDocUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-uat-600 hover:underline truncate block mt-0.5">
                  {admin.authorizationDocUrl}
                </a>
              )}
              <p className="text-xs text-slate-400 mt-1">Obligatoriu — contract, autorizație ANRE sau echivalent</p>
            </div>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => save("administrator", admin)} disabled={isPending} className="btn-primary text-sm">
                Salvează
              </button>
              <button type="button" onClick={() => setActiveSection(null)} className="btn-ghost text-sm">Anulează</button>
            </div>
          </div>
        )}

        {/* Cenzor */}
        {activeSection === "cenzor" && (
          <div className="bg-slate-50 rounded-xl p-4 space-y-4 border border-slate-200">
            <p className="font-semibold text-slate-800 text-sm">Cenzor</p>

            <div className="flex gap-3">
              {(["individual", "company"] as const).map(t => (
                <button key={t} type="button"
                  onClick={() => setCenzor({ ...cenzor, entityType: t })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    cenzor.entityType === t ? "bg-purple-600 text-white border-purple-600" : "bg-white text-slate-600 border-slate-200 hover:border-purple-300"
                  }`}>
                  {t === "individual" ? "Persoană fizică" : "Persoană juridică"}
                </button>
              ))}
            </div>

            {cenzor.entityType === "individual" ? (
              <PersonForm value={cenzor} onChange={v => setCenzor({ ...cenzor, ...v })} />
            ) : (
              <CompanyForm value={cenzor} onChange={v => setCenzor({ ...cenzor, ...v })} />
            )}

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => save("cenzor", cenzor)} disabled={isPending} className="btn-primary text-sm">
                Salvează
              </button>
              <button type="button" onClick={() => setActiveSection(null)} className="btn-ghost text-sm">Anulează</button>
            </div>
          </div>
        )}

        {/* Executive committee */}
        {activeSection === "committee" && (
          <div className="bg-slate-50 rounded-xl p-4 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-800 text-sm">Comitet executiv (CEX)</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${committee.length >= 2 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                {committee.length} / minim 2
              </span>
            </div>

            <div className="space-y-3">
              {committee.map((m, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-3 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-500">Membru {i + 1}</span>
                    <button type="button" onClick={() => removeMember(i)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium">Șterge</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label-text">Prenume</label>
                      <input className="input text-sm" value={m.firstName} onChange={e => updateMember(i, { ...m, firstName: e.target.value })} />
                    </div>
                    <div>
                      <label className="label-text">Nume</label>
                      <input className="input text-sm" value={m.lastName} onChange={e => updateMember(i, { ...m, lastName: e.target.value })} />
                    </div>
                    <div>
                      <label className="label-text">Funcție / rol</label>
                      <input className="input text-sm" value={m.role} onChange={e => updateMember(i, { ...m, role: e.target.value })} />
                    </div>
                    <div>
                      <label className="label-text">Email</label>
                      <input className="input text-sm" value={m.email} onChange={e => updateMember(i, { ...m, email: e.target.value })} />
                    </div>
                    <div>
                      <label className="label-text">Telefon</label>
                      <input className="input text-sm" value={m.phone} onChange={e => updateMember(i, { ...m, phone: e.target.value })} />
                    </div>
                    <div className="col-span-2">
                      <label className="label-text">Copie CI</label>
                      <FileUpload
                        hint="PDF, imagine · max 20 MB"
                        onUpload={(url) => updateMember(i, { ...m, idUrl: url })}
                      />
                      <input className="input text-sm mt-1" placeholder="sau URL extern..."
                        value={m.idUrl} onChange={e => updateMember(i, { ...m, idUrl: e.target.value })} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button type="button" onClick={addMember}
              className="w-full py-2 border border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-uat-400 hover:text-uat-600 transition-colors">
              + Adaugă membru CEX
            </button>

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => save("executiveCommittee", committee)} disabled={isPending} className="btn-primary text-sm">
                Salvează
              </button>
              <button type="button" onClick={() => setActiveSection(null)} className="btn-ghost text-sm">Anulează</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
