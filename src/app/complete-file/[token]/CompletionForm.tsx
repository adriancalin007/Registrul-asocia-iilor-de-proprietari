"use client";
import { useState, useTransition } from "react";

export default function CompletionForm({ token }: { token: string; roundId: string }) {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [documents, setDocuments] = useState([{ id:"1", label:"", url:"" }]);

  function addDoc() { setDocuments(p=>[...p,{id:Date.now().toString(),label:"",url:""}]); }
  function removeDoc(id: string) { if (documents.length>1) setDocuments(p=>p.filter(d=>d.id!==id)); }
  function updateDoc(id: string, field: "label"|"url", val: string) {
    setDocuments(p=>p.map(d=>d.id===id?{...d,[field]:val}:d)); setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valid = documents.filter(d=>d.label.trim()&&d.url.trim());
    if (!valid.length) { setError("Add at least one document with name and link"); return; }
    startTransition(async () => {
      const res = await fetch(`/api/complete-file/${token}`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ newDocuments: valid, associationNotes: notes }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "An error occurred."); return; }
      setSubmitted(true);
    });
  }

  if (submitted) return (
    <div className="bg-white rounded-2xl p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">Documents submitted!</h2>
      <p className="text-slate-500">The UAT operator will review the submitted documents and contact you with the final decision.</p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 space-y-5">
          <h2 className="font-semibold text-slate-900">New documents</h2>
          <p className="text-sm text-slate-500">Upload documents to Google Drive and paste the sharing link below.</p>
          <div className="space-y-4">
            {documents.map((doc,i)=>(
              <div key={doc.id} className="border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase">Document {i+1}</span>
                  {documents.length>1&&<button type="button" onClick={()=>removeDoc(doc.id)} className="text-xs text-red-400 hover:text-red-600">✕ Remove</button>}
                </div>
                <div><label className="label text-xs">Document name <span className="text-red-500">*</span></label>
                  <input type="text" value={doc.label} onChange={e=>updateDoc(doc.id,"label",e.target.value)} placeholder="e.g. Updated ID copy Ion Popescu" className="input text-sm"/>
                </div>
                <div><label className="label text-xs">Document link <span className="text-red-500">*</span></label>
                  <input type="url" value={doc.url} onChange={e=>updateDoc(doc.id,"url",e.target.value)} placeholder="https://drive.google.com/..." className="input text-sm"/>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addDoc} className="text-sm text-uat-600 hover:text-uat-800 font-medium">+ Add another document</button>
          <div><label className="label">Notes (optional)</label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} className="input resize-none text-sm" placeholder="Any additional information for the UAT operator..."/>
          </div>
          {error&&<div className="bg-red-50 border border-red-200 rounded-xl p-3"><p className="text-red-700 text-sm">⚠ {error}</p></div>}
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button type="submit" disabled={isPending} className="btn-primary px-8">
            {isPending?"Submitting...":"Submit documents"}
          </button>
        </div>
      </div>
    </form>
  );
}
