import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      rbacRoles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      ownerships: {
        where: { isActive: true },
        include: {
          unit: {
            include: {
              building: { include: { association: { select: { id: true, name: true, address: true } } } },
              anexe: true,
              detineri: {
                where: { dataIesire: null },
                include: { persoana: { select: { nume: true, prenume: true } } },
                take: 10,
              },
            },
          },
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Perspectiva civilă
  const civilView = {
    civicType:       user.civicType,
    domiciliuSector: user.domiciliuSector,
    domiciliuAdresa: user.domiciliuAdresa,
    ownerships: user.ownerships.map(o => ({
      id:              o.id,
      unitNumber:      o.unit.number,
      floor:           o.unit.floor,
      area:            o.unit.area,
      rooms:           o.unit.rooms,
      shareRatio:      o.unit.shareRatio,
      buildingName:    o.unit.building.name,
      associationName: o.unit.building.association?.name ?? "—",
      associationId:   o.unit.building.association?.id   ?? null,
      anexe:           o.unit.anexe.map(a => ({ tip: a.tipAnexa, numar: a.numarAnexa, suprafata: a.suprafata })),
      coproprietari:   o.unit.detineri.map(d => ({
        nume:  `${d.persoana.prenume} ${d.persoana.nume}`,
        cota:  d.cotaProprietate ?? null,
      })),
    })),
  };

  // Perspectiva oficială (dacă există roluri OFFICIAL)
  const officialRoles = user.rbacRoles.filter(a => a.role.accountType === "OFFICIAL");
  const officialView = officialRoles.length > 0 ? {
    roles:       officialRoles.map(a => ({ name: a.role.name, description: a.role.description })),
    permissions: Array.from(new Set(officialRoles.flatMap(a => a.role.permissions.map(rp => rp.permission.key)))),
  } : null;

  return NextResponse.json({
    id:          user.id,
    email:       user.email,
    fullName:    user.fullName,
    firstName:   user.firstName,
    lastName:    user.lastName,
    phone:       user.phone,
    accountType: user.accountType,
    status:      user.status,
    // Perspectivele sunt clare separate
    civil:       civilView,
    official:    officialView,
    hasMultipleViews: officialView !== null && user.ownerships.length > 0,
  });
}
