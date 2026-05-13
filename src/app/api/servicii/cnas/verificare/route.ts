// src/app/api/servicii/cnas/verificare/route.ts
//
// CNAS asigurare check — no public unauthenticated API exists.
// Returns a structured fallback that tells the client to redirect to the official portal.
// Rate-limited: 10 req / min / user.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!checkRateLimit(`${session.user.id}:cnas`, 10, 60_000)) {
    return NextResponse.json({ error: "Prea multe cereri. Încearcă din nou peste un minut." }, { status: 429 });
  }

  // CNAS does not expose a public API for insurance status lookup.
  // Return structured fallback so the UI can show the official portal button.
  return NextResponse.json({
    success: false,
    data: null,
    fallbackUrl: "https://siui.casan.ro/asigurati/",
    userMessage:
      "CNAS nu oferă un API public de verificare. Accesează portalul oficial pentru a-ți verifica statutul de asigurat.",
  });
}
