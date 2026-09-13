"use client";

import Image from "next/image";
import Link from "next/link";
import { PortableText } from "@portabletext/react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  GraduationCap,
  PlayCircle,
  Quote,
  Sparkles
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { publicApiFetch } from "@/lib/api";
import { getCourseRouteId } from "@/lib/course-routing";
import type { Course, CoursePageMedia, CoursePageSection } from "@/lib/types";

function getEmbedUrl(url?: string) {
  if (!url) return "";

  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    }

    if (parsed.hostname.includes("youtu.be")) {
      const videoId = parsed.pathname.split("/").filter(Boolean)[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    }

    if (parsed.hostname.includes("vimeo.com")) {
      const parts = parsed.pathname.split("/").filter(Boolean);
      const videoId = parts.find((part) => /^\d+$/.test(part));
      return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
    }
  } catch {
    return url;
  }

  return url;
}

function SectionMedia({ media, title, className = "" }: { media?: CoursePageMedia; title?: string; className?: string }) {
  if (!media) return null;

  const mediaClass = `w-full overflow-hidden rounded-2xl bg-gray-100 shadow-xl shadow-ink/10 ${className}`;

  if (media.imageUrl) {
    const bypassOptimizer = media.imageUrl.startsWith("https://cdn.sanity.io/");

    return (
      <figure className={mediaClass}>
        <div className="relative aspect-[4/3] w-full">
          <Image
            src={media.imageUrl}
            alt={media.imageAlt || media.caption || title || ""}
            fill
            unoptimized={bypassOptimizer}
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
        {media.caption ? <figcaption className="bg-white px-4 py-3 text-sm text-moss">{media.caption}</figcaption> : null}
      </figure>
    );
  }

  if (media.videoFileUrl) {
    return (
      <figure className={mediaClass}>
        <video src={media.videoFileUrl} controls playsInline preload="metadata" className="aspect-video w-full bg-black" />
        {media.caption ? <figcaption className="bg-white px-4 py-3 text-sm text-moss">{media.caption}</figcaption> : null}
      </figure>
    );
  }

  if (media.videoUrl) {
    return (
      <figure className={mediaClass}>
        <iframe
          src={getEmbedUrl(media.videoUrl)}
          title={media.caption || title || "Course media"}
          loading="lazy"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="aspect-video w-full border-0"
        />
        {media.caption ? <figcaption className="bg-white px-4 py-3 text-sm text-moss">{media.caption}</figcaption> : null}
      </figure>
    );
  }

  return null;
}

function RichText({ value, light = false }: { value?: CoursePageSection["body"]; light?: boolean }) {
  if (!value?.length) return null;

  return (
    <div className={`prose max-w-none break-words prose-headings:font-black ${light ? "prose-invert text-white/85" : "prose-headings:text-ocean text-moss"}`}>
      <PortableText value={value} />
    </div>
  );
}

function SectionHeader({ section, dark = false, centered = false }: { section: CoursePageSection; dark?: boolean; centered?: boolean }) {
  return (
    <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <h2 className={`text-2xl font-black leading-tight sm:text-3xl ${dark ? "text-white" : "text-ocean"}`}>
        {section.sectionTitle}
      </h2>
      {section.intro ? (
        <p className={`mt-4 whitespace-pre-line text-base leading-6 sm:text-lg sm:leading-7 ${dark ? "text-white/85" : "text-moss"}`}>
          {section.intro}
        </p>
      ) : null}
    </div>
  );
}

function CourseSection({ section, index, theme, syllabusUrl }: { section: CoursePageSection; index: number; theme: string; syllabusUrl: string }) {
  const format = section.sectionFormat || "content";
  const dark = theme === "dark" || (theme === "alternating" && index % 2 === 1);
  const bandClass = dark ? "bg-ink text-white" : "bg-[#fbfaf9] text-gray-950";
  const items = section.items || [];

  if (format === "content" || format === "rich-text") {
    const hasMedia = Boolean(section.media?.imageUrl || section.media?.videoUrl || section.media?.videoFileUrl);

    return (
      <section className={`${bandClass} px-4 py-12 sm:px-6 lg:px-8`}>
        <div className={`mx-auto grid max-w-6xl items-center gap-10 ${hasMedia ? "lg:grid-cols-2" : ""}`}>
          <div className={hasMedia && index % 2 === 1 ? "lg:order-2" : ""}>
            <SectionHeader section={section} dark={dark} />
            {section.body?.length ? <div className="mt-7"><RichText value={section.body} light={dark} /></div> : null}
            {items.length ? (
              <div className="mt-7 space-y-4">
                {items.map((item, itemIndex) => (
                  <div key={item._key || itemIndex} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-coral" />
                    <div>
                      {item.title ? <h3 className="font-black">{item.title}</h3> : null}
                      {item.description ? <p className={`mt-1 leading-7 ${dark ? "text-white/80" : "text-moss"}`}>{item.description}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          {hasMedia ? <SectionMedia media={section.media} title={section.sectionTitle} className={index % 2 === 1 ? "lg:order-1" : ""} /> : null}
        </div>
      </section>
    );
  }

  if (format === "list") {
    return (
      <section className={`${bandClass} px-4 py-12 sm:px-6 lg:px-8`}>
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <SectionHeader section={section} dark={dark} />
            {section.media ? <SectionMedia media={section.media} title={section.sectionTitle} className="mt-7" /> : null}
          </div>
          <div className="space-y-4">
            {items.map((item, itemIndex) => (
              <div key={item._key || itemIndex} className={`flex flex-col items-center gap-4 rounded-xl border p-5 text-center shadow-lg md:flex-row md:items-start md:text-left ${dark ? "border-white/15 bg-white/10" : "border-ocean/20 bg-white"}`}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-r from-ocean to-coral font-black text-white">
                  {item.iconLabel || itemIndex + 1}
                </span>
                <div>
                  {item.title ? <h3 className="font-black">{item.title}</h3> : null}
                  {item.description ? <p className={`mt-1 leading-7 ${dark ? "text-white/80" : "text-moss"}`}>{item.description}</p> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (["cards", "outcomes", "stats", "media-gallery", "differentiators"].includes(format)) {
    const gallery = format === "media-gallery";

    return (
      <section className={`${bandClass} px-4 py-12 sm:px-6 lg:px-8`}>
        <div className="mx-auto max-w-6xl">
          <SectionHeader section={section} dark={dark} centered />
          <div className={`mt-10 grid gap-6 ${gallery ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-2 lg:grid-cols-3"}`}>
            {items.map((item, itemIndex) => (
              <article key={item._key || itemIndex} className={`min-w-0 overflow-hidden rounded-xl border p-5 shadow-lg ${dark ? "border-white/15 bg-white/10" : "border-ocean/20 bg-white"}`}>
                {item.media ? <SectionMedia media={item.media} title={item.title || section.sectionTitle} className="mb-5 shadow-none" /> : null}
                {format === "stats" && item.metric ? (
                  <p className={`text-4xl font-black ${dark ? "text-coral" : "text-ocean"}`}>{item.metric}</p>
                ) : (
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-r from-ocean to-coral font-black text-white">
                    {item.iconLabel || itemIndex + 1}
                  </span>
                )}
                {item.title ? <h3 className="mt-4 text-xl font-black">{item.title}</h3> : null}
                {item.description ? <p className={`mt-3 whitespace-pre-line leading-7 ${dark ? "text-white/80" : "text-moss"}`}>{item.description}</p> : null}
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (format === "accordion" || format === "faqs") {
    const entries = format === "faqs"
      ? (section.faqs || []).map((item) => ({ ...item, title: item.question, description: item.answer }))
      : items;

    return (
      <section className={`${bandClass} px-4 py-12 sm:px-6 lg:px-8`}>
        <div className="mx-auto max-w-4xl">
          <SectionHeader section={section} dark={dark} centered />
          <div className="mt-9 space-y-3">
            {entries.map((item, itemIndex) => (
              <details key={item._key || itemIndex} className={`group rounded-xl border shadow-sm ${dark ? "border-white/15 bg-white/10" : "border-ocean/20 bg-white"}`}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-black">
                  {item.title}
                  <ChevronDown className="h-5 w-5 shrink-0 transition group-open:rotate-180" />
                </summary>
                {item.description ? <p className={`px-5 pb-5 leading-7 ${dark ? "text-white/80" : "text-moss"}`}>{item.description}</p> : null}
              </details>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (format === "curriculum") {
    return (
      <section className={`${bandClass} px-4 py-12 sm:px-6 lg:px-8`}>
        <div className="mx-auto max-w-5xl">
          <SectionHeader section={section} dark={dark} centered />
          <div className="mt-10 space-y-4">
            {(section.modules || []).map((module, moduleIndex) => (
              <details
                key={module._key || moduleIndex}
                className="group overflow-hidden rounded-xl border border-white/20 bg-gradient-to-br from-ocean via-[#347ded] to-coral text-white shadow-lg shadow-ocean/15"
              >
                <summary className="relative flex cursor-pointer list-none items-center justify-center border-b border-transparent px-5 py-5 text-center text-white transition group-open:border-white/20 md:justify-between md:px-6 md:text-left">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase text-white/80">Module {moduleIndex + 1}</p>
                    <h3 className="mt-1 break-words text-xl font-black text-white">{module.title}</h3>
                  </div>
                  <ChevronDown className="absolute right-5 h-5 w-5 shrink-0 transition duration-300 group-open:rotate-180 md:static" />
                </summary>
                <div className="px-5 py-6 text-white/90 md:px-6">
                  {module.description ? <p className="leading-7">{module.description}</p> : null}
                  {module.lessons?.length ? (
                    <ul className="mt-5 space-y-3">
                      {module.lessons.map((lesson) => (
                        <li key={lesson} className="flex flex-col items-center gap-2 md:flex-row md:items-start">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-white md:mt-1" />
                          <span>{lesson}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {module.media ? <div className="mt-6 w-full"><SectionMedia media={module.media} title={module.title} className="shadow-none" /></div> : null}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (format === "timeline") {
    return (
      <section className={`${bandClass} px-4 py-12 sm:px-6 lg:px-8`}>
        <div className="mx-auto max-w-4xl">
          <SectionHeader section={section} dark={dark} />
          <div className="mt-10 border-l-2 border-coral pl-6 sm:pl-8">
            {(section.timeline || []).map((item, itemIndex) => (
              <article key={item._key || itemIndex} className="relative pb-9 last:pb-0">
                <span className="absolute -left-[2.15rem] top-1 h-4 w-4 rounded-full border-4 border-coral bg-white sm:-left-[2.65rem]" />
                {item.timeLabel ? <p className={`text-sm font-black uppercase ${dark ? "text-coral" : "text-ocean"}`}>{item.timeLabel}</p> : null}
                <h3 className="mt-1 text-xl font-black">{item.title}</h3>
                {item.description ? <p className={`mt-2 leading-7 ${dark ? "text-white/80" : "text-moss"}`}>{item.description}</p> : null}
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (format === "testimonials") {
    return (
      <section className={`${bandClass} px-4 py-12 sm:px-6 lg:px-8`}>
        <div className="mx-auto max-w-6xl">
          <SectionHeader section={section} dark={dark} centered />
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(section.testimonials || []).map((item, itemIndex) => (
              <figure key={item._key || itemIndex} className={`rounded-xl border p-6 shadow-lg ${dark ? "border-white/15 bg-white/10" : "border-ocean/20 bg-white"}`}>
                <Quote className="h-8 w-8 text-coral" />
                <blockquote className="mt-4 text-lg font-semibold leading-8">{item.quote}</blockquote>
                <figcaption className={`mt-5 text-sm ${dark ? "text-white/75" : "text-moss"}`}>
                  {item.name ? <span className="block font-black">{item.name}</span> : null}
                  {item.designation}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (format === "cta") {
    const cta = section.cta || {};
    const isLink = cta.buttonAction === "link" && cta.buttonUrl;
    const buttonClass = "mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-ocean to-coral px-7 py-3.5 font-black text-white shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5";

    return (
      <section className="bg-[#fbfaf9] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-ocean/20 bg-white px-6 py-10 text-center shadow-xl sm:px-10">
          <Sparkles className="mx-auto h-9 w-9 text-ocean" />
          <h2 className="mt-5 text-2xl font-black leading-tight text-ocean sm:text-3xl">{cta.headline || section.sectionTitle}</h2>
          {(cta.description || section.intro) ? <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-moss">{cta.description || section.intro}</p> : null}
          {isLink ? (
            <a href={cta.buttonUrl} className={buttonClass}>{cta.buttonLabel || "Learn more"}<ArrowRight className="h-5 w-5" /></a>
          ) : (
            <Link href={syllabusUrl} className={buttonClass}>{cta.buttonLabel || "Start course"}<ArrowRight className="h-5 w-5" /></Link>
          )}
        </div>
      </section>
    );
  }

  return null;
}

export default function CourseDetailPage({ params }: { params: { courseId: string } }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    publicApiFetch<{ course: Course }>(`/api/course/${params.courseId}`)
      .then((result) => {
        if (mounted) setCourse(result.course);
      })
      .catch((loadError) => {
        if (mounted) setError(loadError instanceof Error ? loadError.message : "Unable to load course");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [params.courseId]);

  const lessonCount = useMemo(
    () => course?.modules?.reduce((total, module) => total + (module.lessons?.length || 0), 0) || 0,
    [course]
  );

  if (loading) return <div className="min-h-screen bg-cloud px-4 pb-16 pt-28"><p className="text-center font-bold text-moss">Loading course details...</p></div>;

  if (!course) {
    return (
      <main className="min-h-screen bg-cloud px-4 pb-16 pt-28">
        <section className="mx-auto max-w-2xl rounded-2xl bg-white p-8 text-center shadow-xl ring-1 ring-gray-100">
          <h1 className="text-3xl font-black">Course unavailable</h1>
          <p className="mt-3 text-moss">{error || "This course could not be loaded."}</p>
          <Link href="/" className="mt-6 inline-flex rounded-xl bg-ocean px-5 py-3 font-black text-white">Back to courses</Link>
        </section>
      </main>
    );
  }

  const page = course.landingPage || {};
  const courseRouteId = getCourseRouteId(course);
  const syllabusUrl = `/programs/courses/${courseRouteId}`;
  const heroImage = course.mainImage?.bannerUrl || course.mainImage?.url;
  const bypassHeroOptimizer = heroImage?.startsWith("https://cdn.sanity.io/");
  const theme = page.theme || "alternating";
  const hasCourseCta = page.sections?.some((section) => section.sectionFormat === "cta");

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fbfaf9] text-center md:text-left">
      <section className="bg-ink px-4 pb-12 pt-24 text-white sm:px-6 sm:pb-16 sm:pt-28 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-cyan-100 transition hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to courses
          </Link>
          <div className="mt-7 grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="min-w-0">
              <p className="text-base font-black text-coral sm:text-lg">{page.eyebrow || "Magnafic Academy"}</p>
              <h1 className="mt-4 break-words text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">{page.headline || course.title}</h1>
              {(page.shortDescription || course.excerpt) ? <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-cyan-50 sm:text-lg sm:leading-8">{page.shortDescription || course.excerpt}</p> : null}
              <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm font-black text-cyan-100 md:justify-start">
                <span className="inline-flex items-center gap-2"><GraduationCap className="h-4 w-4" />{course.modules?.length || 0} modules</span>
                <span className="inline-flex items-center gap-2"><BookOpen className="h-4 w-4" />{lessonCount} lessons</span>
              </div>
              <Link
                href={syllabusUrl}
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-ocean to-coral px-7 py-3.5 font-black text-white shadow-lg shadow-cyan-400/20 transition duration-300 hover:-translate-y-0.5 hover:shadow-cyan-300/35"
              >
                <PlayCircle className="h-5 w-5" />
                {page.startButtonLabel || "Start course"}
              </Link>
            </div>
            <div className="mx-auto w-full max-w-sm lg:mx-0">
              {heroImage ? (
                <div className="relative aspect-[3/4] h-[420px] w-full overflow-hidden rounded-[1.75rem] shadow-2xl shadow-ink/30 ring-1 ring-white/20">
                  <Image
                    src={heroImage}
                    alt={course.mainImage?.alt || course.title}
                    fill
                    unoptimized={bypassHeroOptimizer}
                    priority
                    sizes="(min-width: 1024px) 22rem, 100vw"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="flex aspect-[3/4] h-[420px] w-full items-center justify-center rounded-[1.75rem] bg-white/10 p-8 ring-1 ring-white/20">
                  <Image src="/magnafic-logo.png" alt="" width={260} height={80} className="w-3/4 object-contain brightness-0 invert" />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {page.sections?.length ? (
        page.sections.map((section, index) => (
          <CourseSection
            key={section._key || `${section.sectionTitle}-${index}`}
            section={section}
            index={index}
            theme={theme}
            syllabusUrl={syllabusUrl}
          />
        ))
      ) : (
        <section className="bg-[#fbfaf9] px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-black text-ocean sm:text-3xl">About this course</h2>
            {course.description?.length ? (
              <div className="mt-7"><RichText value={course.description} /></div>
            ) : (
              <p className="mt-4 text-lg leading-8 text-moss">{course.excerpt}</p>
            )}
          </div>
        </section>
      )}

      {!hasCourseCta ? (
        <section className="bg-[#fbfaf9] px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl rounded-xl border border-ocean/20 bg-white px-6 py-10 text-center shadow-xl sm:px-10">
            <BarChart3 className="mx-auto h-9 w-9 text-ocean" />
            <h2 className="mt-5 text-2xl font-black text-ocean sm:text-3xl">Ready to begin?</h2>
            <p className="mt-3 text-lg leading-8 text-moss">Open the syllabus, review the modules, and begin with the first unlocked lesson.</p>
            <Link href={syllabusUrl} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-ocean to-coral px-7 py-3.5 font-black text-white shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5">
              {page.startButtonLabel || "Start course"}
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
