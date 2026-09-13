"use client";

import { useEffect, useMemo, useState } from "react";
import { CourseCard } from "@/components/course-card";
import { useAuth } from "@/components/auth-provider";
import { publicApiFetch } from "@/lib/api";
import type { Course } from "@/lib/types";

function buildCourseQuery(department?: string | null, designation?: string | null) {
  const params = new URLSearchParams();
  if (department) params.set("department", department);
  if (designation) params.set("designation", designation);
  const query = params.toString();
  return query ? `/api/courses?${query}` : "/api/courses";
}

function normalize(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function courseMatchesProfile(course: Course, department?: string | null, designation?: string | null) {
  const profileDepartment = normalize(department);
  const profileDesignation = normalize(designation);
  const courseDepartments = (course.targetDepartments || []).map(normalize).filter(Boolean);
  const courseDesignations = (course.targetDesignations || []).map(normalize).filter(Boolean);
  const departmentMatches = !profileDepartment || !courseDepartments.length || courseDepartments.includes(profileDepartment);
  const designationMatches = !profileDesignation || !courseDesignations.length || courseDesignations.includes(profileDesignation);

  return departmentMatches && designationMatches;
}

export function CourseCatalog({ initialCourses }: { initialCourses: Course[] }) {
  const { apiUser, loading } = useAuth();
  const [courses, setCourses] = useState(initialCourses);

  const hasProfile = Boolean(apiUser?.department && apiUser?.designation);
  const visibleCourses = useMemo(() => {
    if (!apiUser || hasProfile) return courses;
    return initialCourses;
  }, [apiUser, courses, hasProfile, initialCourses]);

  useEffect(() => {
    if (loading || !apiUser || !hasProfile) {
      setCourses(initialCourses);
      return;
    }

    let mounted = true;
    publicApiFetch<{ courses: Course[] }>(buildCourseQuery(apiUser.department, apiUser.designation))
      .then((result) => {
        if (mounted) setCourses(result.courses);
      })
      .catch(() => {
        if (mounted) {
          setCourses(initialCourses.filter((course) => courseMatchesProfile(course, apiUser.department, apiUser.designation)));
        }
      });

    return () => {
      mounted = false;
    };
  }, [apiUser, hasProfile, initialCourses, loading]);

  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-4 text-center sm:flex-row sm:items-end sm:text-left">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-ocean">Self-paced learning</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-950">Magnafic courses</h2>
          <p className="mt-2 text-sm font-semibold text-moss">
            {apiUser && hasProfile
              ? `Courses selected for ${apiUser.department} - ${apiUser.designation}.`
              : "Courses curated and published by the Magnafic team."}
          </p>
        </div>
        <div className="mx-auto grid grid-cols-2 gap-3 text-sm sm:mx-0">
          <Stat label="Courses" value={visibleCourses.length} />
          <Stat label="Lessons" value={visibleCourses.reduce((sum, course) => sum + (course.lessonCount || 0), 0)} />
        </div>
      </div>

      {visibleCourses.length ? (
        <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
          {visibleCourses.map((course) => <CourseCard key={course._id} course={course} />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-coral/40 bg-white p-8 text-center shadow-card">
          <h3 className="text-lg font-semibold">No Magnafic courses found</h3>
          <p className="mt-2 text-sm text-moss">Your department and designation do not have published courses yet.</p>
        </div>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white px-5 py-3 text-left shadow-card ring-1 ring-gray-100">
      <p className="text-2xl font-black text-ink">{value}</p>
      <p className="text-xs font-black uppercase tracking-wide text-moss">{label}</p>
    </div>
  );
}
