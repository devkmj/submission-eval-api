-- AlterTable
ALTER TABLE "public"."submissions" ADD COLUMN     "retry_count" INTEGER NOT NULL DEFAULT 0;
