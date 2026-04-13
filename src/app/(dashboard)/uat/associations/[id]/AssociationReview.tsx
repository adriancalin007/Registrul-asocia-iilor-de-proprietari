"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface CompletionRound {
  id: string; roundNumber: number; missingItems: string;
  isCompleted: boolean; completedAt: Date | null;
  newDocuments: unknown; associationNotes: string | null;
  completionToken: string; tokenExpiresAt: Date;
}

interface Props {
  associationId: string; operatorId: string;
  currentStatus: string; completionRounds: CompletionRound[];
}

export default function AssociationReview({ associationId, currentStatus, completionRounds }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [missingItems, setMissingItems] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showCompletion, setShowCompletion] = useState(false);
  const [showRejection, setShowRejection] = useState(false);
  const [completionUrl, setCompletionUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function execute(action: string) {
    startTransition(async () => {
      const res = await fetch(`/api/uat/associations/${associationId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, missingItems, rejectionReason }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage({ type: "error", text: data.error ?? "An error occurred." }); return; }
      if (data.completionUrl) setCompletionUrl(data.completionUrl);
      setMessage({
        type: "success",
        text: action === "VALIDATE" ? "Association validated and activated!"
          : action === "REQUEST_COMPLETION" ? "Completion link generated."
          : action === "REJECT" ? "Application permanently rejected."
          : "Action executed.",
      });
      if (action !== "REQUEST_COMPLETION") setTimeout(() => router.push("/uat/associations"), 2000);
      else router.refresh();
    });
  }

  const completedRounds = completionRounds.filter(r => r.isCompleted);
  const pendingRound = completionRounds.find(r => !r.isCompleted);

  return (
    <div className="space-y-4">
      {/* Completed rounds */}
      {completedRounds.map(r => {
        const docs = r.newDocuments as Array<{ label: string; url: string }> ?? [];
        return (
          <div key={r.id} className="card border-emerald-200 bg-emerald-50/30">
            <div className="card-body space-y-3">
              <p className="font-semibold text-slate-900">
                ✓ Round {r.roundNumber} — Documents submitted
                {r.completedAt && <span className="text-xs text-slate-400 ml-2 font-normal">{new Date(r.completedAt).toLocaleDateString("en-GB")}</span>}
              </p>
              <div className="bg-slate-50 rounded-lg p-2 text-xs text-slate-600 whitespace-pre-line">{r.missingItems}</div>
              {docs.length > 0 && (
                <div className="space-y-1">
                  {docs.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span>📄</span>
                      <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-uat-600 hover:underline">{d.label}</a>
                    </div>
                  ))}
                </div>
              )}
              {r.associationNotes && <p className="text-slate-600 text-sm italic">"{r.associationNotes}"</p>}
            </div>
          </div>
        );
      })}

      {/* Pending round */}
      {pendingRound && (
        <div className="card border-amber-200 bg-amber-50/30">
          <div className="card-body">
            <p className="font-medium text-amber-800">⏳ Round {pendingRound.roundNumber} — Awaiting documents from association</p>
            <p className="text-sm text-amber-600 mt-1">Link valid until {new Date(pendingRound.tokenExpiresAt).toLocaleDateString("en-GB")}</p>
            {completionUrl && (
              <div className="mt-2 bg-white rounded-lg p-2">
                <p className="text-xs text-slate-500 mb-1">Link to send to association:</p>
                <a href={completionUrl} target="_blank" rel="noopener noreferrer" className="text-uat-600 text-xs break-all">{completionUrl}</a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${message.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"}`}>
          {message.text}
          {completionUrl && message.type === "success" && (
            <div className="mt-2 bg-white rounded-lg p-2">
              <p className="text-xs text-slate-500 mb-1">Link to send to association:</p>
              <a href={completionUrl} target="_blank" rel="noopener noreferrer" className="text-uat-600 text-xs break-all">{completionUrl}</a>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {currentStatus === "PENDING" && (
        <div className="card border-slate-200">
          <div className="card-body">
            <p className="text-sm text-slate-600 mb-3">Open the file for review. This action is logged.</p>
            <button type="button" onClick={() => execute("START_REVIEW")} disabled={isPending} className="btn-primary">
              🔍 Open for review
            </button>
          </div>
        </div>
      )}

      {(currentStatus === "UNDER_REVIEW" || currentStatus === "NEEDS_COMPLETION") && (
        <div className="card border-uat-200">
          <div className="card-body space-y-4">
            <h3 className="font-semibold text-slate-900">File actions</h3>

            <button type="button" onClick={() => execute("VALIDATE")} disabled={isPending} className="btn-primary w-full">
              ✓ Validate association
            </button>

            {!showCompletion ? (
              <button type="button" onClick={() => setShowCompletion(true)} className="btn-secondary w-full">
                ✏ Request file completion
              </button>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                <p className="font-medium text-amber-800 text-sm">Describe what is missing or needs correction:</p>
                <textarea value={missingItems} onChange={e => setMissingItems(e.target.value)}
                  placeholder="e.g. Missing updated ID copy for member 2 (Maria Ionescu). President mandate document has expired link..."
                  rows={4} className="input resize-none text-sm" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => execute("REQUEST_COMPLETION")}
                    disabled={isPending || !missingItems.trim()} className="btn-primary text-sm">
                    Generate completion link
                  </button>
                  <button type="button" onClick={() => { setShowCompletion(false); setMissingItems(""); }} className="btn-ghost text-sm">Cancel</button>
                </div>
              </div>
            )}

            {!showRejection ? (
              <button type="button" onClick={() => setShowRejection(true)} className="text-red-500 hover:text-red-700 text-sm font-medium">
                ✕ Reject permanently (fraud / false data)
              </button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                <p className="font-medium text-red-800 text-sm">⚠ Permanent rejection — irreversible. Use only for proven fraud or false data.</p>
                <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)}
                  placeholder="Reason for permanent rejection (will be communicated to the association)..."
                  rows={3} className="input resize-none text-sm border-red-300" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => execute("REJECT")}
                    disabled={isPending || !rejectionReason.trim()} className="btn-danger text-sm">
                    Confirm permanent rejection
                  </button>
                  <button type="button" onClick={() => { setShowRejection(false); setRejectionReason(""); }} className="btn-ghost text-sm">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
