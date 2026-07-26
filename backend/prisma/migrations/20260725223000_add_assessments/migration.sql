CREATE TYPE "AssessmentType" AS ENUM ('LESSON', 'FINAL');

ALTER TABLE "progress"
ADD COLUMN "content_completed" BOOLEAN NOT NULL DEFAULT false;

UPDATE "progress"
SET "content_completed" = "completed";

CREATE TABLE "assessment_attempts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "lesson_id" TEXT,
    "type" "AssessmentType" NOT NULL,
    "answers" JSONB NOT NULL,
    "score" INTEGER NOT NULL,
    "passing_percentage" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "assessment_attempts_user_id_course_id_assessment_id_idx"
ON "assessment_attempts"("user_id", "course_id", "assessment_id");

CREATE INDEX "assessment_attempts_user_id_course_id_lesson_id_idx"
ON "assessment_attempts"("user_id", "course_id", "lesson_id");

ALTER TABLE "assessment_attempts"
ADD CONSTRAINT "assessment_attempts_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "assessment_attempts"
ADD CONSTRAINT "assessment_attempts_course_id_fkey"
FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
