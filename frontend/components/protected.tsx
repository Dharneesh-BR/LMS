"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth-provider";

export function Protected({ children }: { children: React.ReactNode }) {
  const { firebaseUser, apiUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!firebaseUser || !apiUser)) {
      router.replace("/login");
    }
  }, [firebaseUser, apiUser, loading, router]);

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-12">Loading...</div>;
  }

  if (!firebaseUser || !apiUser) return null;

  return <>{children}</>;
}
