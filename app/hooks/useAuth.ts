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

type UseAuthOptions = {
  /** Required role. If omitted, any authenticated user is allowed. */
  requiredRole?: "admin" | "employee";
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

      if (requiredRole && parsed.role !== requiredRole) {
        setLoading(false);
        router.replace(redirectTo);
        return;
      }

      setUser(parsed);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [router, requiredRole, redirectTo]);

  const logout = () => {
    localStorage.clear();
    fetch("/api/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
  };

  return { user, loading, logout };
}
