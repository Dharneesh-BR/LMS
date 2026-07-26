import Link from "next/link";
import { ArrowRight, Clock, Layers } from "lucide-react";
import type { Course } from "@/lib/types";

export function CourseCard({ course }: { course: Course }) {
  return (
    <article className="group flex min-h-72 flex-col justify-between overflow-hidden rounded-lg border border-mist/90 bg-paper shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-soft">
      <div className="h-2 bg-gradient-to-r from-ocean via-mint to-coral" />
      <div className="p-5">
      <h2 className="text-xl font-semibold tracking-tight">{course.title}</h2>
      <p className="mt-2 min-h-12 text-sm leading-6 text-moss">{course.excerpt || "A Magnafic pre-recorded course with guided lessons."}</p>
      <div className="mt-6 grid grid-cols-2 gap-3 text-sm text-moss">
        <span className="inline-flex items-center gap-2 rounded-md bg-cloud px-3 py-2"><Layers className="h-4 w-4 text-ocean" />{course.moduleCount || 0} modules</span>
        <span className="inline-flex items-center gap-2 rounded-md bg-cloud px-3 py-2"><Clock className="h-4 w-4 text-mint" />{course.lessonCount || 0} lessons</span>
      </div>
      <Link href={`/courses/${course._id}`} className="mt-6 inline-flex w-fit items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white shadow-card transition group-hover:bg-ocean">
        View course
        <ArrowRight className="h-4 w-4" />
      </Link>
      </div>
    </article>
  );
}
