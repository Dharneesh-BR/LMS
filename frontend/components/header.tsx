"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { KeyRound, LayoutDashboard, LogIn, LogOut, UserRound } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { changeCurrentUserPassword, logout } from "@/lib/firebase";

function getPasswordErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  const message = error instanceof Error ? error.message : "";

  switch (code) {
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Current password is incorrect.";
    case "auth/weak-password":
      return "Choose a stronger password with at least 6 characters.";
    case "auth/requires-recent-login":
      return "Please logout, login again, and then change your password.";
    case "auth/too-many-requests":
      return "Firebase temporarily blocked this device after too many attempts. Try again shortly.";
    case "auth/network-request-failed":
      return "Firebase could not be reached. Check your internet connection and try again.";
    default:
      return message || "Could not change password.";
  }
}

export function Header() {
  const { firebaseUser, apiUser } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
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
    setPasswordModalOpen(false);
    await logout();
  }

  function openPasswordModal() {
    setOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setPasswordNotice("");
    setPasswordModalOpen(true);
  }

  async function handlePasswordChange(event: FormEvent) {
    event.preventDefault();
    setPasswordError("");
    setPasswordNotice("");

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    setPasswordSubmitting(true);
    try {
      await changeCurrentUserPassword(currentPassword, newPassword);
      setPasswordNotice("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPasswordError(getPasswordErrorMessage(error));
    } finally {
      setPasswordSubmitting(false);
    }
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
                  <div className="grid gap-2">
                    {apiUser?.role === "ADMIN" ? (
                      <Link
                        href="/admin"
                        onClick={() => setOpen(false)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-ocean to-coral px-4 py-3 font-black text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-glow"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Admin dashboard
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={openPasswordModal}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 font-black text-ink transition hover:border-ocean/30 hover:bg-cyan-50 hover:text-ocean"
                    >
                      <KeyRound className="h-4 w-4" />
                      Change password
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 font-black text-white transition hover:bg-ocean"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
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
      {passwordModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 px-4 py-6 backdrop-blur-sm">
          <form onSubmit={handlePasswordChange} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-ocean">Account security</p>
                <h2 className="mt-1 text-2xl font-black text-gray-950">Change password</h2>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-full bg-gray-100 font-black text-moss transition hover:bg-cyan-50 hover:text-ocean"
                aria-label="Close password form"
              >
                ×
              </button>
            </div>

            <label className="mt-5 block text-sm font-bold text-gray-800">Current password</label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-ocean focus:ring-4 focus:ring-ocean/10"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />

            <label className="mt-4 block text-sm font-bold text-gray-800">New password</label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-ocean focus:ring-4 focus:ring-ocean/10"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={6}
              required
            />

            <label className="mt-4 block text-sm font-bold text-gray-800">Confirm new password</label>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-ocean focus:ring-4 focus:ring-ocean/10"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={6}
              required
            />

            {passwordError ? <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{passwordError}</p> : null}
            {passwordNotice ? <p className="mt-3 rounded-xl bg-cyan-50 px-4 py-3 text-sm font-semibold text-ocean">{passwordNotice}</p> : null}

            <button
              type="submit"
              disabled={passwordSubmitting}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-ocean to-coral px-4 py-3 font-black text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
            >
              <KeyRound className="h-4 w-4" />
              {passwordSubmitting ? "Updating..." : "Update password"}
            </button>
          </form>
        </div>
      ) : null}
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
