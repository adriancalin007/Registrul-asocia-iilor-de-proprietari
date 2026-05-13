// src/app/api/financiare/[id]/route.ts — Get period detail
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

interface Params { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (!([UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[]).includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const period = await prisma.expensePeriod.findUnique({
    where: { id: params.id },
    include: {
      expenses: { orderBy: { createdAt: "asc" } },
      meterReadings: {
        orderBy: { createdAt: "asc" },
        include: { unit: { select: { number: true } } },
      },
      paymentItems: {
        orderBy: { createdAt: "asc" },
        include: {
          ownership: {
            include: {
              user: { select: { fullName: true, email: true } },
              unit: { select: { number: true, floor: true } },
            },
          },
        },
      },
      association: {
        include: {
          buildings: {
            include: {
              units: {
                orderBy: { number: "asc" },
                select: { id: true, number: true, floor: true, shareRatio: true, residents: true },
              },
            },
          },
        },
      },
    },
  });

  if (!period) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(period);
}
