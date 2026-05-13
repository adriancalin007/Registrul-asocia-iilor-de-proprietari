// src/app/api/servicii/anofm/statut/route.ts
//
// ANOFM — no public unauthenticated API exists.
// Returns a structured informational response with direct links.
// Rate-limited: 10 req / min / user.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export interface AnofmInfo {
  links: { label: string; url: string }[];
}

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!checkRateLimit(`${session.user.id}:anofm`, 10, 60_000)) {
    return NextResponse.json({ error: "Prea multe cereri. Încearcă din nou peste un minut." }, { status: 429 });
  }

  // ANOFM does not expose a public API — return curated links.
  const data: AnofmInfo = {
    links: [
      { label: "Verifică stagiu de cotizare",   url: "https://angajat.anofm.ro" },
      { label: "Ajutor de șomaj — eligibilitate", url: "https://www.anofm.ro/indemnizatie-somaj" },
      { label: "Oferte de muncă BIM",            url: "https://bim.anofm.ro" },
    ],
  };

  return NextResponse.json({
    success: true,
    data,
    fallbackUrl: "https://www.anofm.ro",
    userMessage: null,
  });
}
