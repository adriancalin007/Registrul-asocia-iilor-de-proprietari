// src/app/api/facturi/[id]/route.ts — Update and delete invoices
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { z } from "zod";

const MANAGER_ROLES = [UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[];
interface Params { params: { id: string } }

const PatchSchema = z.object({
  invoiceNumber: z.string().optional(),
  invoiceDate:   z.string().optional(),
  dueDate:       z.string().optional(),
  totalAmount:   z.number().optional(),
  vatAmount:     z.number().optional(),
  netAmount:     z.number().optional(),
  currency:      z.string().optional(),
  supplierId:    z.string().optional().nullable(),
  supplierName:  z.string().optional(),
  supplierCui:   z.string().optional(),
  iban:          z.string().optional().nullable(),
  category:      z.string().optional(),
  description:   z.string().optional(),
  documentUrl:   z.string().optional(),
  month:         z.number().int().min(1).max(12).optional(),
  year:          z.number().int().optional(),
  ocrProcessed:  z.boolean().optional(),
  ocrRawData:    z.unknown().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!MANAGER_ROLES.includes(session.user.role as UserRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = PatchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const { invoiceDate, dueDate, ocrRawData, ...rest } = parsed.data;

  const invoice = await prisma.invoice.update({
    where: { id: params.id },
    data: {
      ...rest,
      invoiceDate: invoiceDate !== undefined ? (invoiceDate ? new Date(invoiceDate) : null) : undefined,
      dueDate:     dueDate     !== undefined ? (dueDate     ? new Date(dueDate)     : null) : undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ocrRawData:  ocrRawData !== undefined ? (ocrRawData as any) : undefined,
    },
    include: { supplier: { select: { id: true, companyName: true } } },
  });

  return NextResponse.json({ success: true, invoice });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!MANAGER_ROLES.includes(session.user.role as UserRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Unlink from any expenses first
  await prisma.expense.updateMany({
    where: { invoiceId: params.id },
    data: { invoiceId: null },
  });

  await prisma.invoice.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
