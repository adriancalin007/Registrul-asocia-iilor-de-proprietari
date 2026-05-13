import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { z } from "zod";

const ALLOWED = [UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[];

const RowSchema = z.object({
  buildingId:       z.string().min(1),
  number:           z.string().min(1),
  floor:            z.number().int().optional(),
  area:             z.number().positive().optional(),
  shareRatio:       z.number().positive().optional(),
  residents:        z.number().int().min(0).optional(),
  heatingType:      z.enum(["DISTRICT", "CENTRALIZED", "INDIVIDUAL", "NONE"]).optional(),
  isCompanyHQ:      z.boolean().optional(),
  companyName:      z.string().optional(),
  companyCUI:       z.string().optional(),
  customAttributes: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

const ImportSchema = z.object({
  rows: z.array(RowSchema).min(1).max(500),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role as UserRole;
  if (!ALLOWED.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = ImportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const results = { created: 0, skipped: 0, errors: [] as string[] };

  for (const row of parsed.data.rows) {
    const existing = await prisma.unit.findFirst({
      where: { buildingId: row.buildingId, number: row.number },
    });
    if (existing) {
      results.skipped++;
      continue;
    }
    try {
      await prisma.unit.create({ data: row });
      results.created++;
    } catch {
      results.errors.push(`Ap. ${row.number}: eroare la creare`);
    }
  }

  return NextResponse.json({ success: true, ...results });
}
