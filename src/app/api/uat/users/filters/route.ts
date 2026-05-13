// GET /api/uat/users/filters — returns distinct neighborhoods + associations for filter dropdowns
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role as UserRole;
  if (role !== UserRole.UAT_OPERATOR && role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [neighborhoods, associations] = await Promise.all([
    prisma.association.findMany({
      where: { status: "ACTIVE", neighborhood: { not: null } },
      select: { neighborhood: true },
      distinct: ["neighborhood"],
      orderBy: { neighborhood: "asc" },
    }),
    prisma.association.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, neighborhood: true },
      orderBy: [{ neighborhood: "asc" }, { name: "asc" }],
    }),
  ]);

  return NextResponse.json({
    neighborhoods: neighborhoods.map(a => a.neighborhood!).filter(Boolean),
    associations:  associations.map(a => ({ id: a.id, name: a.name, neighborhood: a.neighborhood })),
  });
}
