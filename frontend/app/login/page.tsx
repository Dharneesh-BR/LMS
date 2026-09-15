"use client";

import { type FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, Chrome, GraduationCap, Mail } from "lucide-react";
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
  const [submitting, setSubmitting] = useState(false);

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
    if (!submitting && !loading && firebaseUser) {
      router.replace("/");
    }
  }, [firebaseUser, loading, router, submitting]);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    setError("");
    setSubmitting(true);
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
      setSubmitting(false);
    }
  }

  async function google() {
    setError("");
    setSubmitting(true);
    try {
      await loginWithGoogle();
      await finishAuth();
    } catch (err) {
      setError(getAuthErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <section className="grid min-h-screen w-full bg-cloud lg:h-screen lg:w-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:overflow-hidden">
      <div className="magnafic-premium-panel flex min-h-screen w-full items-center justify-center overflow-hidden px-6 py-10 text-center shadow-soft sm:px-10 lg:h-screen lg:min-h-0" style={{ borderRadius: 0 }}>
        <div className="relative z-10 grid gap-7 text-center">
          <div className="flex flex-col items-center">
            <Image src="/favicon.ico" alt="Magnafic icon" width={112} height={112} priority className="h-24 w-24 object-contain sm:h-28 sm:w-28" />
            <h1 className="mt-5 max-w-4xl text-center text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
              Your Journey to Top 1% Starts here.
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-center text-xl font-semibold leading-7 text-cyan-50 sm:text-lg sm:leading-8">
              Empowering Every Learner to Build Skills & Grow Faster.
            </p>
          </div>

          <div className="course-bulb-visual relative mx-auto flex min-h-[16rem] w-full max-w-[430px] items-center justify-center sm:min-h-[20rem] lg:min-h-[23rem]">
            <Image
              src="/course-learning-bulb-transparent-v2.png"
              alt="A glowing light bulb representing Magnafic learning and ideas"
              width={430}
              height={430}
              priority
              className="course-bulb-image relative z-10 h-auto w-full max-w-[280px] object-contain sm:max-w-[360px] lg:max-w-[400px]"
            />
          </div>
          <p className="text-center text-sm font-semibold text-cyan-50 sm:text-base">
            © Magnafic Business Consulting Pvt Ltd.
          </p>
        </div>
      </div>
      <form onSubmit={submit} className="flex min-h-screen w-full items-center justify-center overflow-hidden px-6 py-10 lg:h-screen lg:min-h-0 lg:px-14">
        <div className="w-full max-w-md">
          <div className="-mt-4 mb-10 flex justify-center">
            <Image src="/magnafic-logo.png" alt="Magnafic official logo" width={170} height={46} priority className="h-10 w-auto" />
          </div>
          <h2 className="mb-5 text-center text-2xl font-black text-ocean sm:text-3xl">Welcome</h2>
          <label className="text-sm font-bold text-gray-800">Email</label>
          <input className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-ocean focus:bg-white focus:ring-4 focus:ring-ocean/10" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <label className="mt-4 block text-sm font-bold text-gray-800">Password</label>
          <input className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-ocean focus:bg-white focus:ring-4 focus:ring-ocean/10" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />
          {mode === "signup" ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-800">
                  <BriefcaseBusiness className="h-4 w-4 text-ocean" />
                  Department
                </label>
                <input className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-ocean focus:bg-white focus:ring-4 focus:ring-ocean/10" value={department} onChange={(event) => setDepartment(event.target.value)} required={mode === "signup"} placeholder="Sales" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-800">
                  <GraduationCap className="h-4 w-4 text-coral" />
                  Designation
                </label>
                <input className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-ocean focus:bg-white focus:ring-4 focus:ring-ocean/10" value={designation} onChange={(event) => setDesignation(event.target.value)} required={mode === "signup"} placeholder="Manager" />
              </div>
            </div>
          ) : null}
          {error ? <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</p> : null}
          <button type="submit" disabled={submitting} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-ocean to-coral px-4 py-3 font-black text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-60">
            <Mail className="h-4 w-4" />
            {submitting ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
          </button>
          <button type="button" onClick={google} disabled={submitting} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 font-black text-ink shadow-card transition hover:-translate-y-0.5 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60">
            <Chrome className="h-4 w-4" />
            Continue with Google
          </button>
          <p className="mt-5 text-center text-sm font-semibold text-moss">
            {mode === "login" ? "Not signed up yet?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setError("");
                setMode(mode === "login" ? "signup" : "login");
              }}
              className="font-black text-ocean underline-offset-4 transition hover:text-coral hover:underline"
            >
              {mode === "login" ? "Create account" : "Login"}
            </button>
          </p>
          <a
            href="https://www.magnafic.com"
            target="_blank"
            rel="noreferrer"
            className="mt-4 block text-center text-sm font-black text-ocean underline-offset-4 transition hover:text-coral hover:underline"
          >
            www.magnafic.com
          </a>
        </div>
      </form>
    </section>
  );
}
