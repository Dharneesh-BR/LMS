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
  description?: PortableTextBlock[];
  moduleCount?: number;
  lessonCount?: number;
  modules?: Module[];
};

export type ApiUser = {
  id: string;
  firebaseUid: string;
  name?: string | null;
  email: string;
  role: "STUDENT" | "ADMIN";
};
