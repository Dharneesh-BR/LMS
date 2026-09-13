"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { PortableText } from "@portabletext/react";
import { ArrowLeft, ArrowRight, BookOpen, Clock, GraduationCap, Lock, LogIn, PlayCircle } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { apiFetch, publicApiFetch } from "@/lib/api";
import { getCourseRouteId } from "@/lib/course-routing";
import type { Course } from "@/lib/types";
import { designMode } from "@/lib/design-mode";

function SegmentedCourseProgress({ value }: { value: number }) {
  const segments = 24;
  const activeSegments = Math.round((Math.max(0, Math.min(100, value)) / 100) * segments);

  return (
    <div
      className="relative h-40 w-40"
      role="progressbar"
      aria-label="Course completion"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      {Array.from({ length: segments }).map((_, index) => {
        const isActive = index < activeSegments;
        const hueClass = index < 7 ? "bg-[#5a4ff3]" : index < 14 ? "bg-[#2586ef]" : "bg-[#16d9df]";

        return (
          <span
            key={index}
            className={`absolute left-1/2 top-1/2 h-8 w-2 origin-[50%_4.7rem] -translate-x-1/2 -translate-y-[4.7rem] rounded-full ${isActive ? hueClass : "bg-[#d9dee9]"}`}
            style={{ transform: `translate(-50%, -4.7rem) rotate(${index * (360 / segments)}deg)` }}
          />
        );
      })}
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="text-2xl font-black leading-none text-ink">{value}%</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-ocean">Progress</p>
        </div>
      </div>
    </div>
  );
}

export default function ProgramCoursePage({ params }: { params: { courseId: string } }) {
  const { apiUser, firebaseUser, loading: authLoading } = useAuth();
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
        const isAuthenticated = Boolean(apiUser && firebaseUser) || designMode;
        const result = isAuthenticated
          ? await apiFetch<{ course: Course }>(`/api/course/${params.courseId}`)
          : await publicApiFetch<{ course: Course }>(`/api/course/${params.courseId}`);
        setCourse(result.course);

        if (isAuthenticated) {
          try {
            const progress = await apiFetch<{ completed: number; lastWatchedLessonId: string | null }>(`/api/progress/${params.courseId}`);
            setCompletedLessons(progress.completed);
            setLastWatchedLessonId(progress.lastWatchedLessonId);
          } catch (progressError) {
            console.warn("Unable to load course progress", progressError);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load course");
      } finally {
        setLoading(false);
      }
    }

    loadCourse();
  }, [apiUser, authLoading, firebaseUser, params.courseId]);

  const totalLessons = course?.modules?.reduce((count, module) => count + (module.lessons?.length || 0), 0) || 0;
  const completion = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const firstLessonId = course?.modules?.flatMap((module) => module.lessons || []).find((lesson) => !lesson.locked)?._id;
  const courseRouteId = course ? getCourseRouteId(course) : params.courseId;
  const detailPath = `/courses/${courseRouteId}`;
  const lessonBasePath = `/programs/courses/${courseRouteId}/lessons`;
  const courseImageUrl = course?.mainImage?.bannerUrl || course?.mainImage?.url;
  const shouldBypassImageOptimizer = courseImageUrl?.startsWith("https://cdn.sanity.io/");

  return (
    <section className="min-h-screen overflow-x-hidden bg-cloud">
      {loading ? <p className="px-4 py-10 text-center font-bold text-moss">Loading course...</p> : null}
      {error ? <div className="mx-auto mt-8 max-w-4xl rounded-2xl border border-red-200 bg-red-50 p-4 text-center font-bold text-red-700">{error}</div> : null}
      {!loading && course ? (
        <>
          <section className="bg-ink px-4 pb-12 pt-10 text-white sm:px-6 sm:pb-16 lg:px-8">
            <div className="mx-auto max-w-6xl">
              <Link href={detailPath} className="inline-flex items-center gap-2 text-sm font-bold text-cyan-100 transition hover:text-white">
                <ArrowLeft className="h-4 w-4" />
                Back to course details
              </Link>
              <div className="mt-7 grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="min-w-0 text-center lg:text-left">
                  <p className="text-base font-black text-coral sm:text-lg">Magnafic Academy</p>
                  <h1 className="mt-4 break-words text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">{course.title}</h1>
                  {course.excerpt ? <p className="mx-auto mt-5 max-w-2xl text-base font-semibold leading-7 text-cyan-50 sm:text-lg sm:leading-8 lg:mx-0">{course.excerpt}</p> : null}
                  <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm font-black text-cyan-100 lg:justify-start">
                    <span className="inline-flex items-center gap-2"><GraduationCap className="h-4 w-4" />{course.modules?.length || 0} modules</span>
                    <span className="inline-flex items-center gap-2"><BookOpen className="h-4 w-4" />{totalLessons} lessons</span>
                  </div>
                </div>
                <div className="mx-auto w-full max-w-sm lg:mx-0">
                  {courseImageUrl ? (
                    <div className="relative aspect-[3/4] h-[420px] w-full overflow-hidden rounded-[1.75rem] shadow-2xl shadow-black/30 ring-1 ring-white/20">
                      <Image
                        src={courseImageUrl}
                        alt={course.mainImage?.alt || course.title}
                        fill
                        unoptimized={shouldBypassImageOptimizer}
                        priority
                        sizes="(min-width: 1024px) 22rem, 100vw"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-[3/4] h-[420px] w-full items-center justify-center rounded-[1.75rem] bg-white/10 p-8 shadow-2xl shadow-black/30 ring-1 ring-white/20">
                      <Image src="/magnafic-logo.png" alt="" width={260} height={80} className="w-3/4 object-contain brightness-0 invert" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
            <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-12">
              <div className="min-w-0">
                {course.description?.length ? (
                  <div className="prose max-w-none break-words rounded-3xl bg-white p-6 text-center text-moss shadow-card ring-1 ring-gray-100 prose-headings:text-ocean sm:p-8">
                    <h2 className="text-3xl font-black leading-tight text-ocean sm:text-4xl">About this course</h2>
                    <PortableText value={course.description} />
                  </div>
                ) : (
                  <div className="rounded-3xl bg-white p-6 text-center shadow-card ring-1 ring-gray-100 sm:p-8">
                    <h2 className="text-3xl font-black leading-tight text-ocean sm:text-4xl">About this course</h2>
                    <p className="mx-auto mt-5 max-w-3xl text-lg font-semibold leading-8 text-moss">{course.excerpt}</p>
                  </div>
                )}
              </div>
              <aside className="flex min-w-0 flex-col items-center justify-center gap-5 rounded-3xl bg-white p-6 text-center shadow-card ring-1 ring-gray-100">
                <SegmentedCourseProgress value={completion} />
                {firebaseUser || designMode ? (
                  firstLessonId ? (
                    <Link href={`${lessonBasePath}/${lastWatchedLessonId || firstLessonId}`} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-ocean to-coral px-5 py-3 font-black text-white shadow-lg shadow-cyan-500/25 transition hover:-translate-y-0.5 hover:shadow-glow sm:w-auto">
                      <PlayCircle className="h-4 w-4" />
                      {lastWatchedLessonId ? "Resume learning" : "Start learning"}
                    </Link>
                  ) : null
                ) : (
                  <Link href={`/login?returnTo=${encodeURIComponent(`/programs/courses/${courseRouteId}`)}`} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-ocean to-coral px-5 py-3 font-black text-white shadow-lg shadow-cyan-500/25 transition hover:-translate-y-0.5 hover:shadow-glow sm:w-auto">
                    <LogIn className="h-4 w-4" />
                    Login to continue
                  </Link>
                )}
              </aside>
            </section>

            <section className="mt-8 space-y-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-ocean">Course syllabus</p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-950">Lessons</h2>
                </div>
                {firstLessonId ? (
                  <Link href={`${lessonBasePath}/${lastWatchedLessonId || firstLessonId}`} className="inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3 font-black text-white shadow-card transition hover:-translate-y-0.5 hover:bg-ocean">
                    <PlayCircle className="h-4 w-4" />
                    {lastWatchedLessonId ? "Resume lesson" : "Open first lesson"}
                  </Link>
                ) : null}
              </div>

              {course.modules?.map((module) => (
                <article key={module._id} className="overflow-hidden rounded-2xl bg-white shadow-lg shadow-ink/5 ring-1 ring-gray-100">
                  <div className="border-b border-white/20 bg-gradient-to-r from-ocean via-[#347ded] to-coral px-5 py-4">
                    <h2 className="break-words text-xl font-black text-white">{module.title}</h2>
                  </div>
                  <div className="divide-y divide-gray-100 px-4 sm:px-6">
                    {module.lessons?.map((lesson) => (
                      <div key={lesson._id} className={`flex flex-col items-stretch gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${lesson.locked ? "bg-gray-50/80" : ""}`}>
                        <div className="flex min-w-0 items-start gap-3 sm:items-center">
                          {lesson.locked
                            ? <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gray-200 text-gray-500"><Lock className="h-4 w-4" /></span>
                            : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ocean/10 text-ocean"><BookOpen className="h-4 w-4" /></span>}
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900">{lesson.title}</p>
                            {lesson.duration ? <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-moss"><Clock className="h-3 w-3" />{lesson.duration}</p> : null}
                          </div>
                        </div>
                        {lesson.locked ? (
                          <span className="inline-flex w-fit shrink-0 self-center items-center justify-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-bold text-gray-400 sm:self-auto"><Lock className="h-4 w-4" />Locked</span>
                        ) : (
                          <Link className="inline-flex w-fit shrink-0 self-center items-center justify-center gap-2 rounded-lg bg-ocean px-3 py-2 text-sm font-bold text-white transition hover:bg-ink sm:self-auto" href={`${lessonBasePath}/${lesson._id}`}>
                            Open <ArrowRight className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </section>
          </main>
        </>
      ) : null}
    </section>
  );
}
