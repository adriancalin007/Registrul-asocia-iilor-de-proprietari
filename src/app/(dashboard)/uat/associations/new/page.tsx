"use client";
// src/app/(dashboard)/uat/associations/new/page.tsx
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FileUpload from "@/components/FileUpload";
import StreetAutocomplete from "@/components/ui/StreetAutocomplete";

function genId() { return Math.random().toString(36).slice(2, 9); }

interface CommitteeMember {
  id: string; role: string; firstName: string; lastName: string;
  phone: string; email: string; idUrl: string;
}

type EntityType = "individual" | "company";

interface PersonForm {
  entityType: EntityType;
  firstName: string;
  lastName: string;
  companyName: string;
  cui: string;
  address: string;
  representative: string;
  email: string;
  phone: string;
  idUrl: string;
  cuiUrl: string;
}

const NEIGHBORHOODS = [
  "Aviatorilor","Băneasa","Brâncuși","Colentina","Dorobanți","Floreasca",
  "Grivița","Herăstrău","Pajura","Romană","Ștefan cel Mare","Victoriei","Altul",
];
const COMMITTEE_ROLES = ["Vicepreședinte","Secretar","Cenzor","Membru comitet executiv","Casier"];

function emptyMember(): CommitteeMember {
  return { id: genId(), role: "", firstName: "", lastName: "", phone: "", email: "", idUrl: "" };
}

function emptyPerson(entityType: EntityType = "individual"): PersonForm {
  return { entityType, firstName: "", lastName: "", companyName: "", cui: "", address: "", representative: "", email: "", phone: "", idUrl: "", cuiUrl: "" };
}

function EntityTypeToggle({ value, onChange }: { value: EntityType; onChange: (v: EntityType) => void }) {
  return (
    <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
      {(["individual", "company"] as EntityType[]).map(t => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            value === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {t === "individual" ? "Persoană fizică" : "Persoană juridică"}
        </button>
      ))}
    </div>
  );
}

function PersonSection({
  title, person, onChange, errors, showId = true,
}: {
  title: string;
  person: PersonForm;
  onChange: (updates: Partial<PersonForm>) => void;
  errors: Record<string, string>;
  showId?: boolean;
}) {
  return (
    <div className="card">
      <div className="card-header">
        <h2 className="font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="card-body space-y-4">
        <EntityTypeToggle value={person.entityType} onChange={v => onChange({ entityType: v })} />

        {person.entityType === "individual" ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Nume <span className="text-red-500">*</span></label>
                <input type="text" value={person.lastName} onChange={e => onChange({ lastName: e.target.value })}
                  placeholder="Popescu" className={`input ${errors.lastName ? "border-red-400" : ""}`} />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">⚠ {errors.lastName}</p>}
              </div>
              <div>
                <label className="label">Prenume <span className="text-red-500">*</span></label>
                <input type="text" value={person.firstName} onChange={e => onChange({ firstName: e.target.value })}
                  placeholder="Ion" className={`input ${errors.firstName ? "border-red-400" : ""}`} />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">⚠ {errors.firstName}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Email <span className="text-slate-400 text-xs">(opțional)</span></label>
                <input type="email" value={person.email} onChange={e => onChange({ email: e.target.value })}
                  placeholder="ion.popescu@email.ro" className="input" />
              </div>
              <div>
                <label className="label">Telefon <span className="text-slate-400 text-xs">(opțional)</span></label>
                <input type="tel" value={person.phone} onChange={e => onChange({ phone: e.target.value })}
                  placeholder="0721 000 000" className="input" />
              </div>
            </div>
            {showId && (
              <div>
                <label className="label">Copie CI <span className="text-red-500">*</span></label>
                <FileUpload
                  hint="PDF sau imagine · max 20 MB"
                  onUpload={(url) => onChange({ idUrl: url })}
                />
                {person.idUrl && (
                  <p className="text-xs text-emerald-600 mt-1">✓ Fișier încărcat</p>
                )}
                {errors.idUrl && <p className="text-red-500 text-xs mt-1">⚠ {errors.idUrl}</p>}
              </div>
            )}
          </>
        ) : (
          <>
            <div>
              <label className="label">Denumire societate <span className="text-red-500">*</span></label>
              <input type="text" value={person.companyName} onChange={e => onChange({ companyName: e.target.value })}
                placeholder="S.C. Administrator Bloc S.R.L." className={`input ${errors.companyName ? "border-red-400" : ""}`} />
              {errors.companyName && <p className="text-red-500 text-xs mt-1">⚠ {errors.companyName}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">CUI <span className="text-red-500">*</span></label>
                <input type="text" value={person.cui} onChange={e => onChange({ cui: e.target.value })}
                  placeholder="RO12345678" className={`input ${errors.cui ? "border-red-400" : ""}`} />
                {errors.cui && <p className="text-red-500 text-xs mt-1">⚠ {errors.cui}</p>}
              </div>
              <div>
                <label className="label">Reprezentant legal <span className="text-red-500">*</span></label>
                <input type="text" value={person.representative} onChange={e => onChange({ representative: e.target.value })}
                  placeholder="Nume Prenume" className={`input ${errors.representative ? "border-red-400" : ""}`} />
                {errors.representative && <p className="text-red-500 text-xs mt-1">⚠ {errors.representative}</p>}
              </div>
            </div>
            <div>
              <label className="label">Adresă sediu social <span className="text-red-500">*</span></label>
              <input type="text" value={person.address} onChange={e => onChange({ address: e.target.value })}
                placeholder="Str. Exemplu nr. 1, București" className={`input ${errors.address ? "border-red-400" : ""}`} />
              {errors.address && <p className="text-red-500 text-xs mt-1">⚠ {errors.address}</p>}
            </div>
            <div>
              <label className="label">Copie certificat înregistrare (CUI) <span className="text-red-500">*</span></label>
              <FileUpload
                hint="PDF sau imagine · max 20 MB"
                onUpload={(url) => onChange({ cuiUrl: url })}
              />
              {person.cuiUrl && (
                <p className="text-xs text-emerald-600 mt-1">✓ Fișier încărcat</p>
              )}
              {errors.cuiUrl && <p className="text-red-500 text-xs mt-1">⚠ {errors.cuiUrl}</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function NewAssociationPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [presidentErrors, setPresidentErrors]       = useState<Record<string, string>>({});
  const [administratorErrors, setAdministratorErrors] = useState<Record<string, string>>({});
  const [cenzorErrors, setCenzorErrors]             = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    name: "", fiscalCode: "", address: "", neighborhood: "",
    staircaseCount: "1", unitCount: "",
    status: "ACTIVE" as "ACTIVE" | "PENDING",
  });

  const [president, setPresident]         = useState<PersonForm>(emptyPerson("individual"));
  const [administrator, setAdministrator] = useState<PersonForm>(emptyPerson("individual"));
  const [cenzor, setCenzor]               = useState<PersonForm>(emptyPerson("individual"));
  const [committeeMembers, setCommitteeMembers] = useState<CommitteeMember[]>([emptyMember(), emptyMember()]);

  // Document uploads
  const [docStatute,          setDocStatute]          = useState("");
  const [docCourtReg,         setDocCourtReg]         = useState("");
  const [docPresidentMandate, setDocPresidentMandate] = useState("");

  function upd(k: string, v: string) {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: "" }));
  }

  function updMember(i: number, k: string, v: string) {
    setCommitteeMembers(p => { const m = [...p]; m[i] = { ...m[i], [k]: v }; return m; });
  }
  function addMember() {
    if (committeeMembers.length < 6) setCommitteeMembers(p => [...p, emptyMember()]);
  }
  function removeMember(i: number) {
    if (committeeMembers.length > 2) setCommitteeMembers(p => p.filter((_, j) => j !== i));
  }

  function validatePerson(p: PersonForm, setter: (e: Record<string,string>) => void, requireId: boolean): boolean {
    const e: Record<string, string> = {};
    if (p.entityType === "individual") {
      if (!p.firstName.trim()) e.firstName = "Obligatoriu";
      if (!p.lastName.trim())  e.lastName  = "Obligatoriu";
      if (requireId && !p.idUrl) e.idUrl = "Copie CI obligatorie";
    } else {
      if (!p.companyName.trim())   e.companyName   = "Obligatoriu";
      if (!p.cui.trim())           e.cui           = "Obligatoriu";
      if (!p.representative.trim())e.representative = "Obligatoriu";
      if (!p.address.trim())       e.address       = "Obligatoriu";
      if (requireId && !p.cuiUrl)  e.cuiUrl        = "Copie CUI obligatorie";
    }
    setter(e);
    return Object.keys(e).length === 0;
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Obligatoriu";
    if (!form.fiscalCode.trim() || !/^\d{4,10}$/.test(form.fiscalCode.replace(/\s/g, ""))) e.fiscalCode = "4-10 cifre";
    if (!form.address.trim()) e.address = "Obligatoriu";
    if (!form.unitCount || parseInt(form.unitCount) < 1) e.unitCount = "Obligatoriu";
    setErrors(e);

    const presOk    = validatePerson(president,      setPresidentErrors,      true);
    const adminOk   = validatePerson(administrator,  setAdministratorErrors,  true);
    const cenzorOk  = validatePerson(cenzor,         setCenzorErrors,         true);

    return Object.keys(e).length === 0 && presOk && adminOk && cenzorOk;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    startTransition(async () => {
      const res = await fetch("/api/register-association", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          fiscalCode: form.fiscalCode.replace(/\s/g, ""),
          address: form.address,
          neighborhood: form.neighborhood,
          operatorRegistered: true,
          status: form.status,
          registrationDocs: {
            president: {
              entityType: president.entityType,
              firstName:  president.firstName,
              lastName:   president.lastName,
              email:      president.email,
              phone:      president.phone,
              idUrl:      president.idUrl,
            },
            administrator: {
              entityType:    administrator.entityType,
              firstName:     administrator.firstName,
              lastName:      administrator.lastName,
              companyName:   administrator.companyName,
              cui:           administrator.cui,
              address:       administrator.address,
              representative:administrator.representative,
              email:         administrator.email,
              phone:         administrator.phone,
              idUrl:         administrator.idUrl,
              cuiUrl:        administrator.cuiUrl,
            },
            cenzor: {
              entityType:  cenzor.entityType,
              firstName:   cenzor.firstName,
              lastName:    cenzor.lastName,
              companyName: cenzor.companyName,
              cui:         cenzor.cui,
              address:     cenzor.address,
              email:       cenzor.email,
              phone:       cenzor.phone,
              idUrl:       cenzor.idUrl,
              cuiUrl:      cenzor.cuiUrl,
            },
            structure: {
              staircaseCount: parseInt(form.staircaseCount) || 1,
              unitCount:      parseInt(form.unitCount)      || 0,
            },
            requiredDocuments: {
              statute:          docStatute,
              courtRegistration:docCourtReg,
              presidentMandate: docPresidentMandate,
              presidentId:      president.idUrl,
            },
            executiveCommittee: committeeMembers.map(m => ({
              role:      m.role      || "Membru",
              firstName: m.firstName || "—",
              lastName:  m.lastName  || "—",
              phone:     m.phone,
              email:     m.email,
              idFile:    m.idUrl || undefined,
            })),
            gdprConsent: { given: true as const, timestamp: new Date().toISOString() },
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErrors({ general: data.error ?? "Eroare." }); return; }
      router.push("/uat/associations");
    });
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
          <Link href="/uat" className="hover:text-slate-600">Panou UAT</Link>
          <span>›</span>
          <Link href="/uat/associations" className="hover:text-slate-600">Asociații</Link>
          <span>›</span>
          <span className="text-slate-700">Asociație nouă</span>
        </div>
        <h1 className="page-title">Înregistrare asociație — operator UAT</h1>
        <p className="text-sm text-slate-500 mt-1">Înregistrare directă de către operatorul UAT.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Date asociație */}
        <div className="card">
          <div className="card-header"><h2 className="font-semibold text-slate-900">Date asociație</h2></div>
          <div className="card-body space-y-4">
            <div>
              <label className="label">Denumire completă <span className="text-red-500">*</span></label>
              <input type="text" value={form.name} onChange={e => upd("name", e.target.value)}
                placeholder="ex: Asociația de Proprietari Nr. 123 Sector 1"
                className={`input ${errors.name ? "border-red-400" : ""}`} />
              {errors.name && <p className="text-red-500 text-xs mt-1">⚠ {errors.name}</p>}
            </div>
            <div>
              <label className="label">Cod fiscal (CIF) <span className="text-red-500">*</span></label>
              <input type="text" value={form.fiscalCode} onChange={e => upd("fiscalCode", e.target.value)}
                placeholder="ex: 12345678" className={`input ${errors.fiscalCode ? "border-red-400" : ""}`} />
              {errors.fiscalCode && <p className="text-red-500 text-xs mt-1">⚠ {errors.fiscalCode}</p>}
            </div>
            <div>
              <label className="label">Adresa sediului <span className="text-red-500">*</span></label>
              <StreetAutocomplete
                value={form.address}
                onChange={v => upd("address", v)}
                onNeighborhoodDetected={n => upd("neighborhood", n)}
                error={errors.address}
              />
            </div>
            <div>
              <label className="label">
                Cartier
                <span className="text-slate-400 font-normal text-xs ml-1">(opțional — auto-detectat)</span>
              </label>
              <select value={form.neighborhood} onChange={e => upd("neighborhood", e.target.value)} className="input">
                <option value="">— Selectați sau lăsați gol —</option>
                {NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Număr scări</label>
                <input type="number" min="1" value={form.staircaseCount}
                  onChange={e => upd("staircaseCount", e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Număr apartamente <span className="text-red-500">*</span></label>
                <input type="number" min="1" value={form.unitCount}
                  onChange={e => upd("unitCount", e.target.value)} placeholder="ex: 48"
                  className={`input ${errors.unitCount ? "border-red-400" : ""}`} />
                {errors.unitCount && <p className="text-red-500 text-xs mt-1">⚠ {errors.unitCount}</p>}
              </div>
            </div>
            <div>
              <label className="label">Stare inițială</label>
              <select value={form.status} onChange={e => upd("status", e.target.value)} className="input">
                <option value="ACTIVE">Activă — validată direct de operator</option>
                <option value="PENDING">În așteptare — urmează verificare</option>
              </select>
            </div>
          </div>
        </div>

        {/* Acte asociație */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-900">Acte obligatorii</h2>
            <p className="text-xs text-slate-400 mt-0.5">Pot fi adăugate ulterior din dosarul asociației</p>
          </div>
          <div className="card-body space-y-4">
            <div>
              <label className="label">Statut / Act constitutiv</label>
              <FileUpload hint="PDF · max 20 MB" onUpload={url => setDocStatute(url)} />
              {docStatute && <p className="text-xs text-emerald-600 mt-1">✓ Fișier încărcat</p>}
            </div>
            <div>
              <label className="label">Dovadă înregistrare judecătorie</label>
              <FileUpload hint="PDF · max 20 MB" onUpload={url => setDocCourtReg(url)} />
              {docCourtReg && <p className="text-xs text-emerald-600 mt-1">✓ Fișier încărcat</p>}
            </div>
            <div>
              <label className="label">Contract de mandat Președinte CA</label>
              <FileUpload hint="PDF · max 20 MB" onUpload={url => setDocPresidentMandate(url)} />
              {docPresidentMandate && <p className="text-xs text-emerald-600 mt-1">✓ Fișier încărcat</p>}
            </div>
          </div>
        </div>

        {/* Președinte CA */}
        <PersonSection
          title="Președinte Comitet de Administrare"
          person={president}
          onChange={u => setPresident(p => ({ ...p, ...u }))}
          errors={presidentErrors}
        />

        {/* Administrator */}
        <PersonSection
          title="Administrator"
          person={administrator}
          onChange={u => setAdministrator(p => ({ ...p, ...u }))}
          errors={administratorErrors}
        />

        {/* Cenzor */}
        <PersonSection
          title="Cenzor / Comisie de cenzori"
          person={cenzor}
          onChange={u => setCenzor(p => ({ ...p, ...u }))}
          errors={cenzorErrors}
        />

        {/* Comitet executiv */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Comitet executiv (minim 2 membri)</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Includeți și președintele, administratorul și cenzorul dacă fac parte din comitet
              </p>
            </div>
            {committeeMembers.length < 6 && (
              <button type="button" onClick={addMember} className="btn-secondary text-sm">+ Adaugă</button>
            )}
          </div>
          <div className="card-body space-y-4">
            {committeeMembers.map((m, i) => (
              <div key={m.id} className="border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase">Membru {i + 1}</span>
                  {committeeMembers.length > 2 && (
                    <button type="button" onClick={() => removeMember(i)}
                      className="text-xs text-red-400 hover:text-red-600">✕ Șterge</button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="label text-xs">Funcție</label>
                    <select value={m.role} onChange={e => updMember(i, "role", e.target.value)} className="input text-sm">
                      <option value="">— Selectați —</option>
                      {COMMITTEE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label text-xs">Nume</label>
                    <input type="text" value={m.lastName} onChange={e => updMember(i, "lastName", e.target.value)}
                      placeholder="Popescu" className="input text-sm" />
                  </div>
                  <div>
                    <label className="label text-xs">Prenume</label>
                    <input type="text" value={m.firstName} onChange={e => updMember(i, "firstName", e.target.value)}
                      placeholder="Ion" className="input text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs">Telefon</label>
                    <input type="tel" value={m.phone} onChange={e => updMember(i, "phone", e.target.value)} className="input text-sm" />
                  </div>
                  <div>
                    <label className="label text-xs">Email</label>
                    <input type="email" value={m.email} onChange={e => updMember(i, "email", e.target.value)} className="input text-sm" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-700 text-sm">⚠ {errors.general}</p>
          </div>
        )}

        <div className="flex justify-between">
          <Link href="/uat/associations" className="btn-secondary">Anulează</Link>
          <button type="submit" disabled={isPending} className="btn-primary px-8">
            {isPending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Se salvează...
              </span>
            ) : "Înregistrează asociația"}
          </button>
        </div>
      </form>
    </div>
  );
}
