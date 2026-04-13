// src/middleware.ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/register-association",
  "/complete-file",
  "/api/auth",
  "/api/register-association",
  "/api/complete-file",
];

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isAuthenticated = !!session;

  const isPublic = PUBLIC_ROUTES.some(r => nextUrl.pathname.startsWith(r));

  if (!isAuthenticated && !isPublic) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && nextUrl.pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
