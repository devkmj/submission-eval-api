/*
  Warnings:

  - You are about to drop the column `audio_url` on the `submission_media` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `submission_media` table. All the data in the column will be lost.
  - You are about to drop the column `submission_id` on the `submission_media` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `submission_media` table. All the data in the column will be lost.
  - You are about to drop the column `video_url` on the `submission_media` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[submissionId]` on the table `submission_media` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `submissionId` to the `submission_media` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `submission_media` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."submission_media" DROP CONSTRAINT "submission_media_submission_id_fkey";

-- DropIndex
DROP INDEX "public"."submission_media_submission_id_key";

-- AlterTable
ALTER TABLE "public"."submission_media" DROP COLUMN "audio_url",
DROP COLUMN "created_at",
DROP COLUMN "submission_id",
DROP COLUMN "updated_at",
DROP COLUMN "video_url",
ADD COLUMN     "audioUrl" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "submissionId" BIGINT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "videoUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "submission_media_submissionId_key" ON "public"."submission_media"("submissionId");

-- AddForeignKey
ALTER TABLE "public"."submission_media" ADD CONSTRAINT "submission_media_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "public"."submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
