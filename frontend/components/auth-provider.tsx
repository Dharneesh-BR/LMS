"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import { apiFetch } from "@/lib/api";
import type { ApiUser } from "@/lib/types";

type AuthContextValue = {
  firebaseUser: User | null;
  apiUser: ApiUser | null;
  loading: boolean;
  refreshUser: () => Promise<ApiUser | null>;
};

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  apiUser: null,
  loading: true,
  refreshUser: async () => null
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [apiUser, setApiUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const result = await apiFetch<{ user: ApiUser }>("/api/auth/verify", { method: "POST" });
    setApiUser(result.user);
    return result.user;
  }, []);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    return onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setApiUser(null);

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        await refreshUser();
      } catch {
        setFirebaseUser(null);
        setApiUser(null);
      } finally {
        setLoading(false);
      }
    });
  }, [refreshUser]);

  const value = useMemo(() => ({ firebaseUser, apiUser, loading, refreshUser }), [firebaseUser, apiUser, loading, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
