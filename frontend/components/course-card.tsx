import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, GraduationCap } from "lucide-react";
import { getCoursePath } from "@/lib/course-routing";
import type { Course } from "@/lib/types";

export function CourseCard({ course }: { course: Course }) {
  const imageUrl = course.mainImage?.cardUrl || course.mainImage?.url;
  const shouldBypassOptimizer = imageUrl?.startsWith("https://cdn.sanity.io/");

  return (
    <article className="group relative overflow-hidden rounded-[1.5rem] bg-white pb-1.5 shadow-lg shadow-ink/5 ring-1 ring-gray-100 transition duration-300 hover:-translate-y-1 hover:shadow-soft">
      <Link href={getCoursePath(course)} className="relative block aspect-[4/5] overflow-hidden bg-ocean">
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
            <Image src="/magnafic-logo.png" alt="" width={260} height={80} className="w-3/4 object-contain brightness-0 invert" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/5 to-black/40" />
        <div className="absolute bottom-5 left-4 right-4 rounded-[1.25rem] bg-gray-100/85 p-5 text-gray-950 shadow-2xl shadow-ink/15 backdrop-blur-sm">
          <h2 className="text-xl font-bold leading-snug text-gray-950">{course.title}</h2>
          <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-gray-700">
            {course.excerpt || "A Magnafic self-paced course with guided lessons."}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-black text-gray-600">
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 text-ocean" />
              {course.moduleCount || 0} modules
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-ocean" />
              {course.lessonCount || 0} lessons
            </span>
          </div>
          {course.targetDepartments?.length || course.targetDesignations?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {[...(course.targetDepartments || []), ...(course.targetDesignations || [])].slice(0, 3).map((label) => (
                <span key={label} className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-black text-ocean">
                  {label}
                </span>
              ))}
            </div>
          ) : null}
          <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-black text-white shadow-card transition group-hover:bg-ocean">
            View course
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
      <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r from-ocean to-coral" aria-hidden="true" />
    </article>
  );
}
