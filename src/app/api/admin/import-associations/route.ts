// src/app/api/admin/import-associations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, AssociationStatus } from "@prisma/client";
import { parseAssociationsXlsx, type AssociationRow } from "@/lib/import-associations";
import { logUATAudit, getClientIp } from "@/lib/audit";

const ALLOWED_ROLES = [UserRole.SUPER_ADMIN] as UserRole[];

async function resolveUat(userId: string, role: UserRole) {
  if (role === UserRole.SUPER_ADMIN) {
    return prisma.uAT.findFirst();
  }
  const op = await prisma.uATOperator.findUnique({ where: { userId } });
  if (!op) return null;
  return prisma.uAT.findUnique({ where: { id: op.uatId } });
}

// POST — parse + optionally commit
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role as UserRole;
  if (!ALLOWED_ROLES.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const uat = await resolveUat(session.user.id, role);
  if (!uat) return NextResponse.json({ error: "UAT not found" }, { status: 500 });

  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: "Invalid form data" }, { status: 400 }); }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Niciun fișier atașat" }, { status: 400 });

  const mode = (formData.get("mode") as string | null) ?? "preview";

  let rows: AssociationRow[];
  let warnings: string[];
  let skipped: number;

  try {
    const buf = await file.arrayBuffer();
    const result = parseAssociationsXlsx(buf);
    rows = result.rows;
    warnings = result.warnings;
    skipped = result.skipped;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  if (mode === "preview") {
    return NextResponse.json({
      total: rows.length,
      skipped,
      warnings,
      preview: rows.slice(0, 20),
    });
  }

  // ── commit mode ──────────────────────────────────────────────────────────────
  const batchId = `import-${Date.now()}`;
  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      if (row.courtDossierNumber) {
        // Upsert by court dossier number
        const existing = await prisma.association.findUnique({
          where: { courtDossierNumber: row.courtDossierNumber },
        });
        if (existing) {
          await prisma.association.update({
            where: { courtDossierNumber: row.courtDossierNumber },
            data: {
              name:              row.name,
              status:            row.status,
              address:           row.address,
              registrationNumber: row.registrationNumber ?? undefined,
              registrationYear:   row.registrationYear ?? undefined,
              dissolutionNote:    row.dissolutionNote ?? undefined,
              rawAddress:         row.rawAddress ?? undefined,
              streetType:         row.streetType ?? undefined,
              streetName:         row.streetName ?? undefined,
              streetNumber:       row.streetNumber ?? undefined,
              blockLabel:         row.blockLabel ?? undefined,
              staircaseLabel:     row.staircaseLabel ?? undefined,
              importBatch:        batchId,
              importedAt:         new Date(),
            },
          });
          updated++;
        } else {
          await prisma.association.create({
            data: {
              uatId:              uat.id,
              name:               row.name,
              address:            row.address,
              status:             row.status as AssociationStatus,
              courtDossierNumber: row.courtDossierNumber,
              registrationNumber: row.registrationNumber ?? null,
              registrationYear:   row.registrationYear ?? null,
              dissolutionNote:    row.dissolutionNote ?? null,
              rawAddress:         row.rawAddress ?? null,
              streetType:         row.streetType ?? null,
              streetName:         row.streetName ?? null,
              streetNumber:       row.streetNumber ?? null,
              blockLabel:         row.blockLabel ?? null,
              staircaseLabel:     row.staircaseLabel ?? null,
              importBatch:        batchId,
              importedAt:         new Date(),
            },
          });
          created++;
        }
      } else {
        // No dossier number — try match by name (fuzzy is too risky, use exact)
        const existing = await prisma.association.findFirst({
          where: { name: row.name, uatId: uat.id },
        });
        if (existing) {
          await prisma.association.update({
            where: { id: existing.id },
            data: {
              status:          row.status,
              address:         row.address,
              registrationNumber: row.registrationNumber ?? undefined,
              registrationYear:   row.registrationYear ?? undefined,
              dissolutionNote:    row.dissolutionNote ?? undefined,
              rawAddress:         row.rawAddress ?? undefined,
              streetType:         row.streetType ?? undefined,
              streetName:         row.streetName ?? undefined,
              streetNumber:       row.streetNumber ?? undefined,
              blockLabel:         row.blockLabel ?? undefined,
              staircaseLabel:     row.staircaseLabel ?? undefined,
              importBatch:        batchId,
              importedAt:         new Date(),
            },
          });
          updated++;
        } else {
          await prisma.association.create({
            data: {
              uatId:             uat.id,
              name:              row.name,
              address:           row.address,
              status:            row.status as AssociationStatus,
              registrationNumber: row.registrationNumber ?? null,
              registrationYear:   row.registrationYear ?? null,
              dissolutionNote:    row.dissolutionNote ?? null,
              rawAddress:         row.rawAddress ?? null,
              streetType:         row.streetType ?? null,
              streetName:         row.streetName ?? null,
              streetNumber:       row.streetNumber ?? null,
              blockLabel:         row.blockLabel ?? null,
              staircaseLabel:     row.staircaseLabel ?? null,
              importBatch:        batchId,
              importedAt:         new Date(),
            },
          });
          created++;
        }
      }
    } catch (e) {
      errors.push(`Rând "${row.name}": ${(e as Error).message}`);
    }
  }

  // Create import log
  const importLog = await prisma.importLog.create({
    data: {
      uatId:       uat.id,
      importedBy:  session.user.id,
      fileName:    file.name,
      rowsTotal:   rows.length,
      rowsCreated: created,
      rowsUpdated: updated,
      rowsSkipped: skipped,
      errors,
    },
  });

  await logUATAudit({
    userId:    session.user.id,
    uatId:     uat.id,
    action:    "IMPORT",
    resource:  "Association",
    resourceId: importLog.id,
    ipAddress: getClientIp(req),
    metadata:  { fileName: file.name, created, updated, skipped, errors: errors.length },
  });

  return NextResponse.json({ success: true, batchId, created, updated, skipped, errors, warnings, importLogId: importLog.id });
}

// GET — list import logs
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.user.role as UserRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const uat = await resolveUat(session.user.id, session.user.role as UserRole);
  if (!uat) return NextResponse.json([], { status: 200 });

  void req;
  const logs = await prisma.importLog.findMany({
    where:   { uatId: uat.id },
    include: { importer: { select: { fullName: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take:    50,
  });

  return NextResponse.json(logs);
}
