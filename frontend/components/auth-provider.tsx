"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import { apiFetch } from "@/lib/api";
import type { ApiUser } from "@/lib/types";

type AuthContextValue = {
  firebaseUser: User | null;
  apiUser: ApiUser | null;
  loading: boolean;
  refreshUser: (force?: boolean) => Promise<ApiUser | null>;
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
  const pending = useRef<{ user: User; promise: Promise<ApiUser | null> } | null>(null);
  const requestVersion = useRef(0);

  const refreshUser = useCallback(async (force = false) => {
    const user = getFirebaseAuth()?.currentUser;
    if (!user) return null;
    if (!force && pending.current?.user === user) return pending.current.promise;
    const version = ++requestVersion.current;
    const promise = (async () => {
      const token = await user.getIdToken();
      const result = await apiFetch<{ user: ApiUser }>("/api/auth/verify", {
        method: "POST", headers: { Authorization: `Bearer ${token}` }
      });
      if (getFirebaseAuth()?.currentUser !== user) return null;
      if (version === requestVersion.current) setApiUser(result.user);
      return result.user;
    })();
    pending.current = { user, promise };
    try { return await promise; }
    finally { if (pending.current?.promise === promise) pending.current = null; }
  }, []);

  useEffect(() => {
    let auth;
    try { auth = getFirebaseAuth(); }
    catch { setLoading(false); return; }
    if (!auth) {
      setLoading(false);
      return;
    }

    let generation = 0;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const current = ++generation;
      setLoading(true);
      setFirebaseUser(user);
      setApiUser(null);

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        await refreshUser();
      } catch {
        if (current === generation) setApiUser(null);
      } finally {
        if (current === generation) setLoading(false);
      }
    });
    return () => { generation++; unsubscribe(); };
  }, [refreshUser]);

  const value = useMemo(() => ({ firebaseUser, apiUser, loading, refreshUser }), [firebaseUser, apiUser, loading, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
