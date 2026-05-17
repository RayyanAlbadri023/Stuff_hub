"use client";

import { useState, useEffect } from "react";
import type { AuthUser } from "./useAuth";

/**
 * useLocalUser
 *
 * Reads and parses the stored user from localStorage.
 * Does NOT redirect — use this in pages that already called useAuth,
 * or in utility components that just need the user object.
 */
export function useLocalUser(): AuthUser | null {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const raw = localStorage.getItem("user");
        if (raw) setUser(JSON.parse(raw) as AuthUser);
      } catch {
        localStorage.removeItem("user");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return user;
}
