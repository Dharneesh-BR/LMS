import { prisma } from "../config/prisma.js";
import { sanityClient } from "../config/sanity.js";

const courseListQuery = `*[_type == "course"] | order(title asc) {
  _id,
  title,
  slug,
  excerpt,
  price,
  "moduleCount": count(modules[]),
  "lessonCount": count(*[_type == "lesson" && module._ref in ^.modules[]._ref])
}`;

const courseDetailQuery = `*[_type == "course" && _id == $id][0] {
  _id,
  title,
  slug,
  excerpt,
  description,
  price,
  modules[]->{
    _id,
    title,
    order,
    "lessons": *[_type == "lesson" && references(^._id)] | order(order asc) {
      _id,
      title,
      duration,
      order,
      videoUrl,
      content
    }
  }
}`;

export async function listCourses() {
  const courses = await sanityClient.fetch(courseListQuery);
  await Promise.all(courses.map((course) => syncCourse(course).catch((error) => {
    console.warn(`Unable to sync Sanity course ${course._id} to Prisma`, error);
  })));
  return courses;
}

export async function getCourseBySanityId(sanityId) {
  const course = await sanityClient.fetch(courseDetailQuery, { id: sanityId });
  if (course) {
    await syncCourse(course);
  }
  return course;
}

export async function syncCourse(course) {
  return prisma.course.upsert({
    where: { sanityId: course._id },
    update: {
      title: course.title,
      price: Number(course.price || 0)
    },
    create: {
      sanityId: course._id,
      title: course.title,
      price: Number(course.price || 0)
    }
  });
}

export function stripLockedLessonData(course) {
  return {
    ...course,
    modules: course.modules?.map((module) => ({
      ...module,
      lessons: module.lessons?.map(({ videoUrl, content, ...lesson }) => ({
        ...lesson,
        locked: true
      }))
    }))
  };
}
