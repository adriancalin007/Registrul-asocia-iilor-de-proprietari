"use client";
// src/components/layout/ProprietarBanner.tsx
import { useState, useEffect } from "react";

const COOKIE_KEY = "proprietar_banner_dismissed";

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  return document.cookie.split("; ").find(r => r.startsWith(name + "="))?.split("=")[1];
}

export default function ProprietarBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!getCookie(COOKIE_KEY)) setVisible(true);
  }, []);

  function dismiss() {
    // Set cookie for 365 days
    const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${COOKIE_KEY}=1; expires=${expires}; path=/`;
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-start gap-3">
      <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-800">
          Ești înregistrat ca proprietar în Sectorul 1, nu ca locuitor.
        </p>
        <p className="text-xs text-amber-700 mt-0.5">
          Ai acces la serviciile naționale disponibile în portal (ANCPI, REGES, ANAF, MAI).
          Serviciile exclusive pentru cetățenii cu domiciliu în Sector 1 (DGITL, Urbanism, Asistență socială) nu sunt disponibile.
          Pentru acces complet, actualizează-ți domiciliul la Sector 1 și reverifică-te prin ROeID.
        </p>
      </div>
      <button onClick={dismiss} className="flex-shrink-0 text-amber-500 hover:text-amber-700 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
