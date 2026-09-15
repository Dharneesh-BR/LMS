"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, GraduationCap, PlayCircle, Search } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { apiFetch } from "@/lib/api";

type DashboardCourse = {
  sanityId: string;
  routeId?: string;
  title: string;
  excerpt?: string;
  mainImage?: {
    alt?: string;
    url?: string;
    cardUrl?: string;
  };
  moduleCount?: number;
  completedLessons: number;
  totalLessons: number;
  completionPercentage: number;
  courseCompleted?: boolean;
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
};

type CourseFilter = "all" | "active" | "completed";

function hasStartedCourse(course: DashboardCourse) {
  return course.completedLessons > 0 || course.lessons.some((lesson) => lesson.watchedSeconds > 0);
}

function courseMatchesSearch(course: DashboardCourse, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return true;

  return [
    course.title,
    ...course.lessons.map((lesson) => lesson.title),
    ...course.lessons.map((lesson) => lesson.moduleTitle)
  ].some((value) => value.toLowerCase().includes(query));
}

function SegmentedJourneyProgress({ value }: { value: number }) {
  const segments = 24;
  const activeSegments = Math.round((Math.max(0, Math.min(100, value)) / 100) * segments);

  return (
    <div
      className="relative h-40 w-40"
      role="progressbar"
      aria-label="Learning journey progress"
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
          <p className="text-3xl font-black leading-none text-white">{value}%</p>
          <p className="mt-1 text-xs font-black uppercase tracking-wide text-cyan-100">Progress</p>
        </div>
      </div>
    </div>
  );
}

export function LearnerHome() {
  const { apiUser, firebaseUser, loading } = useAuth();
  const [courses, setCourses] = useState<DashboardCourse[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CourseFilter>("all");

  useEffect(() => {
    if (loading || !firebaseUser) return;

    let mounted = true;
    setIsLoadingCourses(true);

    apiFetch<{ courses: DashboardCourse[] }>("/api/dashboard")
      .then((result) => {
        if (mounted) setCourses(result.courses);
      })
      .catch(() => {
        if (mounted) setCourses([]);
      })
      .finally(() => {
        if (mounted) setIsLoadingCourses(false);
      });

    return () => {
      mounted = false;
    };
  }, [firebaseUser, loading]);

  const completedCourses = useMemo(() => courses.filter((course) => course.courseCompleted || course.completionPercentage >= 100), [courses]);
  const inProgressCourses = useMemo(() => courses.filter((course) => !(course.courseCompleted || course.completionPercentage >= 100) && hasStartedCourse(course)), [courses]);
  const journeyProgress = courses.length ? Math.round((completedCourses.length / courses.length) * 100) : 0;
  const visibleCourses = useMemo(() => {
    const scopedCourses = filter === "completed" ? completedCourses : filter === "active" ? inProgressCourses : courses;
    return scopedCourses.filter((course) => courseMatchesSearch(course, search));
  }, [completedCourses, courses, filter, inProgressCourses, search]);

  return (
    <section className="overflow-x-hidden">
      <div id="courses" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="magnafic-premium-panel p-6 shadow-soft sm:p-8">
          <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,30rem)] lg:items-center">
            <div>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">My Learning Journey</h1>

              <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
                <JourneyMetric label="Assigned" value={courses.length} />
                <JourneyMetric label="Inprogress" value={inProgressCourses.length} />
                <JourneyMetric label="Completed" value={completedCourses.length} />
              </div>
            </div>

            <div className="flex flex-col items-center text-center">
              <SegmentedJourneyProgress value={journeyProgress} />
            </div>
          </div>
        </div>

      <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-card lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-moss" />
          <input
            className="w-full rounded-xl border border-gray-200 bg-cloud py-3 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-ocean focus:bg-white focus:ring-4 focus:ring-ocean/10"
            placeholder="Search your courses or lessons"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="grid grid-cols-3 rounded-xl bg-cloud p-1 text-sm font-black">
          <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
            All courses
          </FilterButton>
          <FilterButton active={filter === "active"} onClick={() => setFilter("active")}>
            Active
          </FilterButton>
          <FilterButton active={filter === "completed"} onClick={() => setFilter("completed")}>
            Completed
          </FilterButton>
        </div>
      </div>

      {isLoadingCourses ? (
        <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-8 text-center font-semibold text-moss shadow-card">Loading your courses...</div>
      ) : visibleCourses.length ? (
        <div className="mt-8 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
          {visibleCourses.map((course) => <LearnerCourseCard key={course.sanityId} course={course} />)}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-coral/40 bg-white p-8 text-center shadow-card">
          <h2 className="text-xl font-black">No courses found</h2>
          <p className="mt-2 text-sm text-moss">Try another search or category.</p>
        </div>
      )}
      </div>
    </section>
  );
}

function JourneyMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/10 p-4 text-white backdrop-blur">
      <p className="text-sm font-semibold text-cyan-100">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}

function FilterButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-2 transition ${active ? "bg-white text-ocean shadow-sm" : "text-moss hover:text-ink"}`}
    >
      {children}
    </button>
  );
}

function LearnerCourseCard({ course }: { course: DashboardCourse }) {
  const courseId = course.routeId || course.sanityId;
  const courseDetailPath = `/courses/${courseId}`;
  const programCoursePath = `/programs/courses/${courseId}`;
  const lessonBasePath = `${programCoursePath}/lessons`;
  const imageUrl = course.mainImage?.cardUrl || course.mainImage?.url;
  const shouldBypassOptimizer = imageUrl?.startsWith("https://cdn.sanity.io/");

  return (
    <article className="group relative overflow-hidden rounded-[1.35rem] bg-white shadow-lg shadow-ink/5 ring-1 ring-gray-100 transition duration-300 hover:-translate-y-1 hover:shadow-soft">
      <div className="relative aspect-[4/5] min-h-[22rem] overflow-hidden bg-ocean">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={course.mainImage?.alt || course.title}
            fill
            unoptimized={shouldBypassOptimizer}
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-ink via-ocean to-coral p-10">
            <Image src="/magnafic-logo.png" alt="" width={220} height={70} className="w-3/5 object-contain brightness-0 invert" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/5 to-black/55" />

        <div className="absolute bottom-5 left-4 right-4 rounded-[1.15rem] bg-white/95 p-5 text-gray-950 shadow-2xl shadow-ink/25 backdrop-blur-xl ring-1 ring-white/70">
          <h2 className="text-lg font-black leading-snug text-gray-950">{course.title}</h2>
          <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-gray-800">
            {course.excerpt || "A Magnafic self-paced course with guided lessons."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-black text-gray-800">
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-ocean" />
              {course.totalLessons || 0} lessons
            </span>
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 text-ocean" />
              {course.moduleCount || 0} modules
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={courseDetailPath} className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-xs font-black text-white shadow-card transition hover:bg-ocean">
              View course
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            {course.lastWatchedLessonId ? (
              <Link href={`${lessonBasePath}/${course.lastWatchedLessonId}`} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-black text-ocean shadow-card transition hover:bg-cyan-50">
                <PlayCircle className="h-3.5 w-3.5" />
                Resume
              </Link>
            ) : null}
          </div>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r from-ocean to-coral" aria-hidden="true" />
    </article>
  );
}
