// src/app/api/public/doc-submissions/[token]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Params { params: { token: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const submission = await prisma.docSubmission.findUnique({
    where:  { completionToken: params.token },
    select: {
      id:            true,
      status:        true,
      submitterName: true,
      submitterRole: true,
      tokenExpiresAt: true,
      notes:         true,
      association: { select: { id: true, name: true, address: true, rawAddress: true } },
      files: {
        select: { id: true, docType: true, fileUrl: true, uploadedAt: true, fileSize: true },
        orderBy: { uploadedAt: "asc" },
      },
    },
  });

  if (!submission) return NextResponse.json({ error: "Token invalid sau expirat." }, { status: 404 });

  if (submission.tokenExpiresAt < new Date()) {
    return NextResponse.json({ error: "Token expirat." }, { status: 410 });
  }

  return NextResponse.json(submission);
}
