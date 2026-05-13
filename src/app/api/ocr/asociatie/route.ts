// src/app/api/ocr/asociatie/route.ts
// Extracts structured fields from registration documents using Claude vision.
// CNP is NEVER extracted and must never appear in responses.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import { checkRateLimit } from "@/lib/rate-limit";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/** Fields that can be populated for each document type */
const DOC_FIELDS: Record<string, string[]> = {
  cui:              ["name", "fiscalCode", "address"],
  statute:          ["name", "fiscalCode", "address", "unitCount", "staircaseCount"],
  courtReg:         ["name", "fiscalCode"],
  presidentMandate: ["presidentLastName", "presidentFirstName", "presidentPhone", "presidentEmail"],
  presidentId:      ["presidentLastName", "presidentFirstName"],
  memberCI:         ["lastName", "firstName"],
};

const DOC_PROMPTS: Record<string, string> = {
  cui: "Aceasta este o copie după certificatul de înregistrare fiscală (CUI/CIF) sau certificatul de înregistrare a asociației de proprietari. Extrage: denumirea completă a asociației, codul fiscal/CIF (cifre, fără prefix RO), adresa sediului.",
  statute: "Acesta este statutul asociației de proprietari. Extrage: denumirea completă, codul fiscal dacă este menționat, adresa sediului, numărul de apartamente și numărul de scări dacă sunt menționate.",
  courtReg: "Acesta este un document de înregistrare judecătoresc al asociației de proprietari. Extrage: denumirea completă și codul fiscal dacă este menționat.",
  presidentMandate: "Acesta este un contract de mandat al președintelui comitetului executiv al asociației de proprietari. Extrage: numele de familie și prenumele președintelui, numărul de telefon și adresa de email dacă sunt menționate.",
  presidentId: "Aceasta este o copie a cărții de identitate a președintelui comitetului executiv. Extrage DOAR: numele de familie și prenumele. NU extrage CNP, serie CI, adresă sau alte date personale.",
  memberCI: "Aceasta este o copie a cărții de identitate a unui membru al comitetului executiv. Extrage DOAR: numele de familie și prenumele. NU extrage CNP, serie CI, adresă sau alte date personale.",
};

const EXTRACT_TOOL: Anthropic.Tool = {
  name: "extract_fields",
  description: "Extrage câmpuri structurate dintr-un document scanat al asociației de proprietari. Pune string gol pentru câmpurile care nu se găsesc în document.",
  input_schema: {
    type: "object",
    properties: {
      name:               { type: "string", description: "Denumirea completă a asociației de proprietari" },
      fiscalCode:         { type: "string", description: "Codul fiscal (CIF) al asociației, doar cifre fără prefix RO" },
      address:            { type: "string", description: "Adresa sediului asociației" },
      unitCount:          { type: "string", description: "Numărul total de apartamente/unități locative" },
      staircaseCount:     { type: "string", description: "Numărul de scări/intrări ale blocului" },
      presidentLastName:  { type: "string", description: "Numele de familie al președintelui comitetului executiv" },
      presidentFirstName: { type: "string", description: "Prenumele președintelui comitetului executiv" },
      presidentPhone:     { type: "string", description: "Numărul de telefon al președintelui" },
      presidentEmail:     { type: "string", description: "Adresa de email al președintelui" },
      lastName:           { type: "string", description: "Numele de familie al persoanei (pentru membrii comitetului)" },
      firstName:          { type: "string", description: "Prenumele persoanei (pentru membrii comitetului)" },
    },
    required: [
      "name", "fiscalCode", "address", "unitCount", "staircaseCount",
      "presidentLastName", "presidentFirstName", "presidentPhone", "presidentEmail",
      "lastName", "firstName",
    ],
  },
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Neautorizat" }, { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "OCR indisponibil" }, { status: 503 });
  }

  if (!checkRateLimit(`${session.user.id}:ocr`, 10, 60_000)) {
    return NextResponse.json({ error: "Prea multe cereri. Așteptați un minut." }, { status: 429 });
  }

  let body: { url: string; mimeType: string; docType: string; memberIndex?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body invalid" }, { status: 400 });
  }

  const { url, mimeType, docType, memberIndex } = body;

  if (!url || !mimeType || !docType || !DOC_FIELDS[docType]) {
    return NextResponse.json({ error: "Parametri lipsă sau docType invalid" }, { status: 400 });
  }

  // Word documents (.doc/.docx) cannot be read by Claude vision — return empty gracefully
  if (mimeType.includes("word") || mimeType.includes("officedocument")) {
    return NextResponse.json({ fields: {}, memberIndex });
  }

  // Fetch file server-side to avoid CORS and auth issues
  let base64Data: string;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    base64Data = Buffer.from(await resp.arrayBuffer()).toString("base64");
  } catch (err) {
    console.error("[OCR] fetch error:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "Nu s-a putut descărca fișierul" }, { status: 502 });
  }

  const isPdf = mimeType === "application/pdf";
  const contentBlock = isPdf
    ? ({
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64Data },
      } as Anthropic.DocumentBlockParam)
    : ({
        type: "image",
        source: {
          type: "base64",
          media_type: mimeType as "image/jpeg" | "image/png" | "image/webp",
          data: base64Data,
        },
      } as Anthropic.ImageBlockParam);

  const relevantFields = DOC_FIELDS[docType].join(", ");
  const promptText = DOC_PROMPTS[docType] ?? "Extrage informațiile disponibile din document.";

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      tools: [EXTRACT_TOOL],
      tool_choice: { type: "tool", name: "extract_fields" },
      messages: [{
        role: "user",
        content: [
          contentBlock,
          {
            type: "text",
            text: `${promptText}\n\nCompletează DOAR câmpurile: ${relevantFields}. Pune string gol "" pentru câmpurile care nu se găsesc. Nu extrage niciodată CNP-ul sau seria cărții de identitate.`,
          },
        ],
      }],
    });

    const toolUse = response.content.find(b => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json({ fields: {}, memberIndex });
    }

    const raw = toolUse.input as Record<string, string>;
    const fields: Record<string, string> = {};
    for (const key of DOC_FIELDS[docType]) {
      const val = raw[key];
      if (typeof val === "string" && val.trim()) {
        fields[key] = val.trim();
      }
    }

    return NextResponse.json({ fields, memberIndex });
  } catch (err) {
    console.error("[OCR] Claude error:", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ error: "Eroare la analiza documentului" }, { status: 500 });
  }
}
