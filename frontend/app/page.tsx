import { CourseCard } from "@/components/course-card";
import { publicApiFetch } from "@/lib/api";
import { publicCoursesQuery, sanityClient } from "@/lib/sanity";
import type { Course } from "@/lib/types";
import fs from "node:fs/promises";
import path from "node:path";
import { ArrowRight, BarChart3, ShieldCheck, Sparkles, Video } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const courses = await getCourses();

  return (
    <section>
      <div className="bg-paper px-4 py-6">
        <div className="magnafic-premium-panel mx-auto max-w-7xl shadow-soft">
        <div className="relative z-10 grid gap-8 px-5 py-12 lg:grid-cols-[1fr_400px] lg:px-10 lg:py-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-semibold text-coral backdrop-blur">
              <Sparkles className="h-4 w-4" />
              Magnafic pre-recorded courses
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-tight tracking-tight text-white md:text-6xl">Learn FMCG and consumer brand growth from Magnafic experts.</h1>
            <p className="mt-5 max-w-2xl text-lg font-medium leading-8 text-cyan-50">Access pre-recorded courses inspired by Magnafic's top-1% consulting approach for growth, strategy, distribution, AI execution, and consumer brand transformation.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#courses" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 font-bold text-ocean shadow-card transition hover:-translate-y-0.5 hover:bg-cyan-50">
                Explore courses
                <ArrowRight className="h-4 w-4" />
              </a>
              <a href="/login" className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 py-3 font-bold text-white shadow-card backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15">
                Learner login
              </a>
            </div>
          </div>
          <div className="grid gap-3 rounded-[1.5rem] border border-white/15 bg-white/10 p-4 shadow-soft backdrop-blur">
            <div className="rounded-[1.25rem] bg-white p-5 text-ink shadow-card">
              <p className="text-sm font-semibold text-moss">Magnafic learning snapshot</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-cloud p-3">
                  <p className="text-2xl font-bold">{courses.length}</p>
                  <p className="text-xs font-semibold text-moss">Courses</p>
                </div>
                <div className="rounded-2xl bg-cloud p-3">
                  <p className="text-2xl font-bold">{courses.reduce((sum, course) => sum + (course.lessonCount || 0), 0)}</p>
                  <p className="text-xs font-semibold text-moss">Lessons</p>
                </div>
              </div>
            </div>
            {[
              { icon: ShieldCheck, label: "Authenticated access for enrolled Magnafic learners" },
              { icon: Video, label: "Private pre-recorded video lessons through Vimeo" },
              { icon: BarChart3, label: "Progress, resume, payments, and admin insights" }
            ].map((item) => (
              <FeatureRow key={item.label} icon={item.icon} label={item.label} />
            ))}
          </div>
        </div>
        </div>
      </div>

      <div id="courses" className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Magnafic courses</h2>
            <p className="mt-2 text-sm text-moss">Pre-recorded courses curated and published by the Magnafic team.</p>
          </div>
          <span className="rounded-md bg-paper px-3 py-2 text-sm font-semibold text-ink shadow-card ring-1 ring-mist">{courses.length} courses</span>
        </div>
        {courses.length ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => <CourseCard key={course._id} course={course} />)}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-mist bg-paper p-8 text-center shadow-card">
            <h3 className="text-lg font-semibold">No Magnafic courses found</h3>
            <p className="mt-2 text-sm text-moss">Start the backend and add Sanity courses to populate the Magnafic catalog.</p>
          </div>
        )}
      </div>
    </section>
  );
}

async function getCourses() {
  try {
    const result = await publicApiFetch<{ courses: Course[] }>("/api/courses");
    return result.courses;
  } catch {
    return sanityClient.fetch<Course[]>(publicCoursesQuery).catch(getLocalDemoCourses);
  }
}

async function getLocalDemoCourses(): Promise<Course[]> {
  const demoPath = path.resolve(process.cwd(), "../sanity/demo-content.json");
  const docs = JSON.parse(await fs.readFile(demoPath, "utf8")) as Array<Record<string, any>>;
  const lessons = docs.filter((doc) => doc._type === "lesson");

  return docs
    .filter((doc) => doc._type === "course")
    .map((course) => {
      const moduleRefs = ((course.modules as Array<{ _ref?: string }> | undefined) || [])
        .map((module) => module._ref)
        .filter(Boolean);

      return {
        _id: course._id,
        title: course.title,
        slug: course.slug,
        excerpt: course.excerpt,
        price: course.price,
        moduleCount: moduleRefs.length,
        lessonCount: lessons.filter((lesson) => {
          const moduleRef = lesson.module as { _ref?: string } | undefined;
          return moduleRef?._ref ? moduleRefs.includes(moduleRef._ref) : false;
        }).length
      } satisfies Course;
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

function FeatureRow({ icon: Icon, label }: { icon: typeof ShieldCheck; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-cloud p-3 text-sm">
      <Icon className="h-5 w-5 text-coral" />
      <span>{label}</span>
    </div>
  );
}
