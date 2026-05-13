import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const STORAGE_BUCKET = "documents";

export function getSupabaseServer() {
  return createClient(url, serviceKey);
}

export function getSupabaseClient() {
  return createClient(url, anonKey);
}
