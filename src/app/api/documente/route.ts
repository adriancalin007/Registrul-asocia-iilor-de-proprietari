// src/app/api/documente/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, DocumentStatus, AuditAction, Prisma } from "@prisma/client";
import { logAudit, getClientIp } from "@/lib/audit";
import { cookies } from "next/headers";
import { z } from "zod";

const MANAGER_ROLES = [UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN, UserRole.UAT_OPERATOR] as UserRole[];
const OPERATOR_ROLES = [UserRole.UAT_OPERATOR, UserRole.SUPER_ADMIN] as UserRole[];

async function resolveAssocId(userId: string, override?: string | null): Promise<string | null> {
  if (override) return override;
  const cookieStore = cookies();
  const fromCookie = cookieStore.get("asociatie_activa")?.value ?? null;
  if (fromCookie) return fromCookie;
  const mandate = await prisma.mandate.findFirst({ where: { userId, isActive: true } });
  return mandate?.associationId ?? null;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  const isManager = MANAGER_ROLES.includes(role);

  const overrideAssocId = OPERATOR_ROLES.includes(role)
    ? new URL(req.url).searchParams.get("associationId")
    : null;

  let associationId: string | undefined;
  if (isManager || role === UserRole.AUDITOR) {
    associationId = (await resolveAssocId(session.user.id, overrideAssocId)) ?? undefined;
  } else if (role === UserRole.OWNER) {
    const ownership = await prisma.ownership.findFirst({
      where: { userId: session.user.id, isActive: true },
      include: { unit: { include: { building: true } } },
    });
    associationId = ownership?.unit.building.associationId;
  }

  if (!associationId) return NextResponse.json({ error: "No active association" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const category  = searchParams.get("category")  ?? undefined;
  const status    = searchParams.get("status")     ?? undefined;
  const folder    = searchParams.get("folder")     ?? undefined;
  const dateFrom  = searchParams.get("dateFrom")   ?? undefined;
  const dateTo    = searchParams.get("dateTo")     ?? undefined;
  const listType  = searchParams.get("list")       ?? "documents"; // "documents" | "folders" | "categories"

  if (listType === "folders") {
    const rows = await prisma.document.findMany({
      where: { associationId, folder: { not: null } },
      select: { folder: true },
      distinct: ["folder"],
      orderBy: { folder: "asc" },
    });
    return NextResponse.json(rows.map(r => r.folder).filter(Boolean));
  }

  if (listType === "categories") {
    const rows = await prisma.document.findMany({
      where: { associationId },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });
    return NextResponse.json(rows.map(r => r.category));
  }

  const filter: Prisma.DocumentWhereInput = { associationId };

  if (role === UserRole.OWNER) {
    filter.isPublic = true;
    filter.status = DocumentStatus.PUBLISHED;
  } else {
    if (status)   filter.status   = status as DocumentStatus;
    if (category) filter.category = category;
    if (folder !== undefined) {
      filter.folder = folder === "" ? null : folder;
    }
    if (dateFrom || dateTo) {
      filter.documentDate = {};
      if (dateFrom) filter.documentDate.gte = new Date(dateFrom);
      if (dateTo)   filter.documentDate.lte = new Date(dateTo + "T23:59:59");
    }
  }

  const documents = await prisma.document.findMany({
    where: filter,
    orderBy: [{ documentDate: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(documents);
}

const DocumentSchema = z.object({
  title:        z.string().min(2, "Titlul este prea scurt"),
  category:     z.string().min(1, "Categoria este obligatorie"),
  folder:       z.string().optional(),
  description:  z.string().optional(),
  fileUrl:      z.string().optional(),
  isPublic:     z.boolean().default(false),
  status:       z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  documentDate: z.string().optional(),
  expiresAt:    z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (!MANAGER_ROLES.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = DocumentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const overrideId = OPERATOR_ROLES.includes(role) ? (body.associationId as string | undefined) : undefined;
  const associationId = await resolveAssocId(session.user.id, overrideId);
  if (!associationId) return NextResponse.json({ error: "No active association" }, { status: 400 });

  const { documentDate, expiresAt, folder, ...rest } = parsed.data;

  const document = await prisma.document.create({
    data: {
      associationId,
      ...rest,
      fileUrl:      rest.fileUrl ?? "",
      folder:       folder?.trim() || null,
      documentDate: documentDate ? new Date(documentDate) : null,
      expiresAt:    expiresAt    ? new Date(expiresAt)    : null,
      status:       rest.status  as DocumentStatus,
      uploadedBy:   session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    role,
    action: AuditAction.CREATE,
    resource: "Document",
    resourceId: document.id,
    associationId,
    documentId: document.id,
    metadata: { title: document.title, category: document.category, status: document.status },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ success: true, id: document.id });
}
