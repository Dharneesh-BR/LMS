"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Award,
  BarChart3,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  GraduationCap,
  Layers,
  Sparkles,
  TrendingUp,
  Users
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Protected } from "@/components/protected";
import { useAuth } from "@/components/auth-provider";
import { apiDownloadFile, apiFetch } from "@/lib/api";

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

const reportOptions = [
  { type: "all", title: "Complete LMS workbook", description: "All report sheets in one Excel file." },
  { type: "learners", title: "Learner report", description: "Users, departments, designations, and activity totals." },
  { type: "courses", title: "Course report", description: "Course-wise learners, completions, certificates, and attempts." },
  { type: "progress", title: "Lesson progress report", description: "Lesson-level watch time and completion records." },
  { type: "completions", title: "Completion report", description: "Completed courses with certificate status." },
  { type: "assessments", title: "Assessment report", description: "Attempts, scores, pass status, and attempt numbers." },
  { type: "certificates", title: "Certificate report", description: "Issued certificates and LinkedIn sharing status." },
  { type: "enrollments", title: "Enrollment report", description: "Enrollment records and payment status." },
  { type: "orders", title: "Order report", description: "Order, payment, amount, and status details." }
];

function formatDate(value?: string | null) {
  if (!value) return "No activity";
  return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function passRate(analytics: Analytics) {
  if (!analytics.totals.assessmentAttempts) return 0;
  return Math.round((analytics.totals.passedAssessments / analytics.totals.assessmentAttempts) * 100);
}

function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}

export default function AdminPage() {
  const { apiUser, firebaseUser, loading } = useAuth();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);

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

  const metricCards = useMemo(() => {
    if (!analytics) return [];

    return [
      {
        icon: Users,
        label: "Learners",
        value: analytics.totals.users,
        helper: `${analytics.totals.activeLearners} active`,
        progress: percent(analytics.totals.activeLearners, analytics.totals.users),
        tone: "peach" as const
      },
      {
        icon: Layers,
        label: "Courses",
        value: analytics.totals.courses,
        helper: `${analytics.totals.startedCourses} started`,
        progress: percent(analytics.totals.startedCourses, analytics.totals.courses),
        tone: "rose" as const
      },
      {
        icon: CheckCircle2,
        label: "Lessons",
        value: analytics.totals.completedLessons,
        helper: `${analytics.totals.completedCourses} courses completed`,
        progress: percent(analytics.totals.completedCourses, analytics.totals.startedCourses),
        tone: "mint" as const
      },
      {
        icon: Award,
        label: "Certificates",
        value: analytics.totals.certificates,
        helper: `${passRate(analytics)}% assessment pass rate`,
        progress: passRate(analytics),
        tone: "sky" as const
      }
    ];
  }, [analytics]);

  async function handleReportDownload(type: string) {
    setDownloadError("");
    setDownloadingReport(type);
    try {
      await apiDownloadFile(`/api/admin/reports/${type}`, `magnafic-lms-${type}-report.xlsx`);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Unable to download report");
    } finally {
      setDownloadingReport(null);
    }
  }

  return (
    <Protected>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-ocean">Magnafic admin</p>
          <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">Learning operations dashboard</h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-moss">
                Monitor learners, course engagement, completions, certificates, and department coverage from one place.
              </p>
            </div>
            <div className="rounded-lg bg-white px-4 py-3 text-sm font-bold text-moss shadow-card ring-1 ring-gray-100">
              Signed in as <span className="font-black text-gray-950">{apiUser?.email}</span>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 font-semibold text-red-700">{error}</div>
        ) : null}

        {analytics ? (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metricCards.map((metric) => (
                <Metric key={metric.label} {...metric} />
              ))}
            </div>

            <section className="mt-6 rounded-lg bg-white p-5 shadow-card ring-1 ring-gray-100">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-ocean">Excel reports</p>
                  <h2 className="mt-1 text-2xl font-black text-gray-950">Generate and download reports</h2>
                  <p className="mt-2 max-w-2xl text-sm font-semibold text-moss">
                    Download admin-only Excel workbooks for learners, progress, completions, assessments, certificates, enrollments, and orders.
                  </p>
                </div>
                <FileSpreadsheet className="h-8 w-8 text-ocean" />
              </div>

              {downloadError ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{downloadError}</div>
              ) : null}

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {reportOptions.map((report) => (
                  <button
                    key={report.type}
                    type="button"
                    onClick={() => handleReportDownload(report.type)}
                    disabled={Boolean(downloadingReport)}
                    className="group flex h-full items-center justify-between gap-4 rounded-lg border border-gray-100 bg-cloud p-4 text-left transition hover:border-cyan-200 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-black text-gray-950">{report.title}</span>
                      <span className="mt-1 block text-xs font-semibold leading-5 text-moss">{report.description}</span>
                    </span>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-ocean shadow-sm transition group-hover:bg-gradient-to-r group-hover:from-indigo-700 group-hover:to-cyan-400 group-hover:text-white">
                      <Download className="h-4 w-4" />
                    </span>
                  </button>
                ))}
              </div>
              {downloadingReport ? <p className="mt-3 text-sm font-semibold text-moss">Preparing Excel report...</p> : null}
            </section>

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

function Metric({
  icon: Icon,
  label,
  value,
  helper,
  progress,
  tone
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  helper: string;
  progress: number;
  tone: "peach" | "rose" | "mint" | "sky";
}) {
  const tones = {
    peach: {
      card: "bg-[#fff4df]",
      icon: "bg-[#ff806b] text-white",
      ring: "#ff806b",
      ghost: "#ffd7c9"
    },
    rose: {
      card: "bg-[#ffe2ea]",
      icon: "bg-[#ef3f79] text-white",
      ring: "#ef3f79",
      ghost: "#f9b8cd"
    },
    mint: {
      card: "bg-[#ddffe8]",
      icon: "bg-[#37c965] text-white",
      ring: "#37c965",
      ghost: "#a9efbd"
    },
    sky: {
      card: "bg-[#e4f6ff]",
      icon: "bg-[#1da8e8] text-white",
      ring: "#1da8e8",
      ghost: "#a8ddf6"
    }
  };
  const currentTone = tones[tone];

  return (
    <div className={`rounded-lg p-5 shadow-card ring-1 ring-white/70 ${currentTone.card}`}>
      <div className="flex items-start justify-between gap-4">
        <span className={`grid h-12 w-12 place-items-center rounded-full ${currentTone.icon}`}>
          <Icon className="h-5 w-5" />
        </span>
        <CircularMetricProgress value={progress} color={currentTone.ring} trackColor={currentTone.ghost} />
      </div>
      <p className="mt-5 text-3xl font-black text-ink">{String(value).padStart(2, "0")}</p>
      <p className="mt-1 text-base font-black text-gray-950">{label}</p>
      <p className="mt-1 text-xs font-bold text-[#615f8e]">{helper}</p>
    </div>
  );
}

function CircularMetricProgress({ value, color, trackColor }: { value: number; color: string; trackColor: string }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative h-16 w-16">
      <svg className="h-16 w-16 -rotate-90" viewBox="0 0 56 56" aria-hidden="true">
        <circle cx="28" cy="28" r={radius} fill="none" stroke={trackColor} strokeWidth="8" />
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[11px] font-black" style={{ color }}>{clamped}%</span>
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
