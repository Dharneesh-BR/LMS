"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { designMode } from "@/lib/design-mode";

export function Protected({ children }: { children: React.ReactNode }) {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!designMode && !loading && !firebaseUser) {
      router.replace("/login");
    }
  }, [firebaseUser, loading, router]);

  if (designMode) return <>{children}</>;

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-12">Loading...</div>;
  }

  if (!firebaseUser) return null;

  return <>{children}</>;
}
