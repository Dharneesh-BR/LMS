"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Award,
  BarChart3,
  CheckCircle2,
  GraduationCap,
  Layers,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Protected } from "@/components/protected";
import { useAuth } from "@/components/auth-provider";
import { apiFetch } from "@/lib/api";

type CountItem = {
  label: string;
  count: number;
};

type Analytics = {
  totals: {
    users: number;
    courses: number;
    activeLearners: number;
    startedCourses: number;
    completedLessons: number;
    completedCourses: number;
    certificates: number;
    assessmentAttempts: number;
    passedAssessments: number;
    finalPasses: number;
  };
  breakdowns: {
    departments: CountItem[];
    designations: CountItem[];
  };
  coursePerformance: {
    id: string;
    sanityId: string;
    title: string;
    learnerCount: number;
    completedLessons: number;
    completions: number;
    certificates: number;
    latestActivityAt: string | null;
  }[];
  recentActivity: {
    id: string;
    completed: boolean;
    updatedAt: string;
    user: { name: string | null; email: string; department?: string | null; designation?: string | null };
    course: { title: string; sanityId: string };
  }[];
  recentUsers: {
    id: string;
    name: string | null;
    email: string;
    department?: string | null;
    designation?: string | null;
    role: "STUDENT" | "ADMIN";
    createdAt: string;
  }[];
};

function formatDate(value?: string | null) {
  if (!value) return "No activity";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function passRate(analytics: Analytics) {
  if (!analytics.totals.assessmentAttempts) return 0;
  return Math.round((analytics.totals.passedAssessments / analytics.totals.assessmentAttempts) * 100);
}

export default function AdminPage() {
  const { apiUser, firebaseUser, loading } = useAuth();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading || !firebaseUser || !apiUser) return;

    if (apiUser.role !== "ADMIN") {
      setError("Admin access required");
      setAnalytics(null);
      return;
    }

    setError("");
    apiFetch<Analytics>("/api/admin/analytics")
      .then(setAnalytics)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load analytics"));
  }, [apiUser, firebaseUser, loading]);

  const topCourse = useMemo(() => {
    return [...(analytics?.coursePerformance || [])].sort(
      (a, b) => b.learnerCount - a.learnerCount || b.completedLessons - a.completedLessons
    )[0];
  }, [analytics?.coursePerformance]);

  return (
    <Protected>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="magnafic-premium-panel overflow-hidden p-6 shadow-soft sm:p-8">
          <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-coral">Magnafic admin command center</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">Learning operations dashboard</h1>
              <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-cyan-50">
                Monitor learners, course engagement, completions, certificates, and department coverage from one place.
              </p>
            </div>
            <div className="rounded-lg border border-white/15 bg-white/10 p-5 text-white backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-white/15">
                  <ShieldCheck className="h-5 w-5 text-cyan-100" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-cyan-100">Signed in admin</p>
                  <p className="mt-1 truncate text-lg font-black">{apiUser?.email}</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <HeroStat label="Courses" value={analytics?.totals.courses ?? 0} />
                <HeroStat label="Learners" value={analytics?.totals.users ?? 0} />
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 font-semibold text-red-700">{error}</div>
        ) : null}

        {analytics ? (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric icon={Users} label="Total learners" value={analytics.totals.users} tone="cyan" />
              <Metric icon={Activity} label="Active learners" value={analytics.totals.activeLearners} tone="blue" />
              <Metric icon={CheckCircle2} label="Lessons completed" value={analytics.totals.completedLessons} tone="green" />
              <Metric icon={Award} label="Certificates issued" value={analytics.totals.certificates} tone="violet" />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <section className="rounded-lg bg-white p-5 shadow-card ring-1 ring-gray-100">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-ocean">Course performance</p>
                    <h2 className="mt-1 text-2xl font-black text-gray-950">Assigned course progress</h2>
                  </div>
                  <div className="rounded-lg bg-cyan-50 px-4 py-3 text-sm font-black text-ocean">
                    {analytics.totals.startedCourses} courses started
                  </div>
                </div>

                <div className="mt-5 overflow-x-auto rounded-lg border border-gray-100">
                  <div className="min-w-[42rem]">
                    <div className="grid grid-cols-[minmax(12rem,1fr)_7rem_7rem_7rem] bg-cloud px-4 py-3 text-xs font-black uppercase tracking-wide text-moss">
                      <span>Course</span>
                      <span className="text-right">Learners</span>
                      <span className="text-right">Lessons</span>
                      <span className="text-right">Done</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {analytics.coursePerformance.map((course) => (
                        <div key={course.id} className="grid grid-cols-[minmax(12rem,1fr)_7rem_7rem_7rem] items-center px-4 py-4">
                          <div className="min-w-0">
                            <Link href={`/courses/${course.sanityId}`} className="truncate text-sm font-black text-gray-950 transition hover:text-ocean">
                              {course.title}
                            </Link>
                            <p className="mt-1 text-xs font-semibold text-moss">Last activity: {formatDate(course.latestActivityAt)}</p>
                          </div>
                          <span className="text-right text-sm font-black text-gray-950">{course.learnerCount}</span>
                          <span className="text-right text-sm font-black text-gray-950">{course.completedLessons}</span>
                          <span className="text-right text-sm font-black text-gray-950">{course.completions}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <aside className="grid gap-6">
                <section className="rounded-lg bg-white p-5 shadow-card ring-1 ring-gray-100">
                  <p className="text-xs font-black uppercase tracking-wide text-ocean">Snapshot</p>
                  <div className="mt-4 grid gap-3">
                    <Snapshot icon={Layers} label="Published courses" value={analytics.totals.courses} />
                    <Snapshot icon={GraduationCap} label="Course completions" value={analytics.totals.completedCourses} />
                    <Snapshot icon={BarChart3} label="Assessment pass rate" value={`${passRate(analytics)}%`} />
                    <Snapshot icon={Sparkles} label="Final tests passed" value={analytics.totals.finalPasses} />
                  </div>
                </section>

                <section className="rounded-lg bg-white p-5 shadow-card ring-1 ring-gray-100">
                  <p className="text-xs font-black uppercase tracking-wide text-ocean">Top course</p>
                  {topCourse ? (
                    <div className="mt-4 rounded-lg bg-gradient-to-br from-cyan-50 to-white p-4">
                      <p className="text-lg font-black text-gray-950">{topCourse.title}</p>
                      <p className="mt-2 text-sm font-semibold text-moss">
                        {topCourse.learnerCount} learners and {topCourse.completedLessons} completed lessons.
                      </p>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm font-semibold text-moss">Course activity will appear here after learners start.</p>
                  )}
                </section>
              </aside>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Breakdown title="Department coverage" items={analytics.breakdowns.departments} />
              <Breakdown title="Designation coverage" items={analytics.breakdowns.designations} />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
              <section className="rounded-lg bg-white p-5 shadow-card ring-1 ring-gray-100">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-ocean">Recent activity</p>
                    <h2 className="mt-1 text-2xl font-black text-gray-950">Learner progress feed</h2>
                  </div>
                  <TrendingUp className="h-6 w-6 text-coral" />
                </div>
                <div className="mt-5 divide-y divide-gray-100">
                  {analytics.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-gray-950">{activity.user.name || activity.user.email}</p>
                        <p className="mt-1 text-sm font-semibold text-moss">{activity.course.title}</p>
                        <p className="mt-1 text-xs font-semibold text-moss">
                          {[activity.user.department, activity.user.designation].filter(Boolean).join(" / ") || "Profile not set"}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-ocean">
                        {activity.completed ? "Completed lesson" : "In progress"}
                      </span>
                    </div>
                  ))}
                  {!analytics.recentActivity.length ? <p className="py-4 text-sm font-semibold text-moss">No learner activity yet.</p> : null}
                </div>
              </section>

              <section className="rounded-lg bg-white p-5 shadow-card ring-1 ring-gray-100">
                <p className="text-xs font-black uppercase tracking-wide text-ocean">New learners</p>
                <div className="mt-4 divide-y divide-gray-100">
                  {analytics.recentUsers.map((user) => (
                    <div key={user.id} className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-gray-950">{user.name || user.email}</p>
                          <p className="mt-1 truncate text-xs font-semibold text-moss">{user.email}</p>
                        </div>
                        <span className="rounded-full bg-cloud px-2.5 py-1 text-[0.7rem] font-black uppercase text-moss">
                          {user.role}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-moss">
                        {[user.department, user.designation].filter(Boolean).join(" / ") || "Profile not set"} · {formatDate(user.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        ) : !error ? (
          <div className="mt-6 rounded-lg bg-white p-6 font-semibold text-moss shadow-card ring-1 ring-gray-100">Loading admin dashboard...</div>
        ) : null}
      </section>
    </Protected>
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/15 bg-white/10 p-3">
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs font-bold text-cyan-100">{label}</p>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: number; tone: "cyan" | "blue" | "green" | "violet" }) {
  const tones = {
    cyan: "bg-cyan-50 text-ocean",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    violet: "bg-violet-50 text-violet-700"
  };

  return (
    <div className="rounded-lg bg-white p-5 shadow-card ring-1 ring-gray-100">
      <span className={`grid h-11 w-11 place-items-center rounded-lg ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 text-sm font-bold text-moss">{label}</p>
      <p className="mt-1 text-3xl font-black text-gray-950">{value}</p>
    </div>
  );
}

function Snapshot({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-cloud px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-ocean">
          <Icon className="h-4 w-4" />
        </span>
        <p className="text-sm font-bold text-moss">{label}</p>
      </div>
      <p className="font-black text-gray-950">{value}</p>
    </div>
  );
}

function Breakdown({ title, items }: { title: string; items: CountItem[] }) {
  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <section className="rounded-lg bg-white p-5 shadow-card ring-1 ring-gray-100">
      <p className="text-xs font-black uppercase tracking-wide text-ocean">{title}</p>
      <div className="mt-4 grid gap-4">
        {items.slice(0, 6).map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <p className="font-black text-gray-950">{item.label}</p>
              <p className="font-bold text-moss">{item.count}</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-mist">
              <div className="h-full rounded-full bg-gradient-to-r from-ocean to-coral" style={{ width: `${Math.max(8, (item.count / max) * 100)}%` }} />
            </div>
          </div>
        ))}
        {!items.length ? <p className="text-sm font-semibold text-moss">No learner data yet.</p> : null}
      </div>
    </section>
  );
}
