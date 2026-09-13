"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, LogOut, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { logout } from "@/lib/firebase";

export function Header() {
  const { firebaseUser, apiUser } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isSignedIn = Boolean(firebaseUser);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  if (pathname === "/login") return null;

  async function handleLogout() {
    setOpen(false);
    await logout();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3 text-lg font-semibold text-ink">
          <Image src="/magnafic-logo.png" alt="Magnafic official logo" width={146} height={40} priority className="h-7 w-auto sm:h-8" />
        </Link>

        {isSignedIn ? (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-r from-ocean to-coral text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-glow"
              aria-label="Open profile menu"
              aria-expanded={open}
            >
              <UserRound className="h-5 w-5" />
            </button>

            {open ? (
              <div className="absolute right-0 mt-3 w-[min(21rem,calc(100vw-2rem))] rounded-2xl border border-gray-100 bg-white p-4 text-sm shadow-soft">
                <div className="flex items-start gap-3 border-b border-gray-100 pb-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ocean/10 text-ocean">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-black text-gray-950">{apiUser?.name || firebaseUser?.displayName || "Learner"}</p>
                    <p className="mt-1 truncate font-semibold text-moss">{apiUser?.email || firebaseUser?.email}</p>
                  </div>
                </div>

                <div className="grid gap-3 py-4">
                  <ProfileDetail label="Department" value={apiUser?.department || "Not set"} />
                  <ProfileDetail label="Designation" value={apiUser?.designation || "Not set"} />
                </div>

                {firebaseUser ? (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 font-black text-white transition hover:bg-ocean"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <Link href="/login" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-ocean to-coral px-5 py-2 font-bold text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-glow">
            <LogIn className="h-4 w-4" />
            Login
          </Link>
        )}
      </div>
    </header>
  );
}

function ProfileDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-wide text-moss">{label}</p>
      <p className="mt-1 font-bold text-gray-950">{value}</p>
    </div>
  );
}
