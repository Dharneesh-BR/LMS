"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, Chrome, GraduationCap, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { loginWithEmail, loginWithGoogle, signupWithEmail } from "@/lib/firebase";
import { apiFetch } from "@/lib/api";

function getAuthErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  const message = error instanceof Error ? error.message : "";
  const firebaseRestMessage =
    typeof error === "object" &&
    error &&
    "customData" in error &&
    typeof error.customData === "object" &&
    error.customData &&
    "_tokenResponse" in error.customData &&
    typeof error.customData._tokenResponse === "object" &&
    error.customData._tokenResponse &&
    "error" in error.customData._tokenResponse &&
    typeof error.customData._tokenResponse.error === "object" &&
    error.customData._tokenResponse.error &&
    "message" in error.customData._tokenResponse.error
      ? String(error.customData._tokenResponse.error.message)
      : "";

  const firebaseReason = `${code} ${firebaseRestMessage} ${message}`.toUpperCase();

  if (firebaseReason.includes("OPERATION_NOT_ALLOWED") || firebaseReason.includes("ADMIN_ONLY_OPERATION")) {
    return "This sign-in method is not enabled in Firebase Authentication.";
  }
  if (firebaseReason.includes("CONFIGURATION_NOT_FOUND")) {
    return "Firebase Authentication is not enabled for this project yet.";
  }
  if (firebaseReason.includes("EMAIL_EXISTS") || code === "auth/email-already-in-use") {
    return "An account already exists for this email address.";
  }
  if (firebaseReason.includes("WEAK_PASSWORD") || code === "auth/weak-password") {
    return "Choose a stronger password with at least 6 characters.";
  }
  if (firebaseReason.includes("INVALID_EMAIL") || code === "auth/invalid-email") {
    return "Enter a valid email address.";
  }
  if (firebaseReason.includes("INVALID_API_KEY") || code === "auth/invalid-api-key") {
    return "The Firebase API key is invalid. Check the frontend Firebase environment variables.";
  }
  if (firebaseReason.includes("API_KEY_SERVICE_BLOCKED") || firebaseReason.includes("APP_NOT_AUTHORIZED") || code === "auth/app-not-authorized") {
    return "This localhost app is not authorized for the Firebase API key. Check Firebase authorized domains and API key restrictions.";
  }

  switch (code) {
    case "auth/popup-closed-by-user":
      return "Google sign-in was cancelled.";
    case "auth/invalid-credential":
      return "The email or password is incorrect.";
    case "auth/too-many-requests":
      return "Firebase temporarily blocked this device after too many attempts. Try again shortly.";
    case "auth/network-request-failed":
      return "Firebase could not be reached. Check your internet connection and try again.";
    default:
      return message || "Authentication failed";
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { firebaseUser, loading, refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState("");

  async function finishAuth(profile?: { department: string; designation: string }, idToken?: string) {
    const authHeaders = idToken ? { Authorization: `Bearer ${idToken}` } : undefined;

    await apiFetch("/api/auth/verify", {
      method: "POST",
      headers: authHeaders
    });
    if (profile) {
      await apiFetch("/api/auth/profile", {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(profile)
      });
      await refreshUser();
    }
    router.push("/");
  }

  useEffect(() => {
    if (!loading && firebaseUser) {
      router.replace("/");
    }
  }, [firebaseUser, loading, router]);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    setError("");
    try {
      if (mode === "login") {
        await loginWithEmail(email, password);
        await finishAuth();
      } else {
        const profile = {
          department: department.trim(),
          designation: designation.trim()
        };

        if (!profile.department || !profile.designation) {
          setError("Department and designation are required to create your account.");
          return;
        }

        const credential = await signupWithEmail(email, password);
        await finishAuth(profile, await credential.user.getIdToken());
      }
    } catch (err) {
      setError(getAuthErrorMessage(err));
    }
  }

  async function google() {
    setError("");
    try {
      await loginWithGoogle();
      await finishAuth();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    }
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_440px] lg:px-8">
      <div className="magnafic-premium-panel self-center px-6 py-12 text-center shadow-soft sm:px-10 lg:text-left">
        <div className="relative z-10">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-coral">Magnafic learner access</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">Welcome back</h1>
          <p className="mx-auto mt-5 max-w-xl text-lg font-semibold leading-8 text-cyan-50 lg:mx-0">Sign in to access your purchased Magnafic self-paced courses, private video lessons, and learning progress.</p>
          <div className="mt-7 space-y-3 text-sm font-semibold text-cyan-50">
            <p className="flex items-center justify-center gap-2 lg:justify-start"><ShieldCheck className="h-4 w-4 text-coral" />Protected Magnafic lesson access</p>
            <p className="flex items-center justify-center gap-2 lg:justify-start"><ShieldCheck className="h-4 w-4 text-coral" />Your progress stays synced across devices</p>
          </div>
        </div>
      </div>
      <form onSubmit={submit} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-soft">
        <div className="mb-5 grid grid-cols-2 rounded-2xl bg-cloud p-1">
          <button type="button" className={`rounded-xl px-3 py-2 font-black transition ${mode === "login" ? "bg-white text-ocean shadow-sm" : "text-moss"}`} onClick={() => setMode("login")}>Login</button>
          <button type="button" className={`rounded-xl px-3 py-2 font-black transition ${mode === "signup" ? "bg-white text-ocean shadow-sm" : "text-moss"}`} onClick={() => setMode("signup")}>Signup</button>
        </div>
        <label className="text-sm font-bold text-gray-800">Email</label>
        <input className="mt-1 w-full rounded-xl border border-gray-200 bg-cloud px-4 py-3 outline-none transition focus:border-ocean focus:bg-white focus:ring-4 focus:ring-ocean/10" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <label className="mt-4 block text-sm font-bold text-gray-800">Password</label>
        <input className="mt-1 w-full rounded-xl border border-gray-200 bg-cloud px-4 py-3 outline-none transition focus:border-ocean focus:bg-white focus:ring-4 focus:ring-ocean/10" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />
        {mode === "signup" ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-800">
                <BriefcaseBusiness className="h-4 w-4 text-ocean" />
                Department
              </label>
              <input className="mt-1 w-full rounded-xl border border-gray-200 bg-cloud px-4 py-3 outline-none transition focus:border-ocean focus:bg-white focus:ring-4 focus:ring-ocean/10" value={department} onChange={(event) => setDepartment(event.target.value)} required={mode === "signup"} placeholder="Sales" />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-800">
                <GraduationCap className="h-4 w-4 text-coral" />
                Designation
              </label>
              <input className="mt-1 w-full rounded-xl border border-gray-200 bg-cloud px-4 py-3 outline-none transition focus:border-ocean focus:bg-white focus:ring-4 focus:ring-ocean/10" value={designation} onChange={(event) => setDesignation(event.target.value)} required={mode === "signup"} placeholder="Manager" />
            </div>
          </div>
        ) : null}
        {error ? <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</p> : null}
        <button type="submit" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-ocean to-coral px-4 py-3 font-black text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-glow">
          <Mail className="h-4 w-4" />
          {mode === "login" ? "Login" : "Create account"}
        </button>
        <button type="button" onClick={google} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 font-black shadow-card transition hover:-translate-y-0.5 hover:bg-cloud">
          <Chrome className="h-4 w-4" />
          Continue with Google
        </button>
      </form>
    </section>
  );
}
