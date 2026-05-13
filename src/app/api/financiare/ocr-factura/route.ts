// src/app/api/financiare/ocr-factura/route.ts
// Accepts an invoice image/PDF upload, sends to Claude vision, returns extracted fields.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import Anthropic from "@anthropic-ai/sdk";

const ALLOWED = [UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (!ALLOWED.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Tip fișier neacceptat. Folosește JPG, PNG, WebP sau PDF." }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Fișierul este prea mare (max 10 MB)." }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

  // PDF not directly supported as image source — convert to a note
  const isPdf = file.type === "application/pdf";

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `Ești un asistent specializat în extragerea datelor din facturi românești.
Analizează această factură și extrage EXACT câmpurile de mai jos în format JSON.
Dacă un câmp nu se găsește, pune null.

Returnează DOAR JSON-ul, fără text suplimentar:
{
  "supplierName": "numele firmei emitente",
  "supplierCui": "codul fiscal / CUI al emitentului (doar cifre, fără RO prefix)",
  "invoiceNumber": "numărul facturii",
  "invoiceDate": "data facturii în format YYYY-MM-DD",
  "totalAmount": numărul total de plată (fără TVA dacă e separat, altfel cu TVA),
  "vatAmount": valoarea TVA dacă e menționată sau null,
  "currency": "RON sau EUR sau altă monedă",
  "description": "o scurtă descriere a serviciului/produsului facturat",
  "category": "una din: Apă și canal / Energie electrică / Gaze naturale / Termoficare / Instalații sanitare / Instalații electrice / Reparații / Curățenie / Administrare / Salarii / Altele"
}`;

  try {
    let message;

    if (isPdf) {
      // For PDFs, use document source type
      message = await client.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            } as Anthropic.DocumentBlockParam,
            { type: "text", text: prompt },
          ],
        }],
      });
    } else {
      message = await client.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
                data: base64,
              },
            },
            { type: "text", text: prompt },
          ],
        }],
      });
    }

    const text = message.content[0].type === "text" ? message.content[0].text : "";

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Nu am putut extrage datele din factură." }, { status: 422 });
    }

    const extracted = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ success: true, data: extracted });

  } catch (err: unknown) {
    console.error("OCR error:", err);
    const msg = err instanceof Error ? err.message : "Eroare la procesarea facturii";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
