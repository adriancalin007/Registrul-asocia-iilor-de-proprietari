// src/app/api/servicii/aep/sectie-votare/route.ts
//
// Registrul Electoral / AEP — no public unauthenticated API exists.
// Returns a structured fallback pointing to the official portal.
// Rate-limited: 10 req / min / user.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!checkRateLimit(`${session.user.id}:aep`, 10, 60_000)) {
    return NextResponse.json({ error: "Prea multe cereri. Încearcă din nou peste un minut." }, { status: 429 });
  }

  // AEP Registrul Electoral does not expose a public API.
  return NextResponse.json({
    success: false,
    data: null,
    fallbackUrl: "https://www.registrulelectoral.ro/cautare",
    userMessage:
      "Registrul Electoral nu oferă un API public. Accesează portalul oficial pentru a-ți verifica secția de votare.",
  });
}
