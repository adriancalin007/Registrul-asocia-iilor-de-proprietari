// src/app/api/public/doc-submissions/[token]/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabase, BUCKET, ALLOWED_TYPES, MAX_FILE_SIZE } from "@/lib/storage";

interface Params { params: { token: string } }

export async function POST(req: NextRequest, { params }: Params) {
  const submission = await prisma.docSubmission.findUnique({
    where:  { completionToken: params.token },
    select: { id: true, associationId: true, tokenExpiresAt: true, status: true },
  });

  if (!submission) return NextResponse.json({ error: "Token invalid." }, { status: 404 });
  if (submission.tokenExpiresAt < new Date()) return NextResponse.json({ error: "Token expirat." }, { status: 410 });
  if (submission.status === "COMPLETED" || submission.status === "REJECTED") {
    return NextResponse.json({ error: "Dosarul este deja finalizat." }, { status: 409 });
  }

  const formData = await req.formData();
  const file    = formData.get("file") as File | null;
  const docType = (formData.get("docType") as string | null) ?? "general";

  if (!file) return NextResponse.json({ error: "Niciun fișier transmis." }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `Tip de fișier neacceptat: ${file.type}` }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Fișierul depășește 10 MB." }, { status: 400 });
  }

  const ext  = file.name.split(".").pop() ?? "bin";
  const safe = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 60);
  const path = `submissions/${submission.id}/${Date.now()}_${safe}.${ext}`;

  const buf    = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buf, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const record = await prisma.docSubmissionFile.create({
    data: {
      submissionId: submission.id,
      docType,
      fileUrl:   publicUrl,
      fileSize:  file.size,
      mimeType:  file.type,
    },
    select: { id: true, docType: true, fileUrl: true, uploadedAt: true, fileSize: true },
  });

  return NextResponse.json(record, { status: 201 });
}
