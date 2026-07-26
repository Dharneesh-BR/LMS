"use client";

import Link from "next/link";
import { PortableText } from "@portabletext/react";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Lock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Protected } from "@/components/protected";
import { VideoProgressUpdate, VimeoPlayer } from "@/components/vimeo-player";
import { apiFetch } from "@/lib/api";
import type { Course, Lesson } from "@/lib/types";

type LessonProgress = {
  lessonId: string;
  watchedSeconds: number;
  durationSeconds: number;
  completed: boolean;
};

export default function LessonPage({ params }: { params: { courseId: string; lessonId: string } }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [completed, setCompleted] = useState(false);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<{ course: Course }>(`/api/course/${params.courseId}`)
      .then(async (result) => {
        const progressResult = await apiFetch<{ progress: LessonProgress[] }>(`/api/progress/${params.courseId}`);
        const currentProgress = progressResult.progress.find((item) => item.lessonId === params.lessonId) || null;
        setLessonProgress(currentProgress);
        setCompleted(currentProgress?.completed || false);
        setCourse(result.course);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load lesson"));
  }, [params.courseId, params.lessonId]);

  const lessons = useMemo(() => course?.modules?.flatMap((module) => module.lessons || []) || [], [course]);
  const lesson = useMemo<Lesson | undefined>(() => {
    return lessons.find((item) => item._id === params.lessonId);
  }, [lessons, params.lessonId]);
  const lessonIndex = lessons.findIndex((item) => item._id === params.lessonId);
  const previousLesson = lessonIndex > 0 ? lessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex >= 0 && lessonIndex < lessons.length - 1 ? lessons[lessonIndex + 1] : null;

  function saveVideoProgress(update: VideoProgressUpdate) {
    void apiFetch<{ progress: LessonProgress; course?: Course }>("/api/progress/update", {
      method: "POST",
      body: JSON.stringify({
        courseId: params.courseId,
        lessonId: params.lessonId,
        ...update
      })
    }).then((result) => {
      setLessonProgress(result.progress);
      if (result.progress.completed) setCompleted(true);
      if (result.course) setCourse(result.course);
    }).catch(() => {
      // Playback should continue if a background progress save briefly fails.
    });
  }

  return (
    <Protected>
      <section className="mx-auto max-w-7xl px-4 py-8">
        {error ? <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</div> : null}
        {!lesson ? <p>Loading lesson...</p> : lesson.locked ? (
          <div className="rounded-lg border border-mist bg-paper p-8 text-center shadow-soft">
            <Lock className="mx-auto h-9 w-9 text-ocean" />
            <h1 className="mt-4 text-3xl font-bold">Lesson locked</h1>
            <p className="mt-3 text-moss">Complete the previous lesson to continue.</p>
            <Link href={`/courses/${params.courseId}`} className="mt-5 inline-flex rounded-md bg-ink px-4 py-2 font-medium text-white">Back to course</Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="rounded-lg border border-mist bg-paper p-5 shadow-soft">
              <Link href={`/courses/${params.courseId}`} className="inline-flex items-center gap-2 text-sm text-moss"><ArrowLeft className="h-4 w-4" />Back to course</Link>
              <h1 className="mt-3 text-3xl font-bold tracking-tight">{lesson.title}</h1>
              {lesson.duration ? <p className="mt-2 inline-flex items-center gap-1 text-sm text-moss"><Clock className="h-4 w-4" />{lesson.duration}</p> : null}
              {lesson.videoUrl ? (
                <div className="mt-6">
                  <VimeoPlayer
                    url={lesson.videoUrl}
                    initialSeconds={lessonProgress?.completed ? 0 : lessonProgress?.watchedSeconds || 0}
                    onProgressSave={saveVideoProgress}
                  />
                </div>
              ) : null}
              <div className="prose mt-6 max-w-none rounded-lg bg-cloud p-5">
                {lesson.content ? <PortableText value={lesson.content} /> : <p>No lesson notes yet.</p>}
              </div>
              <div className="mt-8 flex flex-wrap justify-between gap-3">
                {previousLesson ? (
                  <Link href={`/courses/${params.courseId}/lessons/${previousLesson._id}`} className="inline-flex items-center gap-2 rounded-md border border-mist bg-paper px-4 py-2 font-medium shadow-card">
                    <ArrowLeft className="h-4 w-4" />
                    Previous
                  </Link>
                ) : <span />}
                {nextLesson && !nextLesson.locked ? (
                  <Link href={`/courses/${params.courseId}/lessons/${nextLesson._id}`} className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 font-medium text-white shadow-card">
                    Next lesson
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : nextLesson ? (
                  <span className="inline-flex items-center gap-2 rounded-md bg-cloud px-4 py-2 font-medium text-moss">
                    <Lock className="h-4 w-4" />
                    Next lesson
                  </span>
                ) : null}
              </div>
            </div>
            <aside className="h-fit rounded-lg border border-mist bg-paper p-5 shadow-card lg:sticky lg:top-24">
              <h2 className="font-semibold">Course lessons</h2>
              <div className="mt-4 space-y-2">
                {lessons.map((item) => item.locked ? (
                  <div key={item._id} className="flex cursor-not-allowed items-center gap-2 rounded-md bg-cloud px-3 py-2 text-sm text-moss">
                    <Lock className="h-3.5 w-3.5" />
                    {item.title}
                  </div>
                ) : (
                  <Link key={item._id} className={`block rounded-md px-3 py-2 text-sm transition hover:bg-cloud ${item._id === params.lessonId ? "bg-cloud font-medium text-ocean ring-1 ring-mist" : "text-moss"}`} href={`/courses/${params.courseId}/lessons/${item._id}`}>
                    {item.title}
                  </Link>
                ))}
              </div>
              {completed ? (
                nextLesson && !nextLesson.locked ? (
                  <Link href={`/courses/${params.courseId}/lessons/${nextLesson._id}`} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 font-semibold text-white shadow-card">
                    Next lesson
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <div className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-cloud px-4 py-3 font-semibold text-ocean">
                    <CheckCircle2 className="h-4 w-4" />
                    {nextLesson ? "Lesson completed" : "Course completed"}
                  </div>
                )
              ) : (
                <div className="mt-5 rounded-md bg-cloud px-4 py-3 text-center text-sm font-semibold leading-6 text-moss">
                  Watch the complete video to unlock the next lesson.
                </div>
              )}
            </aside>
          </div>
        )}
      </section>
    </Protected>
  );
}
