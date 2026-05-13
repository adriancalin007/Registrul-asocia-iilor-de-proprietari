// src/app/api/facturi/upload/route.ts — Upload invoice file + run OCR in one step
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const MANAGER_ROLES = [UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[];

async function resolveAssociationId(userId: string): Promise<string | null> {
  const cookieStore = cookies();
  const fromCookie = cookieStore.get("asociatie_activa")?.value;
  if (fromCookie) return fromCookie;
  const mandate = await prisma.mandate.findFirst({ where: { userId, isActive: true } });
  return mandate?.associationId ?? null;
}

const PROMPT = `Ești un asistent specializat în extragerea datelor din facturi românești.
Analizează această factură și extrage EXACT câmpurile de mai jos în format JSON.
Dacă un câmp nu se găsește, pune null.

Returnează DOAR JSON-ul, fără text suplimentar:
{
  "supplierName": "numele firmei emitente",
  "supplierCui": "codul fiscal / CUI al emitentului (doar cifre, fără prefix RO)",
  "invoiceNumber": "numărul facturii",
  "invoiceDate": "data facturii în format YYYY-MM-DD",
  "dueDate": "data scadentă în format YYYY-MM-DD sau null",
  "totalAmount": valoarea totală de plată (număr, cu TVA dacă e inclus),
  "vatAmount": valoarea TVA separată sau null,
  "netAmount": valoarea fără TVA sau null,
  "currency": "RON sau EUR sau altă monedă",
  "description": "scurtă descriere a serviciului/produsului facturat",
  "category": "una din: Apă și canal / Energie electrică / Gaze naturale / Termoficare / Căldură / Lift / Instalații sanitare / Instalații electrice / Instalații termice / Reparații / Curățenie / Administrare / Salarii / Dezinsecție / Deratizare / Altele",
  "iban": "codul IBAN al emitentului (ex: RO49AAAA1B31007593840000) sau null dacă nu apare"
}`;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!MANAGER_ROLES.includes(session.user.role as UserRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!process.env.ANTHROPIC_API_KEY)
    return NextResponse.json({ error: "ANTHROPIC_API_KEY nu este configurat" }, { status: 503 });

  const associationId = await resolveAssociationId(session.user.id);
  if (!associationId) return NextResponse.json({ error: "No active association" }, { status: 400 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Fișier lipsă" }, { status: 400 });

  const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type))
    return NextResponse.json({ error: "Format neacceptat. Folosește PDF, JPG sau PNG." }, { status: 400 });
  if (file.size > 15 * 1024 * 1024)
    return NextResponse.json({ error: "Fișierul depășește 15 MB." }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

  // ── 1. Upload to Supabase Storage ────────────────────────────────────────────
  let documentUrl: string | null = null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ?? process.env.SUPABASE_ANON_KEY
    ?? "";

  if (supabaseUrl && supabaseKey) {
    try {
      const client = createClient(supabaseUrl, supabaseKey);
      const ext = file.name.split(".").pop() ?? "pdf";
      const safeName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 50);
      const path = `associations/${associationId}/facturi/${Date.now()}_${safeName}.${ext}`;
      const { error: upErr } = await client.storage
        .from("documents")
        .upload(path, Buffer.from(bytes), { contentType: file.type, cacheControl: "3600", upsert: false });
      if (!upErr) {
        const { data } = client.storage.from("documents").getPublicUrl(path);
        documentUrl = data.publicUrl;
      } else {
        console.warn("[facturi/upload] Supabase upload error:", upErr.message);
      }
    } catch (e) {
      console.warn("[facturi/upload] Supabase error:", e);
    }
  }

  // ── 2. OCR with Claude ────────────────────────────────────────────────────────
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let extracted: Record<string, unknown> = {};

  try {
    let message;
    if (file.type === "application/pdf") {
      message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: base64 },
            } as Anthropic.DocumentBlockParam,
            { type: "text", text: PROMPT },
          ],
        }],
      });
    } else {
      const mediaType = (
        file.type === "image/png"  ? "image/png"  :
        file.type === "image/webp" ? "image/webp" :
        file.type === "image/gif"  ? "image/gif"  : "image/jpeg"
      ) as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

      message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: PROMPT },
          ],
        }],
      });
    }

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const m = text.match(/\{[\s\S]*\}/);
    if (m) extracted = JSON.parse(m[0]);
  } catch (err) {
    console.error("[facturi/upload] OCR error:", err);
    // Return without OCR data but with URL if available
    return NextResponse.json({
      success: true,
      documentUrl,
      ocrError: "OCR a eșuat, dar fișierul a fost încărcat. Completați manual detaliile.",
      data: {},
    });
  }

  return NextResponse.json({ success: true, documentUrl, data: extracted });
}
