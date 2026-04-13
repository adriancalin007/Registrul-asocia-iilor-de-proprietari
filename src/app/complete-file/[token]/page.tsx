import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import CompletionForm from "./CompletionForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "File Completion | UAT Sector 1" };

interface Props { params: { token: string } }

export default async function CompleteFilePage({ params }: Props) {
  const round = await prisma.completionRound.findUnique({
    where: { completionToken: params.token },
    include: { association: { select: { name: true, address: true } } },
  });

  if (!round) notFound();

  if (new Date(round.tokenExpiresAt) < new Date()) return (
    <div className="min-h-screen bg-gradient-to-br from-uat-950 via-uat-900 to-uat-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" /></svg>
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Link expired</h1>
        <p className="text-slate-500">This completion link has expired. Contact the UAT operator for a new link.</p>
      </div>
    </div>
  );

  if (round.isCompleted) return (
    <div className="min-h-screen bg-gradient-to-br from-uat-950 via-uat-900 to-uat-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Already submitted</h1>
        <p className="text-slate-500">You have already submitted documents for this round. The UAT operator will review them.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-uat-950 via-uat-900 to-uat-800">
      <header className="border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21" /></svg>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Sector 1 Municipality of Bucharest</p>
            <p className="text-uat-300 text-xs">File completion — Round {round.roundNumber}</p>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">File Completion</h1>
          <p className="text-uat-300">{round.association.name}</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-400/30 rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-amber-400 text-xl flex-shrink-0">⚠</span>
            <div>
              <p className="font-semibold text-amber-200 mb-2">Round {round.roundNumber} — Documents requested by UAT operator:</p>
              <p className="text-amber-100 text-sm leading-relaxed whitespace-pre-line">{round.missingItems}</p>
            </div>
          </div>
        </div>
        <CompletionForm token={params.token} roundId={round.id} />
        <p className="text-center text-uat-400 text-xs mt-6">
          Link valid until {new Date(round.tokenExpiresAt).toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" })}
        </p>
      </main>
    </div>
  );
}
