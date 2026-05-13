// src/app/api/servicii/just/dosare/route.ts
//
// Searches portal.just.ro for court cases linked to the authenticated user.
// Uses SOAP (plain HTTP — the HTTPS certificate is broken on the portal).
// CNP never leaves the server — only fullName is sent to Just.
// Rate-limited: 10 req / min / user.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { callExternal } from "@/lib/external-api";
import { XMLParser } from "fast-xml-parser";
import { z } from "zod";

const FALLBACK_URL = "https://portal.just.ro/SitePages/acasa.aspx";
const SOAP_URL = "http://portalquery.just.ro/query.asmx";

const BodySchema = z.object({
  numeParte: z.string().min(3).max(200).optional(),
});

export interface JustDosar {
  numarDosar: string;
  obiect: string;
  institutie: string;
  stadiu: string;
  dataUltimeiActiuni: string;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!checkRateLimit(`${session.user.id}:just`, 10, 60_000)) {
    return NextResponse.json({ error: "Prea multe cereri. Încearcă din nou peste un minut." }, { status: 429 });
  }

  // Caller may pass a custom numeParte; if absent, fall back to the DB full name
  const body = BodySchema.safeParse(await req.json().catch(() => ({})));
  let numeParte = body.success ? (body.data.numeParte ?? null) : null;

  if (!numeParte) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { fullName: true },
    });
    numeParte = user?.fullName ?? null;
  }

  if (!numeParte) {
    return NextResponse.json({
      success: false,
      data: null,
      fallbackUrl: FALLBACK_URL,
      userMessage: "Nu am putut determina numele tău. Poți căuta manual pe portal.just.ro.",
    });
  }

  const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema"
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <CautareDosare xmlns="http://portalquery.just.ro/">
      <numeParte>${escapeXml(numeParte)}</numeParte>
      <obiectDosar></obiectDosar>
      <numărInstanta></numărInstanta>
      <dataStart></dataStart>
      <dataStop></dataStop>
    </CautareDosare>
  </soap:Body>
</soap:Envelope>`;

  const result = await callExternal<JustDosar[]>(
    "Just",
    async () => {
      const res = await fetch(SOAP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: "http://portalquery.just.ro/CautareDosare",
        },
        body: soapEnvelope,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      return parseDosare(xml);
    },
    FALLBACK_URL,
  );

  return NextResponse.json(result);
}

/** Parses the SOAP XML response into a flat array of dosare. */
function parseDosare(xml: string): JustDosar[] {
  const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });
  const doc = parser.parse(xml);

  // Navigate: Envelope > Body > CautareDosareResponse > CautareDosareResult > DocarInfo[]
  const result =
    doc?.Envelope?.Body?.CautareDosareResponse?.CautareDosareResult?.DocarInfo;

  if (!result) return [];
  const items = Array.isArray(result) ? result : [result];

  return items.map((item: Record<string, string>) => ({
    numarDosar:           item.numarDosar         ?? "",
    obiect:               item.obiectDosar         ?? "",
    institutie:           item.numărInstanta       ?? "",
    stadiu:               item.stadiuProces        ?? "",
    dataUltimeiActiuni:   item.dataUltimeiActiuni  ?? "",
  }));
}

/** Minimal XML escaping to prevent injection in the SOAP body. */
function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
