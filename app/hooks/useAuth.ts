"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type AuthUser = {
  id?: string | number;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
};

type Role = "admin" | "employee" | "manager";

// Stable array reference for pages that allow both admins and managers.
// Importing this (instead of writing an inline `["admin", "manager"]`
// literal at the call site) avoids ever creating a new array on every
// render, on top of the JSON.stringify safeguard in the effect below.
export const ADMIN_OR_MANAGER: Role[] = ["admin", "manager"];

type UseAuthOptions = {
  /** Required role(s). If omitted, any authenticated user is allowed. */
  requiredRole?: Role | Role[];
  /** Where to redirect if the check fails. Defaults to "/login". */
  redirectTo?: string;
};

type UseAuthReturn = {
  user: AuthUser | null;
  loading: boolean;
  logout: () => void;
};

export function useAuth(options: UseAuthOptions = {}): UseAuthReturn {
  const { requiredRole, redirectTo = "/login" } = options;
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // All setState calls are deferred via a microtask (Promise.resolve) to
    // avoid the "synchronous setState inside an effect" warning while still
    // being effectively immediate.
    let cancelled = false;

    Promise.resolve().then(() => {
      if (cancelled) return;

      const stored = localStorage.getItem("user");

      if (!stored) {
        setLoading(false);
        router.replace(redirectTo);
        return;
      }

      let parsed: AuthUser | null = null;
      try {
        parsed = JSON.parse(stored) as AuthUser;
      } catch {
        localStorage.removeItem("user");
        setLoading(false);
        router.replace(redirectTo);
        return;
      }

      if (requiredRole) {
        const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        if (!allowedRoles.includes(parsed.role as Role)) {
          setLoading(false);
          router.replace(redirectTo);
          return;
        }
      }

      setUser(parsed);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // requiredRole is compared by value (JSON.stringify) instead of by
    // reference, because passing it as an inline array literal (e.g.
    // requiredRole: ["admin", "manager"]) creates a new array on every
    // render, which would otherwise re-trigger this effect endlessly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, redirectTo, JSON.stringify(requiredRole)]);

  const logout = () => {
    localStorage.clear();
    fetch("/api/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
  };

  return { user, loading, logout };
}
