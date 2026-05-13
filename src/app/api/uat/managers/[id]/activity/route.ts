import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

interface Params { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (role !== UserRole.UAT_OPERATOR && role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = params.id;

  const [
    loginCount,
    documentCount,
    certificateCount,
    issueCount,
    consultationCount,
    recentLogins,
  ] = await Promise.all([
    // Total login events
    prisma.auditLog.count({
      where: { userId, action: "LOGIN" },
    }),
    // Documents uploaded
    prisma.document.count({
      where: { uploadedBy: userId },
    }),
    // Certificates approved
    prisma.certificate.count({
      where: { approvedBy: userId },
    }),
    // Issues reported
    prisma.issue.count({
      where: { reportedBy: userId },
    }),
    // Consultations initiated
    prisma.consultation.count({
      where: { initiatedBy: userId },
    }),
    // Last 5 login timestamps
    prisma.auditLog.findMany({
      where: { userId, action: "LOGIN" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { createdAt: true },
    }),
  ]);

  return NextResponse.json({
    loginCount,
    documentCount,
    certificateCount,
    issueCount,
    consultationCount,
    recentLogins: recentLogins.map(l => l.createdAt),
  });
}
