// src/middleware.ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/register-association",
  "/completare-dosar",
  "/complete-file",
  "/seteaza-parola",
  "/api/auth",
  "/api/inregistrare",
  "/api/register-association",
  "/api/completare-dosar",
  "/api/complete-file",
  "/api/seteaza-parola",
  "/asociatii",
  "/depunere-acte",
  "/api/public",
];

// Gestiune zone — financial management (Zone 2).
// Accessible by all roles except OWNER and POLICE_OPERATOR.
// Fine-grained per-page access (e.g. AUDITOR read-only) is enforced inside each page.
const GESTIUNE_PATHS = ["/financiare", "/facturi", "/situatii-financiare", "/rapoarte", "/furnizori", "/lucrari", "/avarii", "/consultari", "/adeverinte", "/sesizari", "/documente"];
const GESTIUNE_ROLES = ["OWNER", "MANAGER", "BOARD_PRESIDENT", "AUDITOR", "SUPPLIER", "UAT_OPERATOR", "SUPER_ADMIN"];

// Dashboard zone management paths — require at least MANAGER/BOARD_PRESIDENT (no AUDITOR, no SUPPLIER).
const MANAGEMENT_PATHS = ["/locatari"];
const MANAGEMENT_ROLES = ["MANAGER", "BOARD_PRESIDENT", "UAT_OPERATOR", "SUPER_ADMIN"];

// Routes restricted to UAT staff only.
const UAT_PATHS = ["/uat"];
const UAT_ROLES = ["UAT_OPERATOR", "POLICE_OPERATOR", "SUPER_ADMIN"];

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const path = nextUrl.pathname;
  const isAuthenticated = !!session;
  const role = (session?.user?.role as string | undefined) ?? "";

  // ── 1. Public routes ──────────────────────────────────────────────────────
  // "/" uses exact match to avoid making every path public (all paths start with "/")
  const isPublic = path === "/" || PUBLIC_ROUTES.filter(r => r !== "/").some(r => path.startsWith(r));

  if (!isAuthenticated && !isPublic) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && path.startsWith("/login")) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
  }

  // ── 1b. Force password change ─────────────────────────────────────────────
  if (isAuthenticated && (session as { user?: { mustChangePassword?: boolean } })?.user?.mustChangePassword) {
    if (!path.startsWith("/schimba-parola") && !path.startsWith("/api/schimba-parola") && !path.startsWith("/api/auth")) {
      return NextResponse.redirect(new URL("/schimba-parola", nextUrl.origin));
    }
  }

  // ── 2. Role-based path guards ────────────────────────────────────────────
  if (isAuthenticated) {
    // /super-admin — SUPER_ADMIN only
    if (path.startsWith("/super-admin") && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
    }

    // UAT panel — UAT roles only
    if (UAT_PATHS.some(p => path.startsWith(p)) && !UAT_ROLES.includes(role)) {
      return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
    }

    // Gestiune zone (financial management) — excludes OWNER and POLICE_OPERATOR
    if (GESTIUNE_PATHS.some(p => path.startsWith(p)) && !GESTIUNE_ROLES.includes(role)) {
      return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
    }

    // Dashboard zone management paths (e.g. /locatari) — no auditor, no supplier, no owner
    if (MANAGEMENT_PATHS.some(p => path.startsWith(p)) && !MANAGEMENT_ROLES.includes(role)) {
      return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
