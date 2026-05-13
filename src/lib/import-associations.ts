// src/lib/import-associations.ts
import * as XLSX from "xlsx";
import { AssociationStatus } from "@prisma/client";

// Column names as they appear in the official Excel file (case-insensitive match)
const COL = {
  regYear:       ["an înregistrare", "an inregistrare"],
  regNumber:     ["nr. înregistrare", "nr. inregistrare", "nr înregistrare"],
  name:          ["denumire asociație", "denumire asociatie", "denumire"],
  rawAddress:    ["sediu original", "sediu"],
  streetType:    ["tip arteră", "tip artera"],
  streetName:    ["nume arteră", "nume artera", "strada"],
  streetNumber:  ["număr stradă", "numar strada", "nr. stradă", "nr stradă"],
  blockLabel:    ["bloc"],
  staircaseLabel:["scară", "scara"],
  dossierNumber: ["nr. dosar", "nr dosar", "dosar"],
  dissolution:   ["obs. / mod. dizolvare", "obs / mod dizolvare", "obs. mod dizolvare", "dizolvare", "mod dizolvare"],
};

function findCol(headers: string[], candidates: string[]): string | null {
  const lower = headers.map(h => h.toLowerCase().trim());
  for (const c of candidates) {
    const idx = lower.findIndex(h => h.includes(c));
    if (idx !== -1) return headers[idx];
  }
  return null;
}

function str(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

function parseYear(val: unknown): number | null {
  const s = str(val);
  if (!s) return null;
  const m = s.match(/\d{4}/);
  return m ? parseInt(m[0]) : null;
}

function isDissolved(val: unknown): boolean {
  const s = str(val).toLowerCase();
  if (!s) return false;
  return s.includes("dizolvat") || s.includes("desfiintat") || s.includes("desființat") ||
    s.includes("radiat") || s.includes("lichidat");
}

export interface AssociationRow {
  name: string;
  registrationNumber: string | null;
  courtDossierNumber: string | null;
  registrationYear: number | null;
  dissolutionNote: string | null;
  status: AssociationStatus;
  rawAddress: string | null;
  streetType: string | null;
  streetName: string | null;
  streetNumber: string | null;
  blockLabel: string | null;
  staircaseLabel: string | null;
  // denormalized address for display
  address: string;
}

export interface ParseResult {
  rows: AssociationRow[];
  warnings: string[];
  skipped: number;
}

export function parseAssociationsXlsx(buffer: ArrayBuffer): ParseResult {
  const wb = XLSX.read(buffer, { type: "array" });

  // Prefer "Date" or "Data" sheet; fall back to first sheet
  const sheetName =
    wb.SheetNames.find(n => ["date", "data", "asociatii", "lista"].includes(n.toLowerCase()))
    ?? wb.SheetNames[0];

  if (!sheetName) throw new Error("Fișierul Excel nu conține nicio foaie.");

  const ws = wb.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  if (rawRows.length === 0) throw new Error("Foaia de calcul nu conține date.");

  const headers = Object.keys(rawRows[0]);

  // Resolve column mappings
  const colRegYear        = findCol(headers, COL.regYear);
  const colRegNumber      = findCol(headers, COL.regNumber);
  const colName           = findCol(headers, COL.name);
  const colRawAddress     = findCol(headers, COL.rawAddress);
  const colStreetType     = findCol(headers, COL.streetType);
  const colStreetName     = findCol(headers, COL.streetName);
  const colStreetNumber   = findCol(headers, COL.streetNumber);
  const colBlock          = findCol(headers, COL.blockLabel);
  const colStaircase      = findCol(headers, COL.staircaseLabel);
  const colDossier        = findCol(headers, COL.dossierNumber);
  const colDissolution    = findCol(headers, COL.dissolution);

  const warnings: string[] = [];
  if (!colName)    warnings.push("Coloana cu denumirea asociației nu a fost găsită.");
  if (!colDossier) warnings.push("Coloana cu nr. dosar judecătorie nu a fost găsită. Importul nu va fi idempotent.");

  const rows: AssociationRow[] = [];
  let skipped = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const r = rawRows[i];
    const rowNum = i + 2; // 1-indexed + header row

    const name = colName ? str(r[colName]) : "";
    if (!name) { skipped++; continue; }

    const dossierRaw = colDossier ? str(r[colDossier]) : "";
    const courtDossierNumber = dossierRaw || null;

    const dissolutionRaw = colDissolution ? str(r[colDissolution]) : "";
    const dissolved = isDissolved(dissolutionRaw);

    const streetType    = colStreetType    ? str(r[colStreetType])    : null;
    const streetName    = colStreetName    ? str(r[colStreetName])    : null;
    const streetNumber  = colStreetNumber  ? str(r[colStreetNumber])  : null;
    const blockLabel    = colBlock         ? str(r[colBlock])         : null;
    const staircaseLabel= colStaircase     ? str(r[colStaircase])     : null;

    // Build a denormalized address string for the `address` field
    const addrParts = [
      streetType && streetName ? `${streetType} ${streetName}` : streetName,
      streetNumber ? `nr. ${streetNumber}` : null,
      blockLabel   ? `bl. ${blockLabel}`   : null,
    ].filter(Boolean);
    const address = addrParts.length > 0
      ? addrParts.join(", ")
      : (colRawAddress ? str(r[colRawAddress]) : name);

    rows.push({
      name,
      registrationNumber: colRegNumber ? (str(r[colRegNumber]) || null) : null,
      courtDossierNumber,
      registrationYear:   parseYear(colRegYear ? r[colRegYear] : null),
      dissolutionNote:    dissolutionRaw || null,
      status:             dissolved ? AssociationStatus.DISSOLVED : AssociationStatus.OFFICIAL_REGISTRY,
      rawAddress:         colRawAddress ? (str(r[colRawAddress]) || null) : null,
      streetType:         streetType    || null,
      streetName:         streetName    || null,
      streetNumber:       streetNumber  || null,
      blockLabel:         blockLabel    || null,
      staircaseLabel:     staircaseLabel|| null,
      address,
    });

    void rowNum; // suppress unused warning
  }

  return { rows, warnings, skipped };
}
