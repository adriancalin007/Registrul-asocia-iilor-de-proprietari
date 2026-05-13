// src/app/api/uat/import/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";

interface ImportRow {
  AssociationName: string;
  AssociationFiscalCode: string;
  AssociationAddress: string;
  AssociationNeighborhood?: string;
  BuildingName?: string;
  BuildingAddress: string;
  BuildingStaircases?: string | number;
  BuildingYear?: string | number;
  UnitNumber: string;
  UnitFloor?: string | number;
  UnitArea_m2?: string | number;
  UnitShareRatio_pct?: string | number;
  OwnerFullName: string;
  OwnerEmail: string;
  OwnerPhone?: string;
  OwnerType?: string;
  OwnershipStart: string;
  [key: string]: unknown;
}

function str(v: unknown): string {
  return v != null ? String(v).trim() : "";
}

function num(v: unknown): number | undefined {
  const n = parseFloat(String(v ?? ""));
  return isNaN(n) ? undefined : n;
}

function numInt(v: unknown): number | undefined {
  const n = parseInt(String(v ?? ""), 10);
  return isNaN(n) ? undefined : n;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (role !== UserRole.UAT_OPERATOR && role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let uatId = session.user.uatId as string | undefined;

  // SUPER_ADMIN has no uatId in session — resolve from DB
  if (!uatId && role === UserRole.SUPER_ADMIN) {
    const firstUat = await prisma.uAT.findFirst({ select: { id: true } });
    uatId = firstUat?.id;
  }

  if (!uatId) {
    return NextResponse.json({ error: "No UAT linked to this account" }, { status: 400 });
  }

  // ── Parse multipart form ───────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Could not parse form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer" });

  // Use the sheet named "Data" or fall back to first sheet
  const sheetName = wb.SheetNames.includes("Data") ? "Data" : wb.SheetNames[0];
  if (!sheetName) return NextResponse.json({ error: "Empty workbook" }, { status: 400 });

  const ws = wb.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<ImportRow>(ws, { defval: "" });

  // Strip the header comment rows (rows where AssociationFiscalCode isn't a number-like string)
  const rows = rawRows.filter(r => {
    const code = str(r["AssociationFiscalCode*"] ?? r.AssociationFiscalCode);
    return code && /^\d{4,10}$/.test(code.replace(/\s/g, ""));
  });

  if (rows.length === 0) {
    return NextResponse.json({ error: "No valid data rows found. Check that the Data sheet is filled in." }, { status: 400 });
  }

  // ── Validate required fields ───────────────────────────────────────────
  const errors: string[] = [];
  rows.forEach((r, i) => {
    const rowNum = i + 2; // 1-indexed + header
    const assocName  = str(r["AssociationName*"]       ?? r.AssociationName);
    const fiscalCode = str(r["AssociationFiscalCode*"] ?? r.AssociationFiscalCode);
    const assocAddr  = str(r["AssociationAddress*"]    ?? r.AssociationAddress);
    const bldgAddr   = str(r["BuildingAddress*"]       ?? r.BuildingAddress);
    const unitNum    = str(r["UnitNumber*"]            ?? r.UnitNumber);
    const ownerName  = str(r["OwnerFullName*"]         ?? r.OwnerFullName);
    const ownerEmail = str(r["OwnerEmail*"]            ?? r.OwnerEmail);
    const ownerStart = str(r["OwnershipStart*"]        ?? r.OwnershipStart);

    if (!assocName)  errors.push(`Row ${rowNum}: AssociationName is required`);
    if (!fiscalCode) errors.push(`Row ${rowNum}: AssociationFiscalCode is required`);
    if (!assocAddr)  errors.push(`Row ${rowNum}: AssociationAddress is required`);
    if (!bldgAddr)   errors.push(`Row ${rowNum}: BuildingAddress is required`);
    if (!unitNum)    errors.push(`Row ${rowNum}: UnitNumber is required`);
    if (!ownerName)  errors.push(`Row ${rowNum}: OwnerFullName is required`);
    if (!ownerEmail) errors.push(`Row ${rowNum}: OwnerEmail is required`);
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
      errors.push(`Row ${rowNum}: OwnerEmail "${ownerEmail}" is not a valid email`);
    }
    if (!ownerStart) errors.push(`Row ${rowNum}: OwnershipStart is required (YYYY-MM-DD)`);
    else if (isNaN(Date.parse(ownerStart))) {
      errors.push(`Row ${rowNum}: OwnershipStart "${ownerStart}" is not a valid date`);
    }
  });

  if (errors.length > 0) {
    return NextResponse.json({ error: "Validation failed", errors }, { status: 422 });
  }

  // ── Process import ─────────────────────────────────────────────────────
  const summary = {
    associations: { created: 0, updated: 0 },
    buildings:    { created: 0, existing: 0 },
    units:        { created: 0, existing: 0 },
    users:        { created: 0, existing: 0 },
    ownerships:   { created: 0, existing: 0 },
  };

  // Normalise row field names (handle both "*" suffixed headers and plain headers)
  function g(row: ImportRow, plain: string): string {
    return str(row[`${plain}*`] ?? row[plain]);
  }

  // Cache maps to avoid redundant DB calls within this import batch
  const assocCache   = new Map<string, string>(); // fiscalCode → associationId
  const buildingCache = new Map<string, string>(); // `${assocId}::${addr}` → buildingId
  const unitCache    = new Map<string, string>(); // `${buildingId}::${num}` → unitId
  const userCache    = new Map<string, string>(); // email → userId

  for (const row of rows) {
    const fiscalCode = g(row, "AssociationFiscalCode").replace(/\s/g, "");
    const assocName  = g(row, "AssociationName");
    const assocAddr  = g(row, "AssociationAddress");
    const assocNbhd  = str(row["AssociationNeighborhood"] ?? row.AssociationNeighborhood);

    // ── Association ──────────────────────────────────────────────────────
    let assocId = assocCache.get(fiscalCode);
    if (!assocId) {
      const existing = await prisma.association.findUnique({ where: { fiscalCode } });
      if (existing) {
        assocId = existing.id;
        summary.associations.updated++;
      } else {
        const created = await prisma.association.create({
          data: {
            uatId,
            name: assocName,
            fiscalCode,
            address: assocAddr,
            neighborhood: assocNbhd || undefined,
            status: "ACTIVE",
          },
        });
        assocId = created.id;
        summary.associations.created++;
      }
      assocCache.set(fiscalCode, assocId);
    }

    // ── Building ─────────────────────────────────────────────────────────
    const bldgAddr      = g(row, "BuildingAddress");
    const bldgName      = str(row["BuildingName"] ?? row.BuildingName) || assocName;
    const bldgStairs    = numInt(row["BuildingStaircases"] ?? row.BuildingStaircases) ?? 1;
    const bldgYear      = numInt(row["BuildingYear"] ?? row.BuildingYear);
    const bldgCacheKey  = `${assocId}::${bldgAddr}`;

    let buildingId = buildingCache.get(bldgCacheKey);
    if (!buildingId) {
      const existing = await prisma.building.findFirst({
        where: { associationId: assocId, address: bldgAddr },
      });
      if (existing) {
        buildingId = existing.id;
        summary.buildings.existing++;
      } else {
        const created = await prisma.building.create({
          data: {
            associationId: assocId,
            name: bldgName,
            address: bldgAddr,
            staircaseCount: bldgStairs,
            builtYear: bldgYear,
          },
        });
        buildingId = created.id;
        summary.buildings.created++;
      }
      buildingCache.set(bldgCacheKey, buildingId);
    }

    // ── Unit ─────────────────────────────────────────────────────────────
    const unitNum      = g(row, "UnitNumber");
    const unitFloor    = numInt(row["UnitFloor"] ?? row.UnitFloor);
    const unitArea     = num(row["UnitArea_m2"] ?? row.UnitArea_m2);
    const unitShare    = num(row["UnitShareRatio_pct"] ?? row.UnitShareRatio_pct);
    const unitCacheKey = `${buildingId}::${unitNum}`;

    let unitId = unitCache.get(unitCacheKey);
    if (!unitId) {
      const existing = await prisma.unit.findFirst({
        where: { buildingId, number: unitNum },
      });
      if (existing) {
        unitId = existing.id;
        summary.units.existing++;
      } else {
        const created = await prisma.unit.create({
          data: {
            buildingId,
            number: unitNum,
            floor: unitFloor,
            area: unitArea,
            shareRatio: unitShare,
          },
        });
        unitId = created.id;
        summary.units.created++;
      }
      unitCache.set(unitCacheKey, unitId);
    }

    // ── User ─────────────────────────────────────────────────────────────
    const ownerEmail = (str(row["OwnerEmail*"] ?? row.OwnerEmail)).toLowerCase();
    const ownerName  = g(row, "OwnerFullName");
    const ownerPhone = str(row["OwnerPhone"] ?? row.OwnerPhone) || undefined;
    const nameParts  = ownerName.split(" ");
    const firstName  = nameParts.slice(0, -1).join(" ") || ownerName;
    const lastName   = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

    let userId = userCache.get(ownerEmail);
    if (!userId) {
      const existing = await prisma.user.findUnique({ where: { email: ownerEmail } });
      if (existing) {
        userId = existing.id;
        summary.users.existing++;
      } else {
        // Create account with a random placeholder password — user must reset it
        const tempHash = await bcrypt.hash(`RESET_${Math.random().toString(36).slice(2)}`, 10);
        const created = await prisma.user.create({
          data: {
            email: ownerEmail,
            fullName: ownerName,
            firstName,
            lastName,
            phone: ownerPhone,
            passwordHash: tempHash,
            emailVerified: false,
            isActive: true,
          },
        });
        userId = created.id;
        summary.users.created++;
      }
      userCache.set(ownerEmail, userId);
    }

    // ── Ownership ─────────────────────────────────────────────────────────
    const ownerType  = (str(row["OwnerType"] ?? row.OwnerType) || "OWNER").toUpperCase();
    const startDate  = new Date(g(row, "OwnershipStart"));

    const existingOwnership = await prisma.ownership.findFirst({
      where: { unitId, userId, isActive: true },
    });
    if (existingOwnership) {
      summary.ownerships.existing++;
    } else {
      await prisma.ownership.create({
        data: {
          unitId,
          userId,
          type: ["OWNER","TENANT","CO_OWNER"].includes(ownerType) ? ownerType : "OWNER",
          startDate,
          isActive: true,
        },
      });
      summary.ownerships.created++;
    }
  }

  return NextResponse.json({
    success: true,
    rowsProcessed: rows.length,
    summary,
  });
}
