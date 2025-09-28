/*
  Warnings:

  - You are about to drop the `submission_logs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."submission_logs" DROP CONSTRAINT "submission_logs_submission_id_fkey";

-- DropTable
DROP TABLE "public"."submission_logs";

-- CreateTable
CREATE TABLE "public"."SubmissionLog" (
    "id" BIGSERIAL NOT NULL,
    "traceId" TEXT NOT NULL,
    "uri" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "httpStatus" INTEGER NOT NULL,
    "resultStatus" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "message" TEXT,
    "submissionId" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExternalCallLog" (
    "id" BIGSERIAL NOT NULL,
    "traceId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "endpoint" TEXT,
    "method" TEXT,
    "httpStatus" INTEGER,
    "resultStatus" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalCallLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubmissionLog_submissionId_idx" ON "public"."SubmissionLog"("submissionId");

-- CreateIndex
CREATE INDEX "SubmissionLog_traceId_idx" ON "public"."SubmissionLog"("traceId");

-- CreateIndex
CREATE INDEX "SubmissionLog_createdAt_idx" ON "public"."SubmissionLog"("createdAt");

-- CreateIndex
CREATE INDEX "ExternalCallLog_traceId_idx" ON "public"."ExternalCallLog"("traceId");

-- CreateIndex
CREATE INDEX "ExternalCallLog_category_createdAt_idx" ON "public"."ExternalCallLog"("category", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."SubmissionLog" ADD CONSTRAINT "SubmissionLog_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "public"."submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
