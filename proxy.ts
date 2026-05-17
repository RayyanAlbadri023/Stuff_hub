import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Route protection map ───────────────────────────────────────────────────
const PROTECTED_ROUTES: Record<string, "admin" | "employee" | null> = {
  "/admin":        "admin",
  "/employee":     "employee",
  "/home":         null,
  "/appeal":       null,
  "/veccation":    null,
  "/suggestions":  null,
  "/resignation":  null,
  "/trainee":      null,
};

// Routes that logged-in users should NOT visit
const AUTH_ROUTES = ["/login", "/signup", "/forget", "/reset"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read the role cookie set by POST /api/login
  const userRole = request.cookies.get("role")?.value ?? null;
  const isLoggedIn = userRole !== null;

  // ── 1. Redirect logged-in users away from auth pages ──────────────────
  if (isLoggedIn && AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    const dest = userRole === "admin" ? "/admin" : "/home";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // ── 2. Protect private routes ──────────────────────────────────────────
  const matchedPrefix = Object.keys(PROTECTED_ROUTES).find((prefix) =>
    pathname.startsWith(prefix)
  );

  if (matchedPrefix !== undefined) {
    // Not logged in → send to login
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Wrong role → send to their correct home
    const requiredRole = PROTECTED_ROUTES[matchedPrefix];
    if (requiredRole && userRole !== requiredRole) {
      const dest = userRole === "admin" ? "/admin" : "/home";
      return NextResponse.redirect(new URL(dest, request.url));
    }
  }

  // ── 3. Everything else → allow ────────────────────────────────────────
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)" ],
};
