-- CreateEnum
CREATE TYPE "AtsType" AS ENUM ('greenhouse', 'lever', 'workday', 'custom_scraped', 'custom', 'unsupported');

-- CreateEnum
CREATE TYPE "PollStatus" AS ENUM ('ok', 'error', 'pending');

-- CreateEnum
CREATE TYPE "AlertFrequency" AS ENUM ('hourly', 'every_6h', 'daily_morning', 'daily_evening');

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('telegram', 'whatsapp');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('sent', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ats_type" "AtsType" NOT NULL,
    "ats_identifier" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_polled_at" TIMESTAMP(3),
    "last_poll_status" "PollStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_postings" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location_raw" TEXT,
    "location_country" TEXT,
    "department" TEXT,
    "url" TEXT NOT NULL,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "job_postings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_company_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "location_filter" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keyword_filter" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "alert_frequency" "AlertFrequency" NOT NULL DEFAULT 'every_6h',
    "last_notified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_company_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_channels" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel_type" "ChannelType" NOT NULL,
    "channel_identifier" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications_log" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "job_posting_id" TEXT NOT NULL,
    "channel_type" "ChannelType" NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "NotificationStatus" NOT NULL,

    CONSTRAINT "notifications_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");

-- CreateIndex
CREATE INDEX "job_postings_first_seen_at_idx" ON "job_postings"("first_seen_at");

-- CreateIndex
CREATE UNIQUE INDEX "job_postings_company_id_external_id_key" ON "job_postings"("company_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_company_subscriptions_user_id_company_id_key" ON "user_company_subscriptions"("user_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_channels_user_id_channel_type_key" ON "notification_channels"("user_id", "channel_type");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_log_user_id_job_posting_id_channel_type_key" ON "notifications_log"("user_id", "job_posting_id", "channel_type");

-- AddForeignKey
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_company_subscriptions" ADD CONSTRAINT "user_company_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_company_subscriptions" ADD CONSTRAINT "user_company_subscriptions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_channels" ADD CONSTRAINT "notification_channels_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications_log" ADD CONSTRAINT "notifications_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications_log" ADD CONSTRAINT "notifications_log_job_posting_id_fkey" FOREIGN KEY ("job_posting_id") REFERENCES "job_postings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
