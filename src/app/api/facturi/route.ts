// src/app/api/facturi/route.ts — List and create invoices
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import { z } from "zod";

const MANAGER_ROLES = [UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[];

async function resolveAssociationId(userId: string, role: UserRole): Promise<string | null> {
  const cookieStore = cookies();
  let id: string | null = cookieStore.get("asociatie_activa")?.value ?? null;
  if (!id) {
    const mandate = await prisma.mandate.findFirst({ where: { userId, isActive: true } });
    id = mandate?.associationId ?? null;
  }
  return id;
}

const InvoiceSchema = z.object({
  invoiceNumber: z.string().optional(),
  invoiceDate:   z.string().optional(),
  dueDate:       z.string().optional(),
  totalAmount:   z.number().optional(),
  vatAmount:     z.number().optional(),
  netAmount:     z.number().optional(),
  currency:      z.string().default("RON"),
  supplierId:    z.string().optional(),
  supplierName:  z.string().optional(),
  supplierCui:   z.string().optional(),
  iban:          z.string().optional(),
  category:      z.string().optional(),
  description:   z.string().optional(),
  documentUrl:   z.string().optional(),
  month:         z.number().int().min(1).max(12),
  year:          z.number().int().min(2020).max(2100),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!MANAGER_ROLES.includes(session.user.role as UserRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const associationId = await resolveAssociationId(session.user.id, session.user.role as UserRole);
  if (!associationId) return NextResponse.json({ error: "No active association" }, { status: 400 });

  const url = new URL(req.url);
  const month = url.searchParams.get("month") ? parseInt(url.searchParams.get("month")!) : undefined;
  const year  = url.searchParams.get("year")  ? parseInt(url.searchParams.get("year")!)  : undefined;

  const invoices = await prisma.invoice.findMany({
    where: {
      associationId,
      ...(month != null && year != null ? { month, year } : {}),
    },
    include: {
      supplier: { select: { id: true, companyName: true, fiscalCode: true } },
      _count: { select: { expenses: true } },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }, { invoiceDate: "desc" }],
  });

  return NextResponse.json(invoices);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!MANAGER_ROLES.includes(session.user.role as UserRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const associationId = await resolveAssociationId(session.user.id, session.user.role as UserRole);
  if (!associationId) return NextResponse.json({ error: "No active association" }, { status: 400 });

  const parsed = InvoiceSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const { invoiceDate, dueDate, supplierId, ...rest } = parsed.data;

  const invoice = await prisma.invoice.create({
    data: {
      associationId,
      uploadedBy: session.user.id,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
      dueDate:     dueDate     ? new Date(dueDate)     : null,
      supplierId:  supplierId  || null,
      ...rest,
    },
    include: { supplier: { select: { id: true, companyName: true } } },
  });

  return NextResponse.json({ success: true, invoice });
}
