// src/app/api/scoli/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scoala = await prisma.scoala.findUnique({
    where: { id: params.id },
    include: {
      clase: {
        include: {
          orar: { orderBy: [{ ziSaptamana: "asc" }, { ora: "asc" }] },
          _count: { select: { inrolari: true } },
        },
        orderBy: [{ an: "asc" }, { litera: "asc" }],
      },
    },
  });

  if (!scoala) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Attach user's enrollment status for each class
  const userInrolari = await prisma.inrolare.findMany({
    where: { userId: session.user.id },
    select: { clasaId: true, status: true, numeElev: true },
  });
  const inrolareMap = Object.fromEntries(
    userInrolari.map((i) => [i.clasaId, i])
  );

  const result = {
    ...scoala,
    clase: scoala.clase.map((c) => ({
      ...c,
      myEnrollment: inrolareMap[c.id] ?? null,
    })),
  };

  return NextResponse.json(result);
}
