// src/app/api/facturi/[id]/ocr/route.ts — Process OCR on a saved invoice URL
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import Anthropic from "@anthropic-ai/sdk";

const MANAGER_ROLES = [UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[];
interface Params { params: { id: string } }

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
  "totalAmount": valoarea totală (cu TVA dacă nu e separat),
  "vatAmount": valoarea TVA separată sau null,
  "netAmount": valoarea fără TVA sau null,
  "currency": "RON sau EUR sau altă monedă",
  "description": "o scurtă descriere a serviciului/produsului facturat",
  "category": "una din: Apă și canal / Energie electrică / Gaze naturale / Termoficare / Căldură / Instalații sanitare / Instalații electrice / Lift / Reparații / Curățenie / Administrare / Salarii / Dezinsecție / Deratizare / Altele"
}`;

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!MANAGER_ROLES.includes(session.user.role as UserRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!process.env.ANTHROPIC_API_KEY)
    return NextResponse.json({ error: "ANTHROPIC_API_KEY nu este configurat" }, { status: 503 });

  const invoice = await prisma.invoice.findUnique({ where: { id: params.id } });
  if (!invoice) return NextResponse.json({ error: "Factură negăsită" }, { status: 404 });
  if (!invoice.documentUrl)
    return NextResponse.json({ error: "Factura nu are un URL de document atașat" }, { status: 400 });

  // Convert Google Drive share URLs to direct download
  let imageUrl = invoice.documentUrl;
  const driveMatch = imageUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    imageUrl = `https://drive.google.com/uc?id=${driveMatch[1]}&export=view`;
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    // Fetch the image server-side to get around CORS and auth issues
    const fetchRes = await fetch(imageUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!fetchRes.ok) {
      return NextResponse.json({
        error: `Nu am putut accesa documentul (${fetchRes.status}). Asigurați-vă că URL-ul este public și accesibil.`,
      }, { status: 422 });
    }

    const contentType = fetchRes.headers.get("content-type") ?? "image/jpeg";
    const buffer = await fetchRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    const isPdf = contentType.includes("pdf");
    let message;

    if (isPdf) {
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
        contentType.includes("png") ? "image/png" :
        contentType.includes("webp") ? "image/webp" :
        contentType.includes("gif") ? "image/gif" : "image/jpeg"
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
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "Nu am putut extrage datele din factură" }, { status: 422 });

    const extracted = JSON.parse(jsonMatch[0]);

    // Save OCR results back to the invoice
    const updated = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        ocrProcessed:  true,
        ocrRawData:    extracted,
        invoiceNumber: extracted.invoiceNumber ?? invoice.invoiceNumber ?? null,
        invoiceDate:   extracted.invoiceDate   ? new Date(extracted.invoiceDate) : invoice.invoiceDate,
        dueDate:       extracted.dueDate        ? new Date(extracted.dueDate)    : invoice.dueDate,
        totalAmount:   extracted.totalAmount    ?? invoice.totalAmount   ?? null,
        vatAmount:     extracted.vatAmount      ?? invoice.vatAmount     ?? null,
        netAmount:     extracted.netAmount      ?? invoice.netAmount     ?? null,
        currency:      extracted.currency       ?? invoice.currency,
        supplierName:  extracted.supplierName   ?? invoice.supplierName  ?? null,
        supplierCui:   extracted.supplierCui    ?? invoice.supplierCui   ?? null,
        description:   extracted.description    ?? invoice.description   ?? null,
        category:      extracted.category       ?? invoice.category      ?? null,
      },
      include: { supplier: { select: { id: true, companyName: true } } },
    });

    return NextResponse.json({ success: true, invoice: updated, extracted });
  } catch (err: unknown) {
    console.error("OCR error:", err);
    const msg = err instanceof Error ? err.message : "Eroare la procesarea facturii";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
