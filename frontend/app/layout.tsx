import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { Header } from "@/components/header";
import { CourseChat } from "@/components/course-chat";

export const metadata: Metadata = {
  title: "Magnafic Academy | Top 1% Expert Consulting Courses",
  description: "Self-paced Magnafic Academy courses for FMCG, CPG, AI execution, distribution, and consumer brand growth.",
  icons: {
    icon: "/favicon1.ico"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Header />
          <main>{children}</main>
          <CourseChat />
        </AuthProvider>
      </body>
    </html>
  );
}
