// src/lib/context-asociatie.ts
// Gestionarea contextului activ per sesiune de administrator
// Conform doc v4: "contextul activ este vizibil permanent în interfață"
// și "schimbarea este explicită și înregistrată"

import { cookies } from "next/headers";

const COOKIE_CONTEXT = "asociatie_activa";

export function getContextAsociatie(): string | undefined {
  const cookieStore = cookies();
  return cookieStore.get(COOKIE_CONTEXT)?.value;
}

export function setContextAsociatie(asociatieId: string) {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_CONTEXT, asociatieId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60, // 8 ore — durata sesiunii
  });
}

export function clearContextAsociatie() {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_CONTEXT);
}
