import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, SesizareStatus, SesizareRouting } from "@prisma/client";
import { z } from "zod";

interface Params { params: { id: string } }

const UAT_ROLES: UserRole[] = [UserRole.UAT_OPERATOR, UserRole.POLICE_OPERATOR, UserRole.SUPER_ADMIN];

const PatchSchema = z.discriminatedUnion("action", [
  z.object({
    action:   z.literal("RESPOND"),
    response: z.string().min(5),
    status:   z.enum(["IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  }),
  z.object({
    action:  z.literal("REROUTE"),
    routing: z.enum(["UAT_GENERAL", "POLICE"]),
  }),
  z.object({
    action: z.literal("STATUS"),
    status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
  }),
]);

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sesizare = await prisma.sesizare.findUnique({
    where: { id: params.id },
    include: {
      submitter: { select: { fullName: true, email: true } },
      responder: { select: { fullName: true } },
      association: { select: { name: true, neighborhood: true, uatId: true } },
    },
  });
  if (!sesizare) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(sesizare);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (!UAT_ROLES.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sesizare = await prisma.sesizare.findUnique({ where: { id: params.id } });
  if (!sesizare) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = PatchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  // Police operator can only respond to police-routed sesizari
  if (role === UserRole.POLICE_OPERATOR && sesizare.routing !== SesizareRouting.POLICE) {
    return NextResponse.json({ error: "Poliția poate răspunde doar sesizărilor direcționate spre poliție" }, { status: 403 });
  }

  const { action } = parsed.data;

  if (action === "RESPOND") {
    await prisma.sesizare.update({
      where: { id: params.id },
      data: {
        response:    parsed.data.response,
        respondedBy: session.user.id,
        respondedAt: new Date(),
        status:      (parsed.data.status ?? "IN_PROGRESS") as SesizareStatus,
      },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "REROUTE") {
    await prisma.sesizare.update({
      where: { id: params.id },
      data: {
        routing:    parsed.data.routing as SesizareRouting,
        reroutedAt: new Date(),
        reroutedBy: session.user.id,
      },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "STATUS") {
    await prisma.sesizare.update({
      where: { id: params.id },
      data: { status: parsed.data.status as SesizareStatus },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
