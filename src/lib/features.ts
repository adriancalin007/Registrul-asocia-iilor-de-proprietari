// src/lib/features.ts
// Feature flags — controlate prin variabile de mediu.
// NEXT_PUBLIC_ permite citirea atât pe server cât și în client components.

/** true  → toate modulele extinse sunt vizibile (scoli, servicii inline, chat etc.)
 *  false → doar modulul de asociații de proprietari este vizibil */
export const PORTAL_EXTINS =
  process.env.NEXT_PUBLIC_PORTAL_EXTINS === "true";
