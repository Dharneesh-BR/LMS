import type { Course } from "@/lib/types";

export function getCourseRouteId(course: Pick<Course, "_id" | "slug">) {
  return course.slug?.current || course._id;
}

export function getCoursePath(course: Pick<Course, "_id" | "slug">) {
  return `/courses/${getCourseRouteId(course)}`;
}
