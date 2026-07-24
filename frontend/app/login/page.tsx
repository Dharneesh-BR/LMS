"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Chrome, Mail, ShieldCheck } from "lucide-react";
import { loginWithEmail, loginWithGoogle, signupWithEmail } from "@/lib/firebase";

function getAuthErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";

  switch (code) {
    case "auth/configuration-not-found":
      return "Firebase Authentication is not enabled for this project yet.";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled in Firebase Authentication.";
    case "auth/popup-closed-by-user":
      return "Google sign-in was cancelled.";
    case "auth/invalid-credential":
      return "The email or password is incorrect.";
    case "auth/email-already-in-use":
      return "An account already exists for this email address.";
    case "auth/weak-password":
      return "Choose a stronger password with at least 6 characters.";
    default:
      return error instanceof Error ? error.message : "Authentication failed";
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState("");

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    setError("");
    try {
      if (mode === "login") {
        await loginWithEmail(email, password);
      } else {
        await signupWithEmail(email, password);
      }
      router.push("/dashboard");
    } catch (err) {
      setError(getAuthErrorMessage(err));
    }
  }

  async function google() {
    setError("");
    try {
      await loginWithGoogle();
      router.push("/dashboard");
    } catch (err) {
      setError(getAuthErrorMessage(err));
    }
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-14 md:grid-cols-[1fr_440px]">
      <div className="self-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-ocean">Magnafic learner access</p>
        <h1 className="mt-2 text-5xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-moss">Sign in to access your purchased Magnafic pre-recorded courses, private video lessons, and learning progress.</p>
        <div className="mt-6 space-y-3 text-sm text-moss">
          <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-coral" />Protected Magnafic lesson access</p>
          <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-coral" />Your progress stays synced across devices</p>
        </div>
      </div>
      <form onSubmit={submit} className="rounded-lg border border-mist bg-paper p-6 shadow-soft">
        <div className="mb-5 grid grid-cols-2 rounded-md bg-mist p-1">
          <button type="button" className={`rounded px-3 py-2 ${mode === "login" ? "bg-paper shadow-sm" : ""}`} onClick={() => setMode("login")}>Login</button>
          <button type="button" className={`rounded px-3 py-2 ${mode === "signup" ? "bg-paper shadow-sm" : ""}`} onClick={() => setMode("signup")}>Signup</button>
        </div>
        <label className="text-sm font-medium">Email</label>
        <input className="mt-1 w-full rounded-md border border-mist bg-cloud px-3 py-2" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <label className="mt-4 block text-sm font-medium">Password</label>
        <input className="mt-1 w-full rounded-md border border-mist bg-cloud px-3 py-2" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <button type="submit" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 font-semibold text-white shadow-card transition hover:-translate-y-0.5">
          <Mail className="h-4 w-4" />
          {mode === "login" ? "Login" : "Create account"}
        </button>
        <button type="button" onClick={google} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-mist bg-paper px-4 py-3 font-semibold shadow-card transition hover:-translate-y-0.5">
          <Chrome className="h-4 w-4" />
          Continue with Google
        </button>
      </form>
    </section>
  );
}
