CREATE TABLE "course_completions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_completions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "certificate_number" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "completion_id" TEXT NOT NULL,
    "recipient_name" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "template_id" TEXT NOT NULL,
    "template_version" INTEGER NOT NULL,
    "content_snapshot" JSONB NOT NULL,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "course_completions_user_id_course_id_key"
ON "course_completions"("user_id", "course_id");

CREATE UNIQUE INDEX "certificates_certificate_number_key"
ON "certificates"("certificate_number");

CREATE UNIQUE INDEX "certificates_completion_id_key"
ON "certificates"("completion_id");

CREATE UNIQUE INDEX "certificates_user_id_course_id_key"
ON "certificates"("user_id", "course_id");

CREATE INDEX "certificates_course_id_idx" ON "certificates"("course_id");

ALTER TABLE "course_completions"
ADD CONSTRAINT "course_completions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "course_completions"
ADD CONSTRAINT "course_completions_course_id_fkey"
FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "certificates"
ADD CONSTRAINT "certificates_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "certificates"
ADD CONSTRAINT "certificates_course_id_fkey"
FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "certificates"
ADD CONSTRAINT "certificates_completion_id_fkey"
FOREIGN KEY ("completion_id") REFERENCES "course_completions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
