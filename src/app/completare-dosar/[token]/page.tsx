// src/app/completare-dosar/[token]/page.tsx
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import CompletareForm from "./CompletareForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Completare dosar | UAT Sector 1" };

interface Props { params: { token: string } }

export default async function CompletareDosarPage({ params }: Props) {
  const round = await prisma.completionRound.findUnique({
    where: { completionToken: params.token },
    include: {
      association: { select: { name: true, address: true, fiscalCode: true } },
    },
  });

  if (!round) notFound();

  if (new Date(round.tokenExpiresAt) < new Date()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-uat-950 via-uat-900 to-uat-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Link expirat</h1>
          <p className="text-slate-500">Linkul de completare a expirat. Contactați operatorul UAT pentru un nou link.</p>
        </div>
      </div>
    );
  }

  if (round.isCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-uat-950 via-uat-900 to-uat-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Dosar deja completat</h1>
          <p className="text-slate-500">Ați trimis deja documentele pentru această rundă. Operatorul UAT le va verifica.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-uat-950 via-uat-900 to-uat-800">
      <header className="border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21" />
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Primăria Sectorului 1 București</p>
            <p className="text-uat-300 text-xs">Completare dosar înregistrare</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Completare dosar</h1>
          <p className="text-uat-300">{round.association.name}</p>
          <p className="text-uat-400 text-sm">{round.association.address}</p>
        </div>

        <div className="bg-amber-500/10 border border-amber-400/30 rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-amber-400 text-xl flex-shrink-0">⚠</span>
            <div>
              <p className="font-semibold text-amber-200 mb-2">
                Runda {round.roundNumber} — Documente solicitate de operatorul UAT:
              </p>
              <p className="text-amber-100 text-sm leading-relaxed whitespace-pre-line">{round.missingItems}</p>
            </div>
          </div>
        </div>

        <CompletareForm token={params.token} rundaId={round.id} />

        <p className="text-center text-uat-400 text-xs mt-6">
          Link valabil până la {new Date(round.tokenExpiresAt).toLocaleDateString("ro-RO", {
            day: "numeric", month: "long", year: "numeric"
          })}
        </p>
      </main>
    </div>
  );
}
