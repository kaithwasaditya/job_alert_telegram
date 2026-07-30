-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('any', 'internship', 'entry', 'mid', 'senior', 'staff', 'manager');

-- AlterTable
ALTER TABLE "job_postings" ADD COLUMN     "experience_level" "ExperienceLevel" NOT NULL DEFAULT 'any';

-- CreateTable
CREATE TABLE "user_alert_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "location_filter" TEXT NOT NULL DEFAULT 'Any',
    "keyword_filter" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "experience_level" "ExperienceLevel" NOT NULL DEFAULT 'any',
    "alert_frequency" "AlertFrequency" NOT NULL DEFAULT 'every_6h',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_alert_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_alert_preferences_user_id_key" ON "user_alert_preferences"("user_id");

-- AddForeignKey
ALTER TABLE "user_alert_preferences" ADD CONSTRAINT "user_alert_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
