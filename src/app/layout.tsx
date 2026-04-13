import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "@/components/i18n/I18nProvider";
import { cookies } from "next/headers";
import type { Locale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Platformă Civic-Instituțională | UAT Sector 1",
  description: "Infrastructură digitală pentru gestionarea relației dintre UAT și asociațiile de proprietari",
  robots: "noindex, nofollow",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const locale = (cookieStore.get("locale")?.value as Locale) ?? "ro";

  return (
    <html lang={locale}>
      <body className="antialiased bg-slate-50 text-slate-900">
        <I18nProvider initialLocale={locale}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
