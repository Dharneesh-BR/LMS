"use client";

import Link from "next/link";
import { BookOpenCheck, LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { logout } from "@/lib/firebase";
import { designMode } from "@/lib/design-mode";

export function Header() {
  const { firebaseUser, apiUser } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-mist/80 bg-paper/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-3 text-lg font-semibold text-ink">
          <img src="/magnafic-logo.png" alt="Magnafic" className="h-9 w-auto" />
          <span className="hidden rounded-full bg-cloud px-3 py-1 text-xs font-bold text-ocean ring-1 ring-mist sm:inline-flex">
            Courses
          </span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/" className="rounded-md px-3 py-2 font-medium text-moss hover:bg-cloud hover:text-ink">Courses</Link>
          {firebaseUser || designMode ? (
            <>
              <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-md px-3 py-2 font-medium text-moss hover:bg-cloud hover:text-ink">
                <UserRound className="h-4 w-4" />
                Dashboard
              </Link>
              {apiUser?.role === "ADMIN" ? (
                <Link href="/admin" className="inline-flex items-center gap-2 rounded-md px-3 py-2 font-medium text-moss hover:bg-cloud hover:text-ink">
                  <BookOpenCheck className="h-4 w-4" />
                  Admin
                </Link>
              ) : null}
              {firebaseUser ? (
                <button
                  className="inline-flex items-center gap-2 rounded-md bg-ink px-3 py-2 font-medium text-white shadow-card transition hover:-translate-y-0.5"
                  onClick={() => logout()}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              ) : null}
            </>
          ) : (
            <Link href="/login" className="rounded-md bg-ink px-4 py-2 font-medium text-white shadow-card transition hover:-translate-y-0.5">Login</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
