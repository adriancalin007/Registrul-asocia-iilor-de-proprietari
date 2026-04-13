"use client";
// src/app/(dashboard)/uat/associations/new/page.tsx
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FileUpload from "@/components/ui/FileUpload";
import StreetAutocomplete from "@/components/ui/StreetAutocomplete";
import type { UploadResult } from "@/lib/storage";

function genTempId() { return `op_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
function genId() { return Math.random().toString(36).slice(2, 9); }

interface CommitteeMember {
  id: string; role: string; firstName: string; lastName: string;
  phone: string; email: string; idFile: UploadResult | null;
}

const NEIGHBORHOODS = [
  "Aviatorilor","Băneasa","Brâncuși","Colentina","Dorobanți","Floreasca",
  "Grivița","Herăstrău","Pajura","Romană","Ștefan cel Mare","Victoriei","Altul",
];
const COMMITTEE_ROLES = ["Vicepreședinte","Secretar","Cenzor","Membru comitet executiv","Casier"];

function emptyMember(): CommitteeMember {
  return { id: genId(), role:"", firstName:"", lastName:"", phone:"", email:"", idFile: null };
}

export default function NewAssociationPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [tempId] = useState(() => genTempId());

  const [form, setForm] = useState({
    name: "", fiscalCode: "", address: "", neighborhood: "",
    presidentFirstName: "", presidentLastName: "", presidentEmail: "", presidentPhone: "",
    staircaseCount: "1", unitCount: "",
    status: "ACTIVE" as "ACTIVE" | "PENDING",
    docStatute: null as UploadResult | null,
    docCourtReg: null as UploadResult | null,
    docPresidentMandate: null as UploadResult | null,
    docPresidentId: null as UploadResult | null,
    committeeMembers: [emptyMember(), emptyMember()] as CommitteeMember[],
  });

  function upd(k: string, v: string) {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: "" }));
  }
  function updDoc(k: string, v: UploadResult | null) { setForm(p => ({ ...p, [k]: v })); }
  function updMember(i: number, k: string, v: string) {
    setForm(p => { const m=[...p.committeeMembers]; m[i]={...m[i],[k]:v}; return {...p,committeeMembers:m}; });
  }
  function updMemberFile(i: number, v: UploadResult|null) {
    setForm(p => { const m=[...p.committeeMembers]; m[i]={...m[i],idFile:v}; return {...p,committeeMembers:m}; });
  }
  function addMember() { if (form.committeeMembers.length<6) setForm(p=>({...p,committeeMembers:[...p.committeeMembers,emptyMember()]})); }
  function removeMember(i: number) { if (form.committeeMembers.length>2) setForm(p=>({...p,committeeMembers:p.committeeMembers.filter((_,j)=>j!==i)})); }

  function validate() {
    const e: Record<string,string> = {};
    if (!form.name.trim()) e.name = "Obligatoriu";
    if (!form.fiscalCode.trim() || !/^\d{4,10}$/.test(form.fiscalCode.replace(/\s/g,""))) e.fiscalCode = "4-10 cifre";
    if (!form.address.trim()) e.address = "Obligatoriu";
    if (!form.neighborhood) e.neighborhood = "Selectați cartierul";
    if (!form.unitCount || parseInt(form.unitCount)<1) e.unitCount = "Obligatoriu";
    if (!form.presidentFirstName.trim()) e.presidentFirstName = "Obligatoriu";
    if (!form.presidentLastName.trim()) e.presidentLastName = "Obligatoriu";
    if (form.presidentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.presidentEmail)) e.presidentEmail = "Email invalid";
    setErrors(e);
    return !Object.keys(e).length;
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
          fiscalCode: form.fiscalCode.replace(/\s/g,""),
          address: form.address,
          neighborhood: form.neighborhood,
          operatorRegistered: true,
          status: form.status,
          registrationDocs: {
            president: {
              firstName: form.presidentFirstName,
              lastName: form.presidentLastName,
              email: form.presidentEmail,
              phone: form.presidentPhone,
            },
            structure: {
              staircaseCount: parseInt(form.staircaseCount)||1,
              unitCount: parseInt(form.unitCount)||0,
            },
            requiredDocuments: {
              statute: form.docStatute ?? { url: "", name: "", path: "" },
              courtRegistration: form.docCourtReg ?? { url: "", name: "", path: "" },
              presidentMandate: form.docPresidentMandate ?? { url: "", name: "", path: "" },
              presidentId: form.docPresidentId ?? { url: "", name: "", path: "" },
            },
            executiveCommittee: form.committeeMembers.map(m => ({
              role: m.role, firstName: m.firstName, lastName: m.lastName,
              phone: m.phone, email: m.email,
              idFile: m.idFile ?? null,
            })),
            gdprConsent: { given: true, timestamp: new Date().toISOString() },
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
        <p className="text-sm text-slate-500 mt-1">
          Înregistrare directă de către operatorul UAT. Actele pot fi adăugate ulterior.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Date asociație */}
        <div className="card">
          <div className="card-header"><h2 className="font-semibold text-slate-900">Date asociație</h2></div>
          <div className="card-body space-y-4">
            <div>
              <label className="label">Denumire completă <span className="text-red-500">*</span></label>
              <input type="text" value={form.name} onChange={e=>upd("name",e.target.value)}
                placeholder="ex: Asociația de Proprietari Nr. 123 Sector 1"
                className={`input ${errors.name?"border-red-400":""}`}/>
              {errors.name&&<p className="text-red-500 text-xs mt-1">⚠ {errors.name}</p>}
            </div>
            <div>
              <label className="label">Cod fiscal (CIF) <span className="text-red-500">*</span></label>
              <input type="text" value={form.fiscalCode} onChange={e=>upd("fiscalCode",e.target.value)}
                placeholder="ex: 12345678" className={`input ${errors.fiscalCode?"border-red-400":""}`}/>
              {errors.fiscalCode&&<p className="text-red-500 text-xs mt-1">⚠ {errors.fiscalCode}</p>}
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
                <span className="text-slate-400 font-normal text-xs ml-1">(opțional — auto-detectat după stradă)</span>
              </label>
              <select value={form.neighborhood} onChange={e=>upd("neighborhood",e.target.value)} className="input">
                <option value="">— Selectați sau lăsați gol —</option>
                {NEIGHBORHOODS.map(n=><option key={n} value={n}>{n}</option>)}
              </select>
              {form.neighborhood && (
                <p className="text-xs text-uat-600 mt-1">📍 {form.neighborhood}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Număr scări</label>
                <input type="number" min="1" value={form.staircaseCount}
                  onChange={e=>upd("staircaseCount",e.target.value)} className="input"/>
              </div>
              <div>
                <label className="label">Număr apartamente <span className="text-red-500">*</span></label>
                <input type="number" min="1" value={form.unitCount}
                  onChange={e=>upd("unitCount",e.target.value)} placeholder="ex: 48"
                  className={`input ${errors.unitCount?"border-red-400":""}`}/>
                {errors.unitCount&&<p className="text-red-500 text-xs mt-1">⚠ {errors.unitCount}</p>}
              </div>
            </div>
            <div>
              <label className="label">Stare inițială</label>
              <select value={form.status} onChange={e=>upd("status",e.target.value)} className="input">
                <option value="ACTIVE">Activă — validată direct de operator</option>
                <option value="PENDING">În așteptare — urmează verificare</option>
              </select>
            </div>
          </div>
        </div>

        {/* Președinte CA */}
        <div className="card">
          <div className="card-header"><h2 className="font-semibold text-slate-900">Președinte Comitet Executiv</h2></div>
          <div className="card-body space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Nume <span className="text-red-500">*</span></label>
                <input type="text" value={form.presidentLastName} onChange={e=>upd("presidentLastName",e.target.value)}
                  placeholder="Popescu" className={`input ${errors.presidentLastName?"border-red-400":""}`}/>
                {errors.presidentLastName&&<p className="text-red-500 text-xs mt-1">⚠ {errors.presidentLastName}</p>}
              </div>
              <div>
                <label className="label">Prenume <span className="text-red-500">*</span></label>
                <input type="text" value={form.presidentFirstName} onChange={e=>upd("presidentFirstName",e.target.value)}
                  placeholder="Ion" className={`input ${errors.presidentFirstName?"border-red-400":""}`}/>
                {errors.presidentFirstName&&<p className="text-red-500 text-xs mt-1">⚠ {errors.presidentFirstName}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Email (opțional)</label>
                <input type="email" value={form.presidentEmail} onChange={e=>upd("presidentEmail",e.target.value)}
                  placeholder="ion.popescu@email.ro" className={`input ${errors.presidentEmail?"border-red-400":""}`}/>
                {errors.presidentEmail&&<p className="text-red-500 text-xs mt-1">⚠ {errors.presidentEmail}</p>}
              </div>
              <div>
                <label className="label">Telefon (opțional)</label>
                <input type="tel" value={form.presidentPhone} onChange={e=>upd("presidentPhone",e.target.value)}
                  placeholder="0721 000 000" className="input"/>
              </div>
            </div>
          </div>
        </div>

        {/* Acte */}
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-900">Acte obligatorii</h2>
            <p className="text-xs text-slate-400 mt-0.5">Opționale la înregistrare de operator — pot fi adăugate ulterior</p>
          </div>
          <div className="card-body space-y-4">
            <FileUpload associationId={tempId} category="registration" label="Statut asociație"
              value={form.docStatute} onChange={v=>updDoc("docStatute",v)} />
            <FileUpload associationId={tempId} category="registration" label="Dovadă înregistrare judecătorie"
              value={form.docCourtReg} onChange={v=>updDoc("docCourtReg",v)} />
            <FileUpload associationId={tempId} category="registration" label="Contract de mandat Președinte CA"
              value={form.docPresidentMandate} onChange={v=>updDoc("docPresidentMandate",v)} />
            <FileUpload associationId={tempId} category="committee" label="Copie CI Președinte CA"
              value={form.docPresidentId} onChange={v=>updDoc("docPresidentId",v)} />
          </div>
        </div>

        {/* Comitet */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Comitet executiv</h2>
              <p className="text-xs text-slate-400 mt-0.5">Minim 2, maxim 6 membri</p>
            </div>
            {form.committeeMembers.length<6 && (
              <button type="button" onClick={addMember} className="btn-secondary text-sm">+ Adaugă</button>
            )}
          </div>
          <div className="card-body space-y-4">
            {form.committeeMembers.map((m,i)=>(
              <div key={m.id} className="border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase">Membru {i+1}</span>
                  {form.committeeMembers.length>2&&(
                    <button type="button" onClick={()=>removeMember(i)} className="text-xs text-red-400 hover:text-red-600">✕ Șterge</button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="label text-xs">Funcție</label>
                    <select value={m.role} onChange={e=>updMember(i,"role",e.target.value)} className="input text-sm">
                      <option value="">— Selectați —</option>
                      {COMMITTEE_ROLES.map(r=><option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label text-xs">Nume</label>
                    <input type="text" value={m.lastName} onChange={e=>updMember(i,"lastName",e.target.value)}
                      placeholder="Popescu" className="input text-sm"/>
                  </div>
                  <div>
                    <label className="label text-xs">Prenume</label>
                    <input type="text" value={m.firstName} onChange={e=>updMember(i,"firstName",e.target.value)}
                      placeholder="Ion" className="input text-sm"/>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label text-xs">Telefon</label>
                    <input type="tel" value={m.phone} onChange={e=>updMember(i,"phone",e.target.value)} className="input text-sm"/>
                  </div>
                  <div>
                    <label className="label text-xs">Email</label>
                    <input type="email" value={m.email} onChange={e=>updMember(i,"email",e.target.value)} className="input text-sm"/>
                  </div>
                </div>
                <FileUpload associationId={tempId} category="committee" label="Copie CI"
                  value={m.idFile} onChange={v=>updMemberFile(i,v)} />
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
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
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
