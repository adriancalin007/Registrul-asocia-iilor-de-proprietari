// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseServer, STORAGE_BUCKET } from "@/lib/supabase";

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg", "image/png", "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Niciun fișier atașat" }, { status: 400 });

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Fișierul depășește limita de 20 MB" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Tip de fișier neacceptat (PDF, imagine, Word, Excel)" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const safeFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${session.user.id}/${Date.now()}_${safeFileName}`;

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch {
    return NextResponse.json({ error: "Eroare la citirea fișierului" }, { status: 400 });
  }

  const supabase = getSupabaseServer();

  try {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json({ error: "Eroare la salvarea fișierului: " + error.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path);

    return NextResponse.json({
      url: publicUrl,
      name: file.name,
      size: file.size,
      mimeType: file.type,
      ext,
    });
  } catch (err) {
    console.error("Unexpected upload error:", err);
    return NextResponse.json({ error: "Eroare internă la salvarea fișierului" }, { status: 500 });
  }
}

// Required for parsing large files
export const config = { api: { bodyParser: false } };
