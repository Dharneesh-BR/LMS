import { createClient } from "@sanity/client";

export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-06-01",
  useCdn: false
});

export const publicCoursesQuery = `*[_type == "course"] | order(title asc) {
  _id,
  title,
  slug,
  excerpt,
  price,
  "moduleCount": count(modules[]),
  "lessonCount": count(*[_type == "lesson" && module._ref in ^.modules[]._ref])
}`;
