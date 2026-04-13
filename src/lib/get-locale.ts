// src/lib/get-locale.ts
// Server-side locale detection from cookie
import { cookies } from "next/headers";
import { getTranslator, DEFAULT_LOCALE, type Locale } from "./i18n";

export function getServerTranslator() {
  const cookieStore = cookies();
  const locale = (cookieStore.get("locale")?.value as Locale) ?? DEFAULT_LOCALE;
  return { t: getTranslator(locale), locale };
}
