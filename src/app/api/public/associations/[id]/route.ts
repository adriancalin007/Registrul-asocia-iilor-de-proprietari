// src/app/api/public/associations/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AssociationStatus } from "@prisma/client";

const PUBLIC_STATUSES: AssociationStatus[] = [
  AssociationStatus.ACTIVE,
  AssociationStatus.OFFICIAL_REGISTRY,
];

interface Params { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const association = await prisma.association.findFirst({
    where: { id: params.id, status: { in: PUBLIC_STATUSES } },
    select: {
      id:              true,
      name:            true,
      status:          true,
      address:         true,
      rawAddress:      true,
      neighborhood:    true,
      fiscalCode:      true,
      registrationNumber:  true,
      courtDossierNumber:  true,
      registrationYear:    true,
      streetType:          true,
      streetName:          true,
      streetNumber:        true,
      blockLabel:          true,
      staircaseLabel:      true,
      scores: {
        where:   { isPublic: true },
        orderBy: { calculatedAt: "desc" },
        take:    5,
        select: {
          totalPoints:         true,
          maxPossible:         true,
          classification:      true,
          hasMissingEliminator: true,
          calculatedAt:        true,
          notes:               true,
          grid: { select: { versionLabel: true } },
        },
      },
      _count: { select: { buildings: true } },
    },
  });

  if (!association) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(association);
}
