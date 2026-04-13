// src/lib/contextAdministrator.ts
// Gestionarea contextului activ pentru administratori multi-asociație
// Contextul activ se stochează în cookie de sesiune (nu persistent în DB)
// Schimbarea contextului este înregistrată în jurnal audit

import { cookies } from "next/headers";

const COOKIE_CONTEXT = "admin_context_asociatie";

/**
 * Citește asociația activă din cookie-ul de sesiune
 */
export function getContextActiv(): string | null {
  const cookieStore = cookies();
  return cookieStore.get(COOKIE_CONTEXT)?.value ?? null;
}

/**
 * Setează asociația activă în cookie-ul de sesiune
 */
export function setContextActiv(asociatieId: string): void {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_CONTEXT, asociatieId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60, // 8 ore — durata sesiunii
  });
}

/**
 * Șterge contextul activ
 */
export function stergeContextActiv(): void {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_CONTEXT);
}
