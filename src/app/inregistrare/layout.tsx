// src/app/inregistrare/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Înregistrare Asociație | UAT Sector 1",
  description: "Înregistrați asociația de proprietari în platforma digitală a Sectorului 1",
};

export default function InregistrareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-uat-950 via-uat-900 to-uat-800">
      {/* Header instituțional */}
      <header className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21" />
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Primăria Sectorului 1 București</p>
            <p className="text-uat-300 text-xs">Platformă Digitală Civic-Instituțională</p>
          </div>
        </div>
      </header>

      {/* Conținut */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="text-center text-uat-400 text-xs py-6">
        Platformă operată de Primăria Sectorului 1 București · Toate datele sunt protejate conform GDPR
      </footer>
    </div>
  );
}
