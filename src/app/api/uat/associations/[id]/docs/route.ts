// src/app/api/uat/associations/[id]/docs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { logUATAudit } from "@/lib/audit";

interface Params { params: { id: string } }

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (role !== UserRole.UAT_OPERATOR && role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { requiredDocuments } = await req.json();
  if (typeof requiredDocuments !== "object" || requiredDocuments === null) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const association = await prisma.association.findUnique({ where: { id: params.id } });
  if (!association) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = association.registrationDocs as Record<string, unknown> ?? {};
  const updated = { ...existing, requiredDocuments };

  await prisma.association.update({
    where: { id: params.id },
    data: { registrationDocs: updated },
  });

  const operator = await prisma.uATOperator.findUnique({ where: { userId: session.user.id } });
  const uatId = operator?.uatId ?? association.uatId;
  await logUATAudit({
    userId: session.user.id, uatId, action: "UPDATE",
    resource: "Association", resourceId: params.id,
    metadata: { action: "Documents updated" },
  });

  return NextResponse.json({ success: true });
}
