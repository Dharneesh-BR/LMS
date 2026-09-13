"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, CheckCircle2, Lock, PlayCircle, Trophy } from "lucide-react";
import { Protected } from "@/components/protected";
import { useAuth } from "@/components/auth-provider";
import { apiFetch } from "@/lib/api";

type DashboardCourse = {
  sanityId: string;
  routeId?: string;
  title: string;
  completedLessons: number;
  totalLessons: number;
  completionPercentage: number;
  lessons: Array<{
    id: string;
    title: string;
    moduleTitle: string;
    duration?: string;
    watchedSeconds: number;
    durationSeconds: number;
    completed: boolean;
    locked: boolean;
    percentage: number;
  }>;
  lastWatchedLessonId: string | null;
  updatedAt: string;
};

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

export default function DashboardPage() {
  const { apiUser, firebaseUser, loading } = useAuth();
  const [courses, setCourses] = useState<DashboardCourse[]>([]);

  useEffect(() => {
    if (loading || !firebaseUser) return;

    apiFetch<{ courses: DashboardCourse[] }>("/api/dashboard")
      .then((result) => setCourses(result.courses))
      .catch(() => setCourses([]));
  }, [firebaseUser, loading]);

  return (
    <Protected>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="magnafic-premium-panel p-6 shadow-soft sm:p-8">
        <div className="relative z-10 flex flex-col justify-between gap-6 text-center md:flex-row md:items-end md:text-left">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-coral">Magnafic learner hub</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-white">My courses</h1>
            <p className="mt-3 font-semibold text-cyan-50">Signed in as {apiUser?.email}. Continue your Magnafic self-paced courses.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-white backdrop-blur">
              <p className="text-cyan-100">Available courses</p>
              <p className="mt-1 text-2xl font-black">{courses.length}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 text-white backdrop-blur">
              <p className="text-cyan-100">Completed lessons</p>
              <p className="mt-1 text-2xl font-black">{courses.reduce((total, course) => total + course.completedLessons, 0)}</p>
            </div>
          </div>
        </div>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {courses.map((course) => {
            const courseId = course.routeId || course.sanityId;
            const programCoursePath = `/programs/courses/${courseId}`;
            const lessonBasePath = `${programCoursePath}/lessons`;

            return (
            <article key={course.sanityId} className="overflow-hidden rounded-3xl bg-white p-5 shadow-card ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-gray-950">{course.title}</h2>
                  <p className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-moss"><Trophy className="h-4 w-4 text-ocean" />{course.completedLessons} of {course.totalLessons} lessons completed</p>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-ocean/10">
                  <BookOpen className="h-5 w-5 text-ocean" />
                </span>
              </div>
              <div className="mt-5">
                <div className="flex items-center justify-between text-sm font-black text-ink">
                  <span>Course progress</span>
                  <span>{course.completionPercentage}%</span>
                </div>
                <div
                  className="mt-2 h-3 overflow-hidden rounded-full bg-mist"
                  role="progressbar"
                  aria-label={`${course.title} progress`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={course.completionPercentage}
                >
                  <div className="h-full rounded-full bg-gradient-to-r from-ocean to-coral transition-[width]" style={{ width: `${course.completionPercentage}%` }} />
                </div>
              </div>
              <div className="mt-5 flex gap-3">
                <Link href={programCoursePath} className="rounded-xl bg-ink px-4 py-2 text-sm font-black text-white transition hover:bg-ocean">
                  Course
                </Link>
                {course.lastWatchedLessonId ? (
                  <Link href={`${lessonBasePath}/${course.lastWatchedLessonId}`} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-ocean to-coral px-4 py-2 text-sm font-black text-white">
                    <PlayCircle className="h-4 w-4" />
                    Resume
                  </Link>
                ) : null}
              </div>
              <div className="mt-6 divide-y divide-gray-100 border-t border-gray-100">
                {course.lessons.map((lesson) => (
                  <div key={lesson.id} className="py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{lesson.title}</p>
                        <p className="mt-1 text-xs text-moss">
                          {lesson.completed
                            ? "Completed"
                            : lesson.watchedSeconds > 0
                              ? `${formatTime(lesson.watchedSeconds)} watched`
                              : "Not started"}
                        </p>
                      </div>
                      {lesson.locked ? (
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-gray-200 bg-cloud text-moss" aria-label={`${lesson.title} locked`}>
                          <Lock className="h-4 w-4" />
                        </span>
                      ) : (
                        <Link
                          href={`${lessonBasePath}/${lesson.id}`}
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-gray-200 text-ocean transition hover:bg-cloud"
                          aria-label={`${lesson.watchedSeconds > 0 && !lesson.completed ? "Resume" : "Open"} ${lesson.title}`}
                          title={lesson.watchedSeconds > 0 && !lesson.completed ? "Resume video" : "Open video"}
                        >
                          {lesson.completed ? <CheckCircle2 className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                        </Link>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div
                        className="h-1.5 flex-1 overflow-hidden rounded-full bg-mist"
                        role="progressbar"
                        aria-label={`${lesson.title} progress`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={lesson.percentage}
                      >
                        <div className="h-full rounded-full bg-gradient-to-r from-ocean to-coral transition-[width]" style={{ width: `${lesson.percentage}%` }} />
                      </div>
                      <span className="w-9 text-right text-xs font-medium text-moss">{lesson.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
            );
          })}
        </div>
        {!courses.length ? (
          <div className="mt-8 rounded-2xl border border-dashed border-coral/40 bg-white p-8 text-center shadow-card">
            <h2 className="text-xl font-black">No Magnafic courses yet</h2>
            <p className="mt-2 text-sm text-moss">Published courses will appear here when available.</p>
            <Link href="/" className="mt-5 inline-flex rounded-xl bg-gradient-to-r from-ocean to-coral px-5 py-3 font-black text-white">Explore courses</Link>
          </div>
        ) : null}
      </section>
    </Protected>
  );
}
