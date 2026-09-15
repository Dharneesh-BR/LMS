import { createImageUrlBuilder } from "@sanity/image-url";
import { prisma } from "../config/prisma.js";
import { sanityClient } from "../config/sanity.js";
import { ApiError } from "../middleware/error.middleware.js";

const courseImageBuilder = createImageUrlBuilder(sanityClient);

const coursePageMediaFields = `
  mediaType,
  "imageUrl": image.asset->url,
  "imageAlt": image.alt,
  videoUrl,
  "videoFileUrl": videoFile.asset->url,
  caption
`;

const courseListQuery = `*[_type == "course"] | order(title asc) {
  _id,
  title,
  slug,
  excerpt,
  targetDepartments,
  targetDesignations,
  mainImage {
    asset,
    alt,
    crop,
    hotspot,
    "url": asset->url,
    "lqip": asset->metadata.lqip,
    "dimensions": asset->metadata.dimensions
  },
  "moduleCount": count(modules[]),
  "lessonCount": count(*[_type == "lesson" && module._ref in ^.modules[]._ref])
}`;

const courseDetailQuery = `*[_type == "course" && (_id == $id || slug.current == $id)][0] {
  _id,
  title,
  slug,
  excerpt,
  targetDepartments,
  targetDesignations,
  mainImage {
    asset,
    alt,
    crop,
    hotspot,
    "url": asset->url,
    "lqip": asset->metadata.lqip,
    "dimensions": asset->metadata.dimensions
  },
  description,
  landingPage {
    eyebrow,
    headline,
    shortDescription,
    startButtonLabel,
    theme,
    seoTitle,
    seoDescription,
    sections[] {
      _key,
      sectionTitle,
      sectionFormat,
      intro,
      body[],
      media {${coursePageMediaFields}},
      items[] {
        _key,
        title,
        description,
        metric,
        iconLabel,
        media {${coursePageMediaFields}}
      },
      modules[] {
        _key,
        title,
        description,
        lessons,
        media {${coursePageMediaFields}}
      },
      timeline[] {
        _key,
        timeLabel,
        title,
        description,
        media {${coursePageMediaFields}}
      },
      faqs[] {
        _key,
        question,
        answer
      },
      testimonials[] {
        _key,
        quote,
        name,
        designation,
        media {${coursePageMediaFields}}
      },
      cta {
        headline,
        description,
        buttonLabel,
        buttonAction,
        buttonUrl
      }
    }
  },
  finalAssessment->{
    _id,
    title,
    instructions,
    passingPercentage,
    maxAttempts,
    "questionCount": count(questions)
  },
  certificateTemplate->{
    _id,
    title,
    version,
    heading,
    introText,
    completionText,
    footerText,
    verificationText,
    primaryColor,
    accentColor,
    "backgroundImageUrl": backgroundImage.asset->url,
    "logoUrl": logo.asset->url,
    signatories[]{
      _key,
      name,
      designation,
      "signatureUrl": signature.asset->url
    }
  },
  modules[]->{
    _id,
    title,
    order,
    "lessons": *[_type == "lesson" && references(^._id)] | order(order asc) {
      _id,
      title,
      summary,
      duration,
      order,
      assessment->{
        _id,
        title,
        instructions,
        passingPercentage,
        maxAttempts,
        "questionCount": count(questions)
      },
      videoUrl,
      materials[]{
        _key,
        title,
        resourceType,
        "url": file.asset->url,
        "fileName": file.asset->originalFilename,
        "mimeType": file.asset->mimeType,
        "extension": file.asset->extension
      },
      content
    }
  }
}`;

function addCourseImageVariants(course) {
  if (!course?.mainImage?.asset) return course;

  return {
    ...course,
    mainImage: {
      ...course.mainImage,
      cardUrl: courseImageBuilder
        .image(course.mainImage)
        .width(800)
        .height(1000)
        .fit("crop")
        .auto("format")
        .url(),
      bannerUrl: courseImageBuilder
        .image(course.mainImage)
        .width(720)
        .height(960)
        .fit("crop")
        .auto("format")
        .url()
    }
  };
}

function normalizeAudienceValue(value) {
  return String(value || "").trim().toLowerCase();
}

export function courseMatchesAudience(course, { department, designation } = {}) {
  const requestedDepartment = normalizeAudienceValue(department);
  const requestedDesignation = normalizeAudienceValue(designation);
  const courseDepartments = (course.targetDepartments || []).map(normalizeAudienceValue).filter(Boolean);
  const courseDesignations = (course.targetDesignations || []).map(normalizeAudienceValue).filter(Boolean);

  const departmentMatches = courseDepartments.length
    ? Boolean(requestedDepartment && courseDepartments.includes(requestedDepartment))
    : true;
  const designationMatches = courseDesignations.length
    ? Boolean(requestedDesignation && courseDesignations.includes(requestedDesignation))
    : true;

  return departmentMatches && designationMatches;
}

export function assertCourseAudience(course, user) {
  if (!courseMatchesAudience(course, {
    department: user?.department,
    designation: user?.designation
  })) {
    throw new ApiError(403, "This course is not assigned to your department or designation");
  }
}

export async function listCourses(filters = {}, options = {}) {
  const courses = (await sanityClient.fetch(courseListQuery)).map(addCourseImageVariants);
  const visibleCourses = courses.filter((course) => courseMatchesAudience(course, filters));
  if (options.sync !== false) {
    await Promise.all(courses.map((course) => syncCourse(course).catch((error) => {
      console.warn(`Unable to sync Sanity course ${course._id} to Prisma`, error);
    })));
  }
  return visibleCourses;
}

export async function getCourseBySanityId(sanityId) {
  return addCourseImageVariants(
    await sanityClient.fetch(courseDetailQuery, { id: sanityId })
  );
}

export async function syncCourse(course) {
  return prisma.course.upsert({
    where: { sanityId: course._id },
    update: {
      title: course.title,
      price: 0
    },
    create: {
      sanityId: course._id,
      title: course.title,
      price: 0
    }
  });
}

export function stripLockedLessonData(course) {
  return {
    ...course,
    modules: course.modules?.map((module) => ({
      ...module,
      lessons: module.lessons?.map(({ videoUrl, materials, content, ...lesson }) => ({
        ...lesson,
        locked: true
      }))
    }))
  };
}
