"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, CheckCircle2, Lock, PlayCircle, Trophy } from "lucide-react";
import { Protected } from "@/components/protected";
import { useAuth } from "@/components/auth-provider";
import { apiFetch } from "@/lib/api";

type DashboardCourse = {
  sanityId: string;
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
  const { apiUser } = useAuth();
  const [courses, setCourses] = useState<DashboardCourse[]>([]);

  useEffect(() => {
    apiFetch<{ courses: DashboardCourse[] }>("/api/dashboard")
      .then((result) => setCourses(result.courses))
      .catch(() => setCourses([]));
  }, []);

  return (
    <Protected>
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="rounded-lg border border-mist bg-paper p-6 shadow-soft">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-ocean">Magnafic learner hub</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight">My courses</h1>
            <p className="mt-3 text-moss">Signed in as {apiUser?.email}. Continue your Magnafic pre-recorded courses.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-mist bg-cloud p-4">
              <p className="text-moss">Available courses</p>
              <p className="mt-1 text-2xl font-bold">{courses.length}</p>
            </div>
            <div className="rounded-lg border border-mist bg-cloud p-4">
              <p className="text-moss">Completed lessons</p>
              <p className="mt-1 text-2xl font-bold">{courses.reduce((total, course) => total + course.completedLessons, 0)}</p>
            </div>
          </div>
        </div>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {courses.map((course) => (
            <article key={course.sanityId} className="rounded-lg border border-mist bg-paper p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{course.title}</h2>
                  <p className="mt-2 inline-flex items-center gap-1 text-sm text-moss"><Trophy className="h-4 w-4" />{course.completedLessons} of {course.totalLessons} lessons completed</p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-md bg-cloud">
                  <BookOpen className="h-5 w-5 text-ocean" />
                </span>
              </div>
              <div className="mt-5">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>Course progress</span>
                  <span>{course.completionPercentage}%</span>
                </div>
                <div
                  className="mt-2 h-2 overflow-hidden rounded-full bg-mist"
                  role="progressbar"
                  aria-label={`${course.title} progress`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={course.completionPercentage}
                >
                  <div className="h-full rounded-full bg-coral transition-[width]" style={{ width: `${course.completionPercentage}%` }} />
                </div>
              </div>
              <div className="mt-5 flex gap-3">
                <Link href={`/courses/${course.sanityId}`} className="rounded-md bg-ink px-3 py-2 text-sm font-medium text-white">
                  Course
                </Link>
                {course.lastWatchedLessonId ? (
                  <Link href={`/courses/${course.sanityId}/lessons/${course.lastWatchedLessonId}`} className="inline-flex items-center gap-2 rounded-md bg-coral px-3 py-2 text-sm text-white">
                    <PlayCircle className="h-4 w-4" />
                    Resume
                  </Link>
                ) : null}
              </div>
              <div className="mt-6 divide-y divide-mist border-t border-mist">
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
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-mist bg-cloud text-moss" aria-label={`${lesson.title} locked`}>
                          <Lock className="h-4 w-4" />
                        </span>
                      ) : (
                        <Link
                          href={`/courses/${course.sanityId}/lessons/${lesson.id}`}
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-mist text-ocean transition hover:bg-cloud"
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
                        <div className="h-full rounded-full bg-ocean transition-[width]" style={{ width: `${lesson.percentage}%` }} />
                      </div>
                      <span className="w-9 text-right text-xs font-medium text-moss">{lesson.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
        {!courses.length ? (
          <div className="mt-8 rounded-lg border border-dashed border-mist bg-paper p-8 text-center shadow-card">
            <h2 className="text-xl font-semibold">No Magnafic courses yet</h2>
            <p className="mt-2 text-sm text-moss">Published courses will appear here when available.</p>
            <Link href="/" className="mt-5 inline-flex rounded-md bg-coral px-4 py-2 font-semibold text-white">Explore courses</Link>
          </div>
        ) : null}
      </section>
    </Protected>
  );
}
