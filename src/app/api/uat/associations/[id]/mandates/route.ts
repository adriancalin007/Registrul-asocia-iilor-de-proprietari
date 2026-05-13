// src/app/api/uat/associations/[id]/mandates/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { logUATAudit, getClientIp } from "@/lib/audit";

const ALLOWED_ROLES = [UserRole.UAT_OPERATOR, UserRole.SUPER_ADMIN] as UserRole[];
interface Params { params: { id: string } }

const CreateSchema = z.object({
  fullName:  z.string().min(2, "Numele este obligatoriu"),
  email:     z.string().email("Email invalid"),
  phone:     z.string().optional(),
  role:      z.enum(["MANAGER", "BOARD_PRESIDENT", "AUDITOR"]),
  startDate: z.string().min(1, "Data este obligatorie"),
});

async function resolveUatId(userId: string, role: UserRole): Promise<string | null> {
  if (role === UserRole.SUPER_ADMIN) {
    const uat = await prisma.uAT.findFirst();
    return uat?.id ?? null;
  }
  const op = await prisma.uATOperator.findUnique({ where: { userId } });
  return op?.uatId ?? null;
}

// GET — list mandates for association (active only by default; ?all=true includes inactive)
export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ALLOWED_ROLES.includes(session.user.role as UserRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const includeAll = new URL(req.url).searchParams.get("all") === "true";

  const mandates = await prisma.mandate.findMany({
    where: { associationId: params.id, ...(includeAll ? {} : { isActive: true }) },
    include: { user: { select: { id: true, fullName: true, email: true, phone: true } } },
    orderBy: { startDate: "desc" },
  });

  return NextResponse.json(mandates);
}

// POST — add manager/board-president/auditor mandate
export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role as UserRole;
  if (!ALLOWED_ROLES.includes(role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Verify this operator belongs to the association's UAT
  const association = await prisma.association.findUnique({ where: { id: params.id } });
  if (!association) return NextResponse.json({ error: "Association not found" }, { status: 404 });

  const uatId = await resolveUatId(session.user.id, role);
  if (uatId && association.uatId !== uatId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const { fullName, email, phone, role: mandateRole, startDate } = parsed.data;

  // Find or create user
  let user = await prisma.user.findUnique({ where: { email } });
  let created = false;
  if (!user) {
    const nameParts = fullName.trim().split(" ");
    const tempHash = await bcrypt.hash(`RESET_${Math.random().toString(36).slice(2)}`, 10);
    user = await prisma.user.create({
      data: {
        email, fullName,
        firstName: nameParts.slice(0, -1).join(" ") || fullName,
        lastName: nameParts.length > 1 ? nameParts[nameParts.length - 1] : "",
        phone: phone ?? null,
        passwordHash: tempHash,
        emailVerified: false,
        isActive: true,
      },
    });
    created = true;
  }

  // Check for duplicate active mandate
  const existing = await prisma.mandate.findFirst({
    where: { userId: user.id, associationId: params.id, role: mandateRole as UserRole, isActive: true },
  });
  if (existing)
    return NextResponse.json({ error: "Această persoană are deja un mandat activ pentru acest rol" }, { status: 409 });

  // For MANAGER and BOARD_PRESIDENT, deactivate previous mandate of same role
  if (mandateRole !== "AUDITOR") {
    await prisma.mandate.updateMany({
      where: { associationId: params.id, role: mandateRole as UserRole, isActive: true },
      data: { isActive: false, expiresAt: new Date() },
    });
  }

  const mandate = await prisma.mandate.create({
    data: {
      associationId: params.id,
      userId: user.id,
      role: mandateRole as UserRole,
      startDate: new Date(startDate),
      isActive: true,
    },
    include: { user: { select: { id: true, fullName: true, email: true, phone: true } } },
  });

  await logUATAudit({
    userId: session.user.id,
    uatId: association.uatId,
    action: "CREATE",
    resource: "Mandate",
    resourceId: mandate.id,
    ipAddress: getClientIp(req),
    metadata: { role: mandateRole, targetEmail: email, associationId: params.id, userCreated: created },
  });

  return NextResponse.json({ success: true, mandate, userCreated: created });
}

// DELETE — deactivate mandate by mandateId
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role as UserRole;
  if (!ALLOWED_ROLES.includes(role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { mandateId } = await req.json();
  if (!mandateId) return NextResponse.json({ error: "mandateId required" }, { status: 400 });

  const mandate = await prisma.mandate.findUnique({
    where: { id: mandateId },
    include: { association: { select: { uatId: true } } },
  });
  if (!mandate || mandate.associationId !== params.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const uatId = await resolveUatId(session.user.id, role);
  if (uatId && mandate.association.uatId !== uatId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.mandate.update({
    where: { id: mandateId },
    data: { isActive: false, expiresAt: new Date() },
  });

  await logUATAudit({
    userId: session.user.id,
    uatId: mandate.association.uatId,
    action: "DELETE",
    resource: "Mandate",
    resourceId: mandateId,
    ipAddress: getClientIp(req),
    metadata: { associationId: params.id },
  });

  return NextResponse.json({ success: true });
}
