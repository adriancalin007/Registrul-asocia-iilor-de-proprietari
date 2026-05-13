import type { Metadata } from "next";
import "./globals.css";
import { Inter_Tight, Newsreader } from "next/font/google";
import { I18nProvider } from "@/components/i18n/I18nProvider";
import Providers from "@/components/Providers";
import { cookies } from "next/headers";
import type { Locale } from "@/lib/i18n";

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["300", "400"],
  style: ["italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Platformă Civic-Instituțională | UAT Sector 1",
  description: "Infrastructură digitală pentru gestionarea relației dintre UAT și asociațiile de proprietari",
  robots: "noindex, nofollow",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const locale = (cookieStore.get("locale")?.value as Locale) ?? "en";

  return (
    <html lang={locale} className={`${interTight.variable} ${newsreader.variable}`}>
      <body className="antialiased">
        <Providers>
          <I18nProvider initialLocale={locale}>
            {children}
          </I18nProvider>
        </Providers>
      </body>
    </html>
  );
}
