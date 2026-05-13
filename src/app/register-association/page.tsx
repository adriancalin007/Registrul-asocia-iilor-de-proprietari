"use client";
import { useState, useTransition } from "react";
import FileUpload from "@/components/ui/FileUpload";
import type { UploadResult } from "@/lib/storage";
import StreetAutocomplete from "@/components/ui/StreetAutocomplete";

// Placeholder association ID for registration (before it's created)
// We'll generate a temp ID client-side and use it for the upload path
function genTempId() {
  return `reg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface CommitteeMember {
  id: string; role: string; firstName: string; lastName: string;
  phone: string; email: string; idFile: UploadResult | null;
}

interface FormData {
  name: string; fiscalCode: string; address: string; neighborhood: string;
  presidentFirstName: string; presidentLastName: string;
  presidentEmail: string; presidentPhone: string;
  staircaseCount: string; unitCount: string;
  docStatute: UploadResult | null;
  docCourtReg: UploadResult | null;
  docPresidentMandate: UploadResult | null;
  docPresidentId: UploadResult | null;
  committeeMembers: CommitteeMember[];
  gdprConsent: boolean;
}

const NEIGHBORHOODS = [
  "Aviatorilor","Băneasa","Brâncuși","Colentina","Dorobanți","Floreasca",
  "Grivița","Herăstrău","Pajura","Romană","Ștefan cel Mare","Victoriei","Altul",
];
const COMMITTEE_ROLES = ["Președinte","Administrator","Membru comitet executiv","Cenzor"];
const STEPS = [
  { n: 1, label: "Date asociație" },
  { n: 2, label: "Conducere" },
  { n: 3, label: "Acte & Comitet" },
  { n: 4, label: "Confirmare" },
];

function genId() { return Math.random().toString(36).slice(2,9); }
function emptyMember(): CommitteeMember {
  return { id: genId(), role:"", firstName:"", lastName:"", phone:"", email:"", idFile: null };
}

function OcrSpinner({ label = "Se analizează documentul..." }: { label?: string }) {
  return (
    <p className="text-xs text-uat-600 flex items-center gap-1.5 mt-1.5">
      <svg className="animate-spin h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
      {label}
    </p>
  );
}

export default function RegisterAssociationPage() {
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [regNumber, setRegNumber] = useState("");
  // Temp ID used as upload path prefix during registration
  const [tempId] = useState(() => genTempId());

  const [form, setForm] = useState<FormData>({
    name:"", fiscalCode:"", address:"", neighborhood:"",
    presidentFirstName:"", presidentLastName:"", presidentEmail:"", presidentPhone:"",
    staircaseCount:"1", unitCount:"",
    docStatute: null, docCourtReg: null, docPresidentMandate: null, docPresidentId: null,
    committeeMembers: [emptyMember(), emptyMember()],
    gdprConsent: false,
  });

  // OCR state
  const [scanCui, setScanCui] = useState<UploadResult | null>(null);
  const [scanPresidentCi, setScanPresidentCi] = useState<UploadResult | null>(null);
  const [ocrLoading, setOcrLoading] = useState<Set<string>>(new Set());
  const [autoFilled, setAutoFilled] = useState<Set<string>>(new Set());

  function upd(k: keyof Omit<FormData,"committeeMembers"|"docStatute"|"docCourtReg"|"docPresidentMandate"|"docPresidentId">, v: string|boolean) {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: "" }));
    setAutoFilled(p => { const s = new Set(p); s.delete(k as string); return s; });
  }
  function updDoc(k: "docStatute"|"docCourtReg"|"docPresidentMandate"|"docPresidentId", v: UploadResult|null) {
    setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: "" }));
  }
  function updMember(i: number, k: keyof Omit<CommitteeMember,"idFile">, v: string) {
    setForm(p => { const m=[...p.committeeMembers]; m[i]={...m[i],[k]:v}; return {...p,committeeMembers:m}; });
    setAutoFilled(p => { const s = new Set(p); s.delete(`cm_${i}_${k}`); return s; });
  }
  function updMemberFile(i: number, v: UploadResult|null) {
    setForm(p => { const m=[...p.committeeMembers]; m[i]={...m[i],idFile:v}; return {...p,committeeMembers:m}; });
  }
  function addMember() { if (form.committeeMembers.length<6) setForm(p=>({...p,committeeMembers:[...p.committeeMembers,emptyMember()]})); }
  function removeMember(i: number) { if (form.committeeMembers.length>2) setForm(p=>({...p,committeeMembers:p.committeeMembers.filter((_,j)=>j!==i)})); }

  async function runOcr(url: string, mimeType: string, docType: string, memberIndex?: number, loadingKey?: string) {
    const key = loadingKey ?? (memberIndex !== undefined ? `memberCI_${memberIndex}` : docType);
    setOcrLoading(prev => { const s = new Set(prev); s.add(key); return s; });
    try {
      const res = await fetch("/api/ocr/asociatie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, mimeType, docType, memberIndex }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.fields && Object.keys(data.fields).length > 0) {
        applyFields(data.fields, memberIndex);
      }
    } catch {
      // Silently fail — user can complete manually
    } finally {
      setOcrLoading(prev => { const s = new Set(prev); s.delete(key); return s; });
    }
  }

  function applyFields(fields: Record<string, string>, memberIndex?: number) {
    if (memberIndex !== undefined) {
      setForm(prev => {
        const members = [...prev.committeeMembers];
        const m = { ...members[memberIndex] };
        if (fields.lastName && !m.lastName) m.lastName = fields.lastName;
        if (fields.firstName && !m.firstName) m.firstName = fields.firstName;
        members[memberIndex] = m;
        return { ...prev, committeeMembers: members };
      });
      setAutoFilled(prev => {
        const s = new Set(prev);
        if (fields.lastName) s.add(`cm_${memberIndex}_lastName`);
        if (fields.firstName) s.add(`cm_${memberIndex}_firstName`);
        return s;
      });
      return;
    }
    setForm(prev => {
      const u: Partial<FormData> = {};
      if (fields.name && !prev.name) u.name = fields.name;
      if (fields.fiscalCode && !prev.fiscalCode) u.fiscalCode = fields.fiscalCode;
      if (fields.address && !prev.address) u.address = fields.address;
      if (fields.unitCount && !prev.unitCount) u.unitCount = fields.unitCount;
      if (fields.staircaseCount && !prev.staircaseCount) u.staircaseCount = fields.staircaseCount;
      if (fields.presidentLastName && !prev.presidentLastName) u.presidentLastName = fields.presidentLastName;
      if (fields.presidentFirstName && !prev.presidentFirstName) u.presidentFirstName = fields.presidentFirstName;
      if (fields.presidentPhone && !prev.presidentPhone) u.presidentPhone = fields.presidentPhone;
      if (fields.presidentEmail && !prev.presidentEmail) u.presidentEmail = fields.presidentEmail;
      return { ...prev, ...u };
    });
    setAutoFilled(prev => {
      const s = new Set(prev);
      if (fields.name) s.add("name");
      if (fields.fiscalCode) s.add("fiscalCode");
      if (fields.address) s.add("address");
      if (fields.unitCount) s.add("unitCount");
      if (fields.staircaseCount) s.add("staircaseCount");
      if (fields.presidentLastName) s.add("presidentLastName");
      if (fields.presidentFirstName) s.add("presidentFirstName");
      if (fields.presidentPhone) s.add("presidentPhone");
      if (fields.presidentEmail) s.add("presidentEmail");
      return s;
    });
  }

  function validate1() {
    const e: Record<string,string>={};
    if (!form.name.trim()) e.name="Obligatoriu";
    if (!form.fiscalCode.trim() || !/^\d{4,10}$/.test(form.fiscalCode.replace(/\s/g,""))) e.fiscalCode="4-10 cifre";
    if (!form.address.trim()) e.address="Obligatoriu";
    if (!form.neighborhood) e.neighborhood="Selectați cartierul";
    if (!form.unitCount || parseInt(form.unitCount)<1) e.unitCount="Obligatoriu";
    setErrors(e); return !Object.keys(e).length;
  }
  function validate2() {
    const e: Record<string,string>={};
    if (!form.presidentFirstName.trim()) e.presidentFirstName="Obligatoriu";
    if (!form.presidentLastName.trim()) e.presidentLastName="Obligatoriu";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.presidentEmail)) e.presidentEmail="Email invalid";
    if (!form.presidentPhone.trim()) e.presidentPhone="Obligatoriu";
    setErrors(e); return !Object.keys(e).length;
  }
  function validate3() {
    const e: Record<string,string>={};
    if (!form.docStatute) e.docStatute="Obligatoriu";
    if (!form.docCourtReg) e.docCourtReg="Obligatoriu";
    if (!form.docPresidentMandate) e.docPresidentMandate="Obligatoriu";
    if (!form.docPresidentId) e.docPresidentId="Obligatoriu";
    form.committeeMembers.forEach((m,i)=>{
      if (!m.role) e[`cm_${i}_role`]="Obligatoriu";
      if (!m.firstName.trim()) e[`cm_${i}_firstName`]="Obligatoriu";
      if (!m.lastName.trim()) e[`cm_${i}_lastName`]="Obligatoriu";
      if (!m.idFile) e[`cm_${i}_idFile`]="Obligatoriu";
    });
    setErrors(e); return !Object.keys(e).length;
  }
  function validate4() {
    const e: Record<string,string>={};
    if (!form.gdprConsent) e.gdprConsent="Acordul este obligatoriu";
    setErrors(e); return !Object.keys(e).length;
  }

  async function handleSubmit() {
    if (!validate4()) return;
    startTransition(async () => {
      const res = await fetch("/api/register-association", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          name: form.name,
          fiscalCode: form.fiscalCode.replace(/\s/g,""),
          address: form.address, neighborhood: form.neighborhood,
          tempId,
          registrationDocs: {
            president: {
              firstName: form.presidentFirstName, lastName: form.presidentLastName,
              email: form.presidentEmail, phone: form.presidentPhone,
            },
            structure: { staircaseCount: parseInt(form.staircaseCount)||1, unitCount: parseInt(form.unitCount)||0 },
            requiredDocuments: {
              statute: { url: form.docStatute?.url, name: form.docStatute?.name, path: form.docStatute?.path },
              courtRegistration: { url: form.docCourtReg?.url, name: form.docCourtReg?.name, path: form.docCourtReg?.path },
              presidentMandate: { url: form.docPresidentMandate?.url, name: form.docPresidentMandate?.name, path: form.docPresidentMandate?.path },
              presidentId: { url: form.docPresidentId?.url, name: form.docPresidentId?.name, path: form.docPresidentId?.path },
            },
            executiveCommittee: form.committeeMembers.map(m=>({
              role: m.role, firstName: m.firstName, lastName: m.lastName,
              phone: m.phone, email: m.email,
              idFile: { url: m.idFile?.url, name: m.idFile?.name, path: m.idFile?.path },
            })),
            gdprConsent: { given: true, timestamp: new Date().toISOString() },
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErrors({ general: data.error ?? "A apărut o eroare." }); return; }
      setRegNumber(data.registrationNumber);
      setSubmitted(true);
    });
  }

  if (submitted) return (
    <div className="min-h-screen bg-gradient-to-br from-uat-950 via-uat-900 to-uat-800 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-400/30 flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Cerere înregistrată cu succes!</h1>
        <div className="bg-white/10 rounded-2xl px-6 py-3 mb-4 inline-block">
          <p className="text-uat-300 text-sm">Număr de înregistrare</p>
          <p className="text-white font-mono font-bold text-xl">{regNumber}</p>
        </div>
        <p className="text-uat-300 text-sm">
          Cererea va fi analizată de operatorul UAT. Veți fi contactat la adresa{" "}
          <span className="text-white">{form.presidentEmail}</span> cu decizia de validare.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-uat-950 via-uat-900 to-uat-800 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Înregistrare Asociație de Proprietari</h1>
          <p className="text-uat-300 mt-1 text-sm">UAT Sector 1 București — Platformă Digitală</p>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-1 mb-8">
          {STEPS.map((s,i)=>(
            <div key={s.n} className="flex items-center gap-1">
              <div className={`flex items-center gap-2 ${step===s.n?"opacity-100":step>s.n?"opacity-70":"opacity-40"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step>s.n?"bg-green-500 text-white":step===s.n?"bg-white text-uat-800":"bg-white/20 text-white"}`}>
                  {step>s.n?"✓":s.n}
                </div>
                <span className="text-white text-sm hidden sm:inline">{s.label}</span>
              </div>
              {i<STEPS.length-1 && <div className="w-6 h-px bg-white/20 mx-1"/>}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Step 1 — Association details */}
          {step===1 && (
            <div className="p-8 space-y-5">
              <h2 className="text-xl font-semibold text-slate-900">Date asociație</h2>

              {/* OCR scan zone — CUI / Certificat Fiscal */}
              <div className="border-2 border-dashed border-uat-200 rounded-2xl p-4 bg-uat-50/40 space-y-2">
                <p className="text-xs font-semibold text-uat-700 flex items-center gap-1.5">
                  ✨ Completare automată din document
                </p>
                <p className="text-xs text-slate-500">
                  Încarcă o copie după CUI sau Certificat de Înregistrare și câmpurile se completează automat.
                </p>
                <FileUpload
                  associationId={tempId}
                  category="registration"
                  label="Scanează CUI / Certificat de Înregistrare (opțional)"
                  value={scanCui}
                  onChange={async v => {
                    setScanCui(v);
                    if (v) await runOcr(v.url, v.type, "cui");
                  }}
                />
                {ocrLoading.has("cui") && <OcrSpinner />}
              </div>

              <div>
                <label className="label">
                  Denumire completă <span className="text-red-500">*</span>
                  {autoFilled.has("name") && <span className="ml-1.5 text-xs bg-uat-100 text-uat-700 px-1.5 py-0.5 rounded font-medium">✨ auto</span>}
                </label>
                <input type="text" value={form.name} onChange={e=>upd("name",e.target.value)}
                  placeholder="ex: Asociația de Proprietari Nr. 123 Sector 1"
                  className={`input ${errors.name?"border-red-400":""}`}/>
                {errors.name&&<p className="text-red-500 text-xs mt-1">⚠ {errors.name}</p>}
              </div>
              <div>
                <label className="label">
                  Cod fiscal (CIF) <span className="text-red-500">*</span>
                  {autoFilled.has("fiscalCode") && <span className="ml-1.5 text-xs bg-uat-100 text-uat-700 px-1.5 py-0.5 rounded font-medium">✨ auto</span>}
                </label>
                <input type="text" value={form.fiscalCode} onChange={e=>upd("fiscalCode",e.target.value)}
                  placeholder="ex: 12345678" className={`input ${errors.fiscalCode?"border-red-400":""}`}/>
                {errors.fiscalCode&&<p className="text-red-500 text-xs mt-1">⚠ {errors.fiscalCode}</p>}
              </div>
              <div>
                <label className="label">
                  Adresa sediului <span className="text-red-500">*</span>
                  {autoFilled.has("address") && <span className="ml-1.5 text-xs bg-uat-100 text-uat-700 px-1.5 py-0.5 rounded font-medium">✨ auto</span>}
                </label>
                <StreetAutocomplete
                  value={form.address}
                  onChange={v => { upd("address", v); }}
                  onNeighborhoodDetected={n => { upd("neighborhood", n); }}
                  placeholder="ex: Strada Nicolae Iorga"
                  error={errors.address}
                />
              </div>
              <div>
                <label className="label">
                  Cartier
                  <span className="text-slate-400 font-normal text-xs ml-1">(opțional — se completează automat după stradă)</span>
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
                  <label className="label">
                    Număr scări
                    {autoFilled.has("staircaseCount") && <span className="ml-1.5 text-xs bg-uat-100 text-uat-700 px-1.5 py-0.5 rounded font-medium">✨ auto</span>}
                  </label>
                  <input type="number" min="1" value={form.staircaseCount}
                    onChange={e=>upd("staircaseCount",e.target.value)} className="input"/>
                </div>
                <div>
                  <label className="label">
                    Număr apartamente <span className="text-red-500">*</span>
                    {autoFilled.has("unitCount") && <span className="ml-1.5 text-xs bg-uat-100 text-uat-700 px-1.5 py-0.5 rounded font-medium">✨ auto</span>}
                  </label>
                  <input type="number" min="1" value={form.unitCount}
                    onChange={e=>upd("unitCount",e.target.value)} placeholder="ex: 48"
                    className={`input ${errors.unitCount?"border-red-400":""}`}/>
                  {errors.unitCount&&<p className="text-red-500 text-xs mt-1">⚠ {errors.unitCount}</p>}
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button type="button" onClick={()=>validate1()&&setStep(2)} className="btn-primary px-8">Continuă →</button>
              </div>
            </div>
          )}

          {/* Step 2 — President */}
          {step===2 && (
            <div className="p-8 space-y-5">
              <h2 className="text-xl font-semibold text-slate-900">Președinte Comitet Executiv</h2>
              <p className="text-sm text-slate-500">Persoana care reprezintă legal asociația și va primi comunicările UAT.</p>

              {/* OCR scan zone — CI Președinte */}
              <div className="border-2 border-dashed border-uat-200 rounded-2xl p-4 bg-uat-50/40 space-y-2">
                <p className="text-xs font-semibold text-uat-700 flex items-center gap-1.5">
                  ✨ Completare automată din CI
                </p>
                <p className="text-xs text-slate-500">
                  Încarcă o copie după CI Președinte pentru completare automată a numelui.
                </p>
                <FileUpload
                  associationId={tempId}
                  category="committee"
                  label="Scanează CI Președinte (opțional)"
                  value={scanPresidentCi}
                  onChange={async v => {
                    setScanPresidentCi(v);
                    if (v) await runOcr(v.url, v.type, "presidentId", undefined, "presidentIdScan");
                  }}
                />
                {ocrLoading.has("presidentIdScan") && <OcrSpinner label="Se analizează CI..." />}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    Nume <span className="text-red-500">*</span>
                    {autoFilled.has("presidentLastName") && <span className="ml-1.5 text-xs bg-uat-100 text-uat-700 px-1.5 py-0.5 rounded font-medium">✨ auto</span>}
                  </label>
                  <input type="text" value={form.presidentLastName} onChange={e=>upd("presidentLastName",e.target.value)}
                    placeholder="Popescu" className={`input ${errors.presidentLastName?"border-red-400":""}`}/>
                  {errors.presidentLastName&&<p className="text-red-500 text-xs mt-1">⚠ {errors.presidentLastName}</p>}
                </div>
                <div>
                  <label className="label">
                    Prenume <span className="text-red-500">*</span>
                    {autoFilled.has("presidentFirstName") && <span className="ml-1.5 text-xs bg-uat-100 text-uat-700 px-1.5 py-0.5 rounded font-medium">✨ auto</span>}
                  </label>
                  <input type="text" value={form.presidentFirstName} onChange={e=>upd("presidentFirstName",e.target.value)}
                    placeholder="Ion" className={`input ${errors.presidentFirstName?"border-red-400":""}`}/>
                  {errors.presidentFirstName&&<p className="text-red-500 text-xs mt-1">⚠ {errors.presidentFirstName}</p>}
                </div>
              </div>
              <div>
                <label className="label">
                  Adresă email <span className="text-red-500">*</span>
                  {autoFilled.has("presidentEmail") && <span className="ml-1.5 text-xs bg-uat-100 text-uat-700 px-1.5 py-0.5 rounded font-medium">✨ auto</span>}
                </label>
                <input type="email" value={form.presidentEmail} onChange={e=>upd("presidentEmail",e.target.value)}
                  placeholder="ion.popescu@email.ro" className={`input ${errors.presidentEmail?"border-red-400":""}`}/>
                {errors.presidentEmail&&<p className="text-red-500 text-xs mt-1">⚠ {errors.presidentEmail}</p>}
              </div>
              <div>
                <label className="label">
                  Telefon <span className="text-red-500">*</span>
                  {autoFilled.has("presidentPhone") && <span className="ml-1.5 text-xs bg-uat-100 text-uat-700 px-1.5 py-0.5 rounded font-medium">✨ auto</span>}
                </label>
                <input type="tel" value={form.presidentPhone} onChange={e=>upd("presidentPhone",e.target.value)}
                  placeholder="0721 000 000" className={`input ${errors.presidentPhone?"border-red-400":""}`}/>
                {errors.presidentPhone&&<p className="text-red-500 text-xs mt-1">⚠ {errors.presidentPhone}</p>}
              </div>
              <div className="flex justify-between pt-2">
                <button type="button" onClick={()=>setStep(1)} className="btn-secondary">← Înapoi</button>
                <button type="button" onClick={()=>validate2()&&setStep(3)} className="btn-primary px-8">Continuă →</button>
              </div>
            </div>
          )}

          {/* Step 3 — Documents & Committee */}
          {step===3 && (
            <div className="p-8 space-y-6">
              <h2 className="text-xl font-semibold text-slate-900">Acte obligatorii și Comitet executiv</h2>

              {/* Required documents */}
              <div className="bg-slate-50 rounded-2xl p-5 space-y-5">
                <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-uat-600 text-white text-xs flex items-center justify-center">1</span>
                  Acte obligatorii
                </h3>
                <div>
                  <FileUpload
                    associationId={tempId}
                    category="registration"
                    label="Statut asociație"
                    required
                    value={form.docStatute}
                    onChange={async v => {
                      updDoc("docStatute", v);
                      if (v) await runOcr(v.url, v.type, "statute");
                    }}
                    error={errors.docStatute}
                  />
                  {ocrLoading.has("statute") && <OcrSpinner />}
                </div>
                <div>
                  <FileUpload
                    associationId={tempId}
                    category="registration"
                    label="Dovadă înregistrare judecătorie"
                    required
                    value={form.docCourtReg}
                    onChange={async v => {
                      updDoc("docCourtReg", v);
                      if (v) await runOcr(v.url, v.type, "courtReg");
                    }}
                    error={errors.docCourtReg}
                  />
                  {ocrLoading.has("courtReg") && <OcrSpinner />}
                </div>
                <div>
                  <FileUpload
                    associationId={tempId}
                    category="registration"
                    label="Contract de mandat Președinte CA"
                    required
                    value={form.docPresidentMandate}
                    onChange={async v => {
                      updDoc("docPresidentMandate", v);
                      if (v) await runOcr(v.url, v.type, "presidentMandate");
                    }}
                    error={errors.docPresidentMandate}
                  />
                  {ocrLoading.has("presidentMandate") && <OcrSpinner />}
                </div>
                <div>
                  <FileUpload
                    associationId={tempId}
                    category="committee"
                    label="Copie CI Președinte CA"
                    required
                    value={form.docPresidentId}
                    onChange={async v => {
                      updDoc("docPresidentId", v);
                      if (v) await runOcr(v.url, v.type, "presidentId");
                    }}
                    error={errors.docPresidentId}
                  />
                  {ocrLoading.has("presidentId") && <OcrSpinner />}
                </div>
              </div>

              {/* Committee members */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-uat-600 text-white text-xs flex items-center justify-center">2</span>
                    Membrii Comitetului Executiv
                    <span className="text-xs text-slate-400 font-normal">(minim 2, maxim 6)</span>
                  </h3>
                  {form.committeeMembers.length<6 && (
                    <button type="button" onClick={addMember}
                      className="text-sm text-uat-600 hover:text-uat-800 font-medium">
                      + Adaugă
                    </button>
                  )}
                </div>

                {form.committeeMembers.map((m,i)=>(
                  <div key={m.id} className="border border-slate-200 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Membru {i+1}</span>
                      {form.committeeMembers.length>2 && (
                        <button type="button" onClick={()=>removeMember(i)} className="text-xs text-red-400 hover:text-red-600">✕ Șterge</button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="label text-xs">Funcție <span className="text-red-500">*</span></label>
                        <select value={m.role} onChange={e=>updMember(i,"role",e.target.value)}
                          className={`input text-sm ${errors[`cm_${i}_role`]?"border-red-400":""}`}>
                          <option value="">— Selectați —</option>
                          {COMMITTEE_ROLES.map(r=><option key={r} value={r}>{r}</option>)}
                        </select>
                        {errors[`cm_${i}_role`]&&<p className="text-red-500 text-xs mt-1">⚠</p>}
                      </div>
                      <div>
                        <label className="label text-xs">
                          Nume <span className="text-red-500">*</span>
                          {autoFilled.has(`cm_${i}_lastName`) && <span className="ml-1 text-xs bg-uat-100 text-uat-700 px-1 py-0.5 rounded font-medium">✨</span>}
                        </label>
                        <input type="text" value={m.lastName} onChange={e=>updMember(i,"lastName",e.target.value)}
                          placeholder="Popescu" className={`input text-sm ${errors[`cm_${i}_lastName`]?"border-red-400":""}`}/>
                      </div>
                      <div>
                        <label className="label text-xs">
                          Prenume <span className="text-red-500">*</span>
                          {autoFilled.has(`cm_${i}_firstName`) && <span className="ml-1 text-xs bg-uat-100 text-uat-700 px-1 py-0.5 rounded font-medium">✨</span>}
                        </label>
                        <input type="text" value={m.firstName} onChange={e=>updMember(i,"firstName",e.target.value)}
                          placeholder="Ion" className={`input text-sm ${errors[`cm_${i}_firstName`]?"border-red-400":""}`}/>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label text-xs">Telefon (opțional)</label>
                        <input type="tel" value={m.phone} onChange={e=>updMember(i,"phone",e.target.value)} className="input text-sm"/>
                      </div>
                      <div>
                        <label className="label text-xs">Email (opțional)</label>
                        <input type="email" value={m.email} onChange={e=>updMember(i,"email",e.target.value)} className="input text-sm"/>
                      </div>
                    </div>
                    <div>
                      <FileUpload
                        associationId={tempId}
                        category="committee"
                        label="Copie CI"
                        required
                        value={m.idFile}
                        onChange={async v => {
                          updMemberFile(i, v);
                          if (v) await runOcr(v.url, v.type, "memberCI", i);
                        }}
                        error={errors[`cm_${i}_idFile`]}
                      />
                      {ocrLoading.has(`memberCI_${i}`) && <OcrSpinner label="Se extrage numele din CI..." />}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-2">
                <button type="button" onClick={()=>setStep(2)} className="btn-secondary">← Înapoi</button>
                <button type="button" onClick={()=>validate3()&&setStep(4)} className="btn-primary px-8">Continuă →</button>
              </div>
            </div>
          )}

          {/* Step 4 — Confirm */}
          {step===4 && (
            <div className="p-8 space-y-5">
              <h2 className="text-xl font-semibold text-slate-900">Verificare și confirmare</h2>
              <div className="space-y-3">
                <div className="bg-slate-50 rounded-2xl p-4 grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
                  <span className="text-slate-400">Asociație</span><span className="font-medium">{form.name}</span>
                  <span className="text-slate-400">CIF</span><span>{form.fiscalCode}</span>
                  <span className="text-slate-400">Adresă</span><span>{form.address}, {form.neighborhood}</span>
                  <span className="text-slate-400">Președinte</span><span>{form.presidentLastName} {form.presidentFirstName}</span>
                  <span className="text-slate-400">Email</span><span>{form.presidentEmail}</span>
                  <span className="text-slate-400">Structură</span><span>{form.unitCount} apt. · {form.staircaseCount} scări</span>
                </div>

                {/* Documents summary */}
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Acte depuse</p>
                  <div className="space-y-2">
                    {[
                      { label: "Statut", file: form.docStatute },
                      { label: "Înregistrare judecătorie", file: form.docCourtReg },
                      { label: "Mandat Președinte", file: form.docPresidentMandate },
                      { label: "CI Președinte", file: form.docPresidentId },
                    ].map(({label, file}) => (
                      <div key={label} className="flex items-center gap-2 text-sm">
                        <span className={file ? "text-green-500" : "text-red-400"}>{file ? "✓" : "✗"}</span>
                        <span className="text-slate-600">{label}:</span>
                        {file ? (
                          <a href={file.url} target="_blank" rel="noopener noreferrer"
                            className="text-uat-600 hover:underline truncate max-w-xs">{file.name}</a>
                        ) : <span className="text-red-400">Lipsă</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Committee summary */}
                <div className="bg-slate-50 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                    Comitet executiv ({form.committeeMembers.length} membri)
                  </p>
                  <div className="space-y-1">
                    {form.committeeMembers.map((m)=>(
                      <div key={m.id} className="flex items-center gap-2 text-sm">
                        <span className="text-green-500">✓</span>
                        <span className="font-medium">{m.lastName} {m.firstName}</span>
                        <span className="text-slate-400">—</span>
                        <span className="text-slate-600">{m.role}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* GDPR */}
                <div className={`border rounded-2xl p-5 ${errors.gdprConsent?"border-red-300 bg-red-50":"border-slate-200 bg-slate-50"}`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={form.gdprConsent}
                      onChange={e=>upd("gdprConsent",e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-slate-300 text-uat-600"/>
                    <span className="text-sm text-slate-700">
                      Am citit și sunt de acord cu prelucrarea datelor cu caracter personal ale membrilor
                      comitetului executiv de către Primăria Sectorului 1 București, în scopul verificării
                      cererii de înregistrare, conform Regulamentului (UE) 2016/679 (GDPR). Confirm că am
                      obținut acordul fiecărei persoane ale cărei date le-am furnizat.
                    </span>
                  </label>
                  {errors.gdprConsent&&<p className="text-red-500 text-sm mt-2 ml-7">⚠ {errors.gdprConsent}</p>}
                </div>

                {errors.general&&(
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-red-700 text-sm">⚠ {errors.general}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-2">
                <button type="button" onClick={()=>setStep(3)} className="btn-secondary">← Înapoi</button>
                <button type="button" onClick={handleSubmit} disabled={isPending} className="btn-primary px-8">
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Se trimite...
                    </span>
                  ) : "Trimite cererea"}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-uat-400 text-sm mt-6">
          Aveți deja cont?{" "}
          <a href="/login" className="text-uat-300 hover:text-white underline">Autentificați-vă aici</a>
        </p>
      </div>
    </div>
  );
}
