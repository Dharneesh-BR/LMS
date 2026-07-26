"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PortableText } from "@portabletext/react";
import { BookOpen, Clock, Lock, LogIn, PlayCircle } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { apiFetch } from "@/lib/api";
import type { Course } from "@/lib/types";
import { designMode } from "@/lib/design-mode";

export default function CourseDetailPage({ params }: { params: { courseId: string } }) {
  const { firebaseUser, loading: authLoading } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [completedLessons, setCompletedLessons] = useState(0);
  const [lastWatchedLessonId, setLastWatchedLessonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;

    async function loadCourse() {
      setLoading(true);
      setError("");
      try {
        const result = await apiFetch<{ course: Course }>(`/api/course/${params.courseId}`);
        setCourse(result.course);

        if (firebaseUser || designMode) {
          const progress = await apiFetch<{ completed: number; lastWatchedLessonId: string | null }>(`/api/progress/${params.courseId}`);
          setCompletedLessons(progress.completed);
          setLastWatchedLessonId(progress.lastWatchedLessonId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load course");
      } finally {
        setLoading(false);
      }
    }

    loadCourse();
  }, [authLoading, firebaseUser, params.courseId]);

  const totalLessons = course?.modules?.reduce((count, module) => count + (module.lessons?.length || 0), 0) || 0;
  const completion = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const firstLessonId = course?.modules?.flatMap((module) => module.lessons || []).find((lesson) => !lesson.locked)?._id;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
        {loading ? <p>Loading course...</p> : null}
        {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div> : null}
        {!loading && course ? (
          <>
            <div className="grid gap-6 rounded-lg border border-mist bg-paper p-6 shadow-soft lg:grid-cols-[1fr_340px]">
              <div className="self-center">
                <p className="text-sm font-semibold uppercase tracking-wide text-ocean">Magnafic course</p>
                <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">{course.title}</h1>
                <p className="mt-4 max-w-2xl text-lg leading-8 text-moss">{course.excerpt}</p>
              </div>
              <aside className="rounded-lg border border-mist bg-cloud p-5">
                <div className="text-sm text-moss">
                  <span className="inline-flex items-center gap-1"><BookOpen className="h-4 w-4" />{totalLessons} lessons</span>
                </div>
                {firebaseUser || designMode ? (
                  <>
                    <div className="mt-5">
                      <div className="flex justify-between text-sm">
                        <span>Completion</span>
                        <span>{completion}%</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-mist">
                        <div className="h-2 rounded-full bg-coral" style={{ width: `${completion}%` }} />
                      </div>
                    </div>
                    <Link href={`/courses/${course._id}/lessons/${lastWatchedLessonId || firstLessonId}`} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 font-semibold text-white shadow-card transition hover:-translate-y-0.5">
                      <PlayCircle className="h-4 w-4" />
                      {lastWatchedLessonId ? "Resume learning" : "Start course"}
                    </Link>
                  </>
                ) : (
                  <Link href="/login" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-coral px-4 py-3 font-semibold text-white shadow-card transition hover:-translate-y-0.5">
                    <LogIn className="h-4 w-4" />
                    Login to continue
                  </Link>
                )}
              </aside>
            </div>
            {course.description?.length ? (
              <section className="prose mt-8 max-w-3xl text-moss">
                <PortableText value={course.description} />
              </section>
            ) : null}
            <div className="mt-8 space-y-5">
              {course.modules?.map((module) => (
                <section key={module._id} className="overflow-hidden rounded-lg border border-mist bg-paper shadow-card">
                  <div className="border-b border-mist bg-cloud px-5 py-4">
                    <h2 className="text-xl font-semibold">{module.title}</h2>
                  </div>
                  <div className="px-5">
                  <div className="divide-y divide-mist">
                    {module.lessons?.map((lesson) => (
                      <div key={lesson._id} className="flex items-center justify-between gap-4 py-4">
                        <div className="flex items-center gap-3">
                          {lesson.locked ? <Lock className="h-4 w-4 text-moss" /> : <BookOpen className="h-4 w-4 text-coral" />}
                          <div>
                            <span>{lesson.title}</span>
                            {lesson.duration ? <p className="mt-1 flex items-center gap-1 text-xs text-moss"><Clock className="h-3 w-3" />{lesson.duration}</p> : null}
                          </div>
                        </div>
                        {lesson.locked ? (
                          <span className="text-sm text-moss">Locked</span>
                        ) : (
                          <Link className="rounded-md bg-ink px-3 py-2 text-sm font-medium text-white" href={`/courses/${course._id}/lessons/${lesson._id}`}>
                            Open
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                  </div>
                </section>
              ))}
            </div>
          </>
        ) : null}
    </section>
  );
}
