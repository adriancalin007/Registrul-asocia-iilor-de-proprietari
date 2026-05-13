// src/app/api/scoli/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scoli = await prisma.scoala.findMany({
    where: { status: "ACTIVE" },
    include: {
      clase: {
        select: { id: true, an: true, litera: true },
        orderBy: [{ an: "asc" }, { litera: "asc" }],
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(scoli);
}
