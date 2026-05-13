// src/lib/audit.ts
import { prisma } from "@/lib/prisma";
import { UserRole, AuditAction, Prisma } from "@prisma/client";

interface AuditParams {
  userId: string;
  role: UserRole;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  associationId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  documentId?: string;
  consultationId?: string;
  issueId?: string;
  rfqId?: string;
  certificateId?: string;
}

interface UATAuditParams {
  userId: string;
  uatId: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        role: params.role,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        associationId: params.associationId,
        metadata: (params.metadata ?? {}) as unknown as Prisma.InputJsonValue,
        ipAddress: params.ipAddress,
        documentId: params.documentId,
        consultationId: params.consultationId,
        issueId: params.issueId,
        rfqId: params.rfqId,
        certificateId: params.certificateId,
      },
    });
  } catch (err) {
    console.error("[AUDIT]", err);
  }
}

export async function logUATAudit(params: UATAuditParams): Promise<void> {
  try {
    await prisma.uATAuditLog.create({
      data: {
        userId: params.userId,
        uatId: params.uatId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        metadata: (params.metadata ?? {}) as unknown as Prisma.InputJsonValue,
        ipAddress: params.ipAddress,
      },
    });
  } catch (err) {
    console.error("[UAT AUDIT]", err);
  }
}

export function getClientIp(request: Request): string | undefined {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    undefined
  );
}
