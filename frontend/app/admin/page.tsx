"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BarChart3, CheckCircle2, Layers, Users } from "lucide-react";
import { Protected } from "@/components/protected";
import { useAuth } from "@/components/auth-provider";
import { apiFetch } from "@/lib/api";

type Analytics = {
  totals: {
    users: number;
    courses: number;
    activeLearners: number;
    completedLessons: number;
  };
  recentActivity: {
    id: string;
    user: { name: string | null; email: string };
    course: { title: string; sanityId: string };
  }[];
};

export default function AdminPage() {
  const { apiUser } = useAuth();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<Analytics>("/api/admin/analytics")
      .then(setAnalytics)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load analytics"));
  }, []);

  return (
    <Protected>
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="rounded-lg border border-mist bg-paper p-6 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-wide text-ocean">Magnafic operations</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">Course analytics</h1>
          <p className="mt-3 text-moss">Overview for {apiUser?.email}. Track Magnafic learners and course progress.</p>
        </div>
        {error ? <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div> : null}
        {analytics ? (
          <>
            <div className="mt-8 grid gap-4 md:grid-cols-4">
              <Metric icon={Users} label="Users" value={analytics.totals.users} />
              <Metric icon={Layers} label="Courses" value={analytics.totals.courses} />
              <Metric icon={BarChart3} label="Active learners" value={analytics.totals.activeLearners} />
              <Metric icon={CheckCircle2} label="Lessons completed" value={analytics.totals.completedLessons} />
            </div>
            <section className="mt-8 rounded-lg border border-mist bg-paper p-5 shadow-card">
              <h2 className="text-xl font-semibold">Recent learning activity</h2>
              <div className="mt-4 divide-y divide-mist">
                {analytics.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex flex-col justify-between gap-2 py-3 md:flex-row md:items-center">
                    <div>
                      <p className="font-medium">{activity.user.name || activity.user.email}</p>
                      <p className="text-sm text-moss">{activity.course.title}</p>
                    </div>
                    <Link href={`/courses/${activity.course.sanityId}`} className="text-sm font-medium text-coral">View course</Link>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : !error ? <p className="mt-6">Loading analytics...</p> : null}
      </section>
    </Protected>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-mist bg-paper p-5 shadow-card">
      <span className="grid h-10 w-10 place-items-center rounded-md bg-cloud">
        <Icon className="h-5 w-5 text-ocean" />
      </span>
      <p className="mt-4 text-sm text-moss">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
