import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type Role = "admin" | "employee" | "manager";

// ── Route protection map ───────────────────────────────────────────────────
// Checked in order — more specific prefixes must come before broader ones
// (e.g. "/admin/employee" before "/admin") since matching is a simple
// startsWith() scan.
const PROTECTED_ROUTES: { prefix: string; roles: Role[] | null }[] = [
  { prefix: "/admin/employee",   roles: ["admin", "manager"] },
  { prefix: "/admin/vacations",  roles: ["admin", "manager"] },
  { prefix: "/admin/salaries",   roles: ["admin", "manager"] },
  { prefix: "/admin/tasks",      roles: ["admin", "manager"] },
  { prefix: "/admin/expenses",   roles: ["admin", "manager"] },
  { prefix: "/admin",            roles: ["admin"] },
  { prefix: "/manager",          roles: ["manager"] },
  { prefix: "/employee",         roles: ["employee"] },
  { prefix: "/home",             roles: null },
  { prefix: "/appeal",           roles: null },
  { prefix: "/veccation",        roles: null },
  { prefix: "/suggestions",      roles: null },
  { prefix: "/resignation",      roles: null },
  { prefix: "/trainee",          roles: null },
  { prefix: "/salary",           roles: null },
  { prefix: "/tasks",            roles: null },
  { prefix: "/contract",         roles: null },
  { prefix: "/documents",        roles: null },
  { prefix: "/expenses",         roles: null },
];

// Routes that logged-in users should NOT visit
const AUTH_ROUTES = ["/login", "/signup", "/forget", "/reset"];

function roleHome(role: string | null): string {
  if (role === "admin") return "/admin";
  if (role === "manager") return "/manager";
  return "/home";
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read the role cookie set by POST /api/login
  const userRole = request.cookies.get("role")?.value ?? null;
  const isLoggedIn = userRole !== null;

  // ── 1. Redirect logged-in users away from auth pages ──────────────────
  if (isLoggedIn && AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL(roleHome(userRole), request.url));
  }

  // ── 2. Protect private routes ──────────────────────────────────────────
  const matched = PROTECTED_ROUTES.find((r) => pathname.startsWith(r.prefix));

  if (matched) {
    // Not logged in → send to login
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Wrong role → send to their correct home
    if (matched.roles && !matched.roles.includes(userRole as Role)) {
      return NextResponse.redirect(new URL(roleHome(userRole), request.url));
    }
  }

  // ── 3. Everything else → allow ────────────────────────────────────────
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)" ],
};
