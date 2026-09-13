import { LearnerHome } from "@/components/learner-home";
import { Protected } from "@/components/protected";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <Protected>
      <LearnerHome />
    </Protected>
  );
}
