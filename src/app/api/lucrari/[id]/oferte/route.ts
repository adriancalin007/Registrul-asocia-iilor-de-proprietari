// src/app/api/lucrari/[id]/oferte/route.ts — Get and submit quotes for a work
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { z } from "zod";

const MANAGER_ROLES = [UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[];
interface Params { params: { id: string } }

const QuoteSchema = z.object({
  supplierId:       z.string().min(1),
  price:            z.number().positive(),
  leadDays:         z.number().int().min(1),
  requiresSiteVisit: z.boolean().default(false),
  siteVisitNotes:   z.string().optional(),
  description:      z.string().optional(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quotes = await prisma.quote.findMany({
    where: { rfqId: params.id },
    include: {
      supplier: {
        select: { id: true, companyName: true, fiscalCode: true, phone: true, email: true,
          ratings: { select: { score: true, raterRole: true } } },
      },
    },
    orderBy: { price: "asc" },
  });

  return NextResponse.json(quotes);
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  // Managers add quotes on behalf of suppliers; suppliers with accounts submit their own
  const isManager = MANAGER_ROLES.includes(role);
  const isSupplier = role === UserRole.SUPPLIER;
  if (!isManager && !isSupplier) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = QuoteSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  // If supplier is submitting their own, verify it matches their account
  if (isSupplier) {
    const supplier = await prisma.supplier.findFirst({ where: { userId: session.user.id } });
    if (!supplier || supplier.id !== parsed.data.supplierId)
      return NextResponse.json({ error: "Nu puteți depune ofertă în numele altui furnizor" }, { status: 403 });
  }

  const quote = await prisma.quote.upsert({
    where: { rfqId_supplierId: { rfqId: params.id, supplierId: parsed.data.supplierId } },
    create: { rfqId: params.id, ...parsed.data },
    update: { ...parsed.data },
  });

  return NextResponse.json({ success: true, quote });
}
