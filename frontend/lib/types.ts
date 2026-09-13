import type { PortableTextBlock } from "@portabletext/types";

export type Lesson = {
  _id: string;
  title: string;
  duration?: string;
  order?: number;
  videoUrl?: string | null;
  content?: PortableTextBlock[];
  locked?: boolean;
};

export type CoursePageMedia = {
  mediaType?: "image" | "video-url" | "video-file";
  imageUrl?: string;
  imageAlt?: string;
  videoUrl?: string;
  videoFileUrl?: string;
  caption?: string;
};

export type CoursePageItem = {
  _key?: string;
  title?: string;
  description?: string;
  metric?: string;
  iconLabel?: string;
  media?: CoursePageMedia;
};

export type CoursePageSection = {
  _key?: string;
  sectionTitle: string;
  sectionFormat?:
    | "content"
    | "rich-text"
    | "list"
    | "cards"
    | "differentiators"
    | "accordion"
    | "curriculum"
    | "timeline"
    | "faqs"
    | "outcomes"
    | "testimonials"
    | "stats"
    | "media-gallery"
    | "cta";
  intro?: string;
  body?: PortableTextBlock[];
  media?: CoursePageMedia;
  items?: CoursePageItem[];
  modules?: Array<{
    _key?: string;
    title: string;
    description?: string;
    lessons?: string[];
    media?: CoursePageMedia;
  }>;
  timeline?: Array<{
    _key?: string;
    timeLabel?: string;
    title: string;
    description?: string;
    media?: CoursePageMedia;
  }>;
  faqs?: Array<{
    _key?: string;
    question: string;
    answer: string;
  }>;
  testimonials?: Array<{
    _key?: string;
    quote: string;
    name?: string;
    designation?: string;
    media?: CoursePageMedia;
  }>;
  cta?: {
    headline?: string;
    description?: string;
    buttonLabel?: string;
    buttonAction?: "start-course" | "link";
    buttonUrl?: string;
  };
};

export type Module = {
  _id: string;
  title: string;
  order?: number;
  lessons?: Lesson[];
};

export type Course = {
  _id: string;
  title: string;
  slug?: { current: string };
  excerpt?: string;
  targetDepartments?: string[];
  targetDesignations?: string[];
  mainImage?: {
    alt?: string;
    url?: string;
    cardUrl?: string;
    bannerUrl?: string;
  };
  description?: PortableTextBlock[];
  landingPage?: {
    eyebrow?: string;
    headline?: string;
    shortDescription?: string;
    startButtonLabel?: string;
    theme?: "dark" | "light" | "alternating";
    seoTitle?: string;
    seoDescription?: string;
    sections?: CoursePageSection[];
  };
  moduleCount?: number;
  lessonCount?: number;
  modules?: Module[];
};

export type ApiUser = {
  id: string;
  firebaseUid: string;
  name?: string | null;
  email: string;
  department?: string | null;
  designation?: string | null;
  role: "STUDENT" | "ADMIN";
};
