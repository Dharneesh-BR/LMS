"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase";
import { apiFetch } from "@/lib/api";
import type { ApiUser } from "@/lib/types";
import { designMode } from "@/lib/design-mode";

const designUser: ApiUser = {
  id: "design-preview",
  firebaseUid: "design-preview",
  name: "Design preview",
  email: "designer@localhost",
  role: "ADMIN"
};

type AuthContextValue = {
  firebaseUser: User | null;
  apiUser: ApiUser | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  apiUser: null,
  loading: true
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [apiUser, setApiUser] = useState<ApiUser | null>(designMode ? designUser : null);
  const [loading, setLoading] = useState(!designMode);

  useEffect(() => {
    if (designMode) return;

    return onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setApiUser(null);

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const result = await apiFetch<{ user: ApiUser }>("/api/auth/verify", { method: "POST" });
        setApiUser(result.user);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const value = useMemo(() => ({ firebaseUser, apiUser, loading }), [firebaseUser, apiUser, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
