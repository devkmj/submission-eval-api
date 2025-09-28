/*
  Warnings:

  - The `status` column on the `submissions` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."SubmissionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."RevisionStatus" AS ENUM ('REQUESTED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "public"."submissions" DROP COLUMN "status",
ADD COLUMN     "status" "public"."SubmissionStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "public"."submission_media" (
    "id" BIGSERIAL NOT NULL,
    "submission_id" BIGINT NOT NULL,
    "video_url" TEXT,
    "audio_url" TEXT,
    "meta" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submission_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."submission_logs" (
    "id" BIGSERIAL NOT NULL,
    "submission_id" BIGINT,
    "kind" TEXT NOT NULL,
    "uri" TEXT,
    "status" TEXT NOT NULL,
    "latency_ms" INTEGER,
    "trace_id" TEXT,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."revisions" (
    "id" BIGSERIAL NOT NULL,
    "submission_id" BIGINT NOT NULL,
    "status" "public"."RevisionStatus" NOT NULL DEFAULT 'REQUESTED',
    "score" INTEGER,
    "feedback" TEXT,
    "highlights" JSONB,
    "api_latency_ms" INTEGER,
    "trace_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stats_daily" (
    "day" TIMESTAMP(3) NOT NULL,
    "total" INTEGER NOT NULL,
    "success" INTEGER NOT NULL,
    "failed" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stats_daily_pkey" PRIMARY KEY ("day")
);

-- CreateTable
CREATE TABLE "public"."stats_weekly" (
    "week_start" TIMESTAMP(3) NOT NULL,
    "total" INTEGER NOT NULL,
    "success" INTEGER NOT NULL,
    "failed" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stats_weekly_pkey" PRIMARY KEY ("week_start")
);

-- CreateTable
CREATE TABLE "public"."stats_monthly" (
    "month_start" TIMESTAMP(3) NOT NULL,
    "total" INTEGER NOT NULL,
    "success" INTEGER NOT NULL,
    "failed" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stats_monthly_pkey" PRIMARY KEY ("month_start")
);

-- CreateIndex
CREATE UNIQUE INDEX "submission_media_submission_id_key" ON "public"."submission_media"("submission_id");

-- CreateIndex
CREATE INDEX "submission_logs_submission_id_created_at_idx" ON "public"."submission_logs"("submission_id", "created_at");

-- CreateIndex
CREATE INDEX "revisions_submission_id_created_at_idx" ON "public"."revisions"("submission_id", "created_at");

-- CreateIndex
CREATE INDEX "submissions_student_id_component_type_idx" ON "public"."submissions"("student_id", "component_type");

-- AddForeignKey
ALTER TABLE "public"."submission_media" ADD CONSTRAINT "submission_media_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."submission_logs" ADD CONSTRAINT "submission_logs_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."revisions" ADD CONSTRAINT "revisions_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
