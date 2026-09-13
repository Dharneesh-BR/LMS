"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, GraduationCap } from "lucide-react";
import { Protected } from "@/components/protected";
import { useAuth } from "@/components/auth-provider";
import { apiFetch } from "@/lib/api";
import type { ApiUser } from "@/lib/types";

export default function AccountSetupPage() {
  const router = useRouter();
  const { apiUser, loading, refreshUser } = useAuth();
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!apiUser) return;
    setDepartment(apiUser.department || "");
    setDesignation(apiUser.designation || "");
  }, [apiUser]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      await apiFetch<{ user: ApiUser }>("/api/auth/profile", {
        method: "PUT",
        body: JSON.stringify({ department, designation })
      });
      await refreshUser();
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Protected>
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_460px] lg:px-8">
        <div className="magnafic-premium-panel self-center px-6 py-12 text-center shadow-soft sm:px-10 lg:text-left">
          <div className="relative z-10">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-coral">Account setup</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">Personalize your courses</h1>
            <p className="mx-auto mt-5 max-w-xl text-lg font-semibold leading-8 text-cyan-50 lg:mx-0">
              Add your department and designation once. Magnafic Academy will use them to show the most relevant courses automatically.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-3xl border border-gray-100 bg-white p-6 shadow-soft">
          <div className="rounded-2xl bg-cloud p-4">
            <p className="text-sm font-black text-ink">{apiUser?.email || "Learner profile"}</p>
            <p className="mt-1 text-sm font-semibold text-moss">These details control which courses appear in your learner experience.</p>
          </div>

          <label className="mt-5 block text-sm font-bold text-gray-800">Department</label>
          <div className="mt-1 flex items-center gap-3 rounded-xl border border-gray-200 bg-cloud px-4 py-3 transition focus-within:border-ocean focus-within:bg-white focus-within:ring-4 focus-within:ring-ocean/10">
            <BriefcaseBusiness className="h-4 w-4 shrink-0 text-ocean" />
            <input
              className="w-full bg-transparent outline-none"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              placeholder="Sales, Marketing, Operations..."
              required
            />
          </div>

          <label className="mt-4 block text-sm font-bold text-gray-800">Designation</label>
          <div className="mt-1 flex items-center gap-3 rounded-xl border border-gray-200 bg-cloud px-4 py-3 transition focus-within:border-ocean focus-within:bg-white focus-within:ring-4 focus-within:ring-ocean/10">
            <GraduationCap className="h-4 w-4 shrink-0 text-ocean" />
            <input
              className="w-full bg-transparent outline-none"
              value={designation}
              onChange={(event) => setDesignation(event.target.value)}
              placeholder="Executive, Manager, Director..."
              required
            />
          </div>

          {error ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</p> : null}

          <button type="submit" disabled={saving || loading} className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-ocean to-coral px-4 py-3 font-black text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? "Saving..." : "Save and continue"}
          </button>
        </form>
      </section>
    </Protected>
  );
}
