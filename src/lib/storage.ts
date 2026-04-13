// src/lib/storage.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const BUCKET = "documents";

export type DocumentCategory =
  | "registration"
  | "committee"
  | "contracts"
  | "minutes"
  | "financial"
  | "certificates"
  | "general";

export const CATEGORY_LABELS: Record<DocumentCategory, { ro: string; en: string }> = {
  registration: { ro: "Acte înregistrare", en: "Registration docs" },
  committee: { ro: "CI Comitet executiv", en: "Committee IDs" },
  contracts: { ro: "Contracte", en: "Contracts" },
  minutes: { ro: "Procese verbale", en: "Meeting minutes" },
  financial: { ro: "Financiar", en: "Financial" },
  certificates: { ro: "Adeverințe", en: "Certificates" },
  general: { ro: "General", en: "General" },
};

export interface UploadResult {
  url: string;
  path: string;
  name: string;
  size: number;
  type: string;
}

export async function uploadFile(
  file: File,
  associationId: string,
  category: DocumentCategory
): Promise<UploadResult> {
  // Sanitize filename
  const ext = file.name.split(".").pop() ?? "bin";
  const safeName = file.name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .slice(0, 60);
  const timestamp = Date.now();
  const fileName = `${timestamp}_${safeName}.${ext}`;
  const path = `associations/${associationId}/${category}/${fileName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return {
    url: data.publicUrl,
    path,
    name: file.name,
    size: file.size,
    type: file.type,
  };
}

export async function deleteFile(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
