// src/app/api/uat/import/template/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import * as XLSX from "xlsx";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (role !== UserRole.UAT_OPERATOR && role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Instructions ──────────────────────────────────────────────
  const instructions = [
    ["IMPORT TEMPLATE — Asociații de Proprietari · Sector 1"],
    [""],
    ["INSTRUCTIONS:"],
    ["1. Fill in the Data sheet. Each row = one apartment (unit) + its owner."],
    ["2. Rows for the same building share the same AssociationFiscalCode and BuildingAddress."],
    ["3. AssociationFiscalCode is used to match or create the association — it must be unique and correct."],
    ["4. OwnerEmail is used to create resident accounts. Each owner will receive a password-setup link."],
    ["5. Required fields are marked with * in the Data sheet header row."],
    ["6. OwnerType values: OWNER | TENANT | CO_OWNER (default: OWNER if left blank)"],
    ["7. OwnershipStart format: YYYY-MM-DD (e.g. 2020-01-15)"],
    ["8. UnitShareRatio_pct: percentage of common areas (e.g. 1.23 means 1.23%)"],
    [""],
    ["COLUMN REFERENCE:"],
    ["AssociationName*", "Full name of the association (e.g. Asociatia de Proprietari Bloc 12)"],
    ["AssociationFiscalCode*", "CUI / fiscal code (digits only, e.g. 12345678)"],
    ["AssociationAddress*", "Street address of the association headquarters"],
    ["AssociationNeighborhood", "Neighborhood (optional)"],
    ["BuildingName", "Building name / label (optional, defaults to association name)"],
    ["BuildingAddress*", "Street address of the building (can match AssociationAddress)"],
    ["BuildingStaircases", "Number of staircases (default: 1)"],
    ["BuildingYear", "Year of construction (optional, e.g. 1978)"],
    ["UnitNumber*", "Apartment / unit number (e.g. 12 or 12A)"],
    ["UnitFloor", "Floor number (0 = ground floor)"],
    ["UnitArea_m2", "Area in square metres (e.g. 65.5)"],
    ["UnitShareRatio_pct", "Share ratio in % (e.g. 1.23)"],
    ["OwnerFullName*", "Owner full name"],
    ["OwnerEmail*", "Owner e-mail — used to create portal account"],
    ["OwnerPhone", "Owner phone number (optional)"],
    ["OwnerType", "OWNER | TENANT | CO_OWNER (default: OWNER)"],
    ["OwnershipStart*", "Ownership start date YYYY-MM-DD"],
  ];

  const wsInstr = XLSX.utils.aoa_to_sheet(instructions);
  wsInstr["!cols"] = [{ wch: 30 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInstr, "Instructions");

  // ── Sheet 2: Data ──────────────────────────────────────────────────────
  const headers = [
    "AssociationName*",
    "AssociationFiscalCode*",
    "AssociationAddress*",
    "AssociationNeighborhood",
    "BuildingName",
    "BuildingAddress*",
    "BuildingStaircases",
    "BuildingYear",
    "UnitNumber*",
    "UnitFloor",
    "UnitArea_m2",
    "UnitShareRatio_pct",
    "OwnerFullName*",
    "OwnerEmail*",
    "OwnerPhone",
    "OwnerType",
    "OwnershipStart*",
  ];

  const exampleRows = [
    [
      "Asociatia de Proprietari Bloc 5",
      "12345678",
      "Str. Moxa, nr. 5",
      "Domenii",
      "Bloc 5",
      "Str. Moxa, nr. 5",
      "2",
      "1978",
      "1",
      "0",
      "68.5",
      "1.25",
      "Ion Popescu",
      "ion.popescu@example.com",
      "0721000001",
      "OWNER",
      "2010-03-01",
    ],
    [
      "Asociatia de Proprietari Bloc 5",
      "12345678",
      "Str. Moxa, nr. 5",
      "Domenii",
      "Bloc 5",
      "Str. Moxa, nr. 5",
      "2",
      "1978",
      "2",
      "1",
      "72.0",
      "1.31",
      "Maria Ionescu",
      "maria.ionescu@example.com",
      "0721000002",
      "OWNER",
      "2015-06-15",
    ],
    [
      "Asociatia de Proprietari Bloc 12",
      "87654321",
      "Calea Victoriei, nr. 12",
      "Centru",
      "Bloc 12",
      "Calea Victoriei, nr. 12",
      "1",
      "1965",
      "5",
      "2",
      "55.0",
      "0.98",
      "Gheorghe Dumitrescu",
      "g.dumitrescu@example.com",
      "0721000003",
      "OWNER",
      "2018-01-01",
    ],
  ];

  const wsData = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);
  wsData["!cols"] = headers.map(() => ({ wch: 26 }));

  // Style header row (bold) — xlsx doesn't support full styling in community edition,
  // but we can set cell metadata
  wsData["!rows"] = [{ hpt: 20 }];

  XLSX.utils.book_append_sheet(wb, wsData, "Data");

  // ── Output ─────────────────────────────────────────────────────────────
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="template-import-asociatii-sector1.xlsx"`,
    },
  });
}
