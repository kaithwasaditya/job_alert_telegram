-- PostgreSQL Schema for Job Alert Bot

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_alert_preferences (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_filter TEXT NOT NULL DEFAULT 'Any',
  keyword_filter TEXT[] NOT NULL DEFAULT '{}',
  experience_level TEXT NOT NULL DEFAULT 'any',
  alert_frequency TEXT NOT NULL DEFAULT 'every_6h',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  ats_type TEXT NOT NULL,
  ats_identifier TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_polled_at TIMESTAMPTZ,
  last_poll_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_postings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  location_raw TEXT,
  location_country TEXT,
  department TEXT,
  experience_level TEXT NOT NULL DEFAULT 'any',
  url TEXT NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT job_postings_company_id_external_id_key UNIQUE (company_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_job_postings_first_seen_at ON job_postings(first_seen_at);

CREATE TABLE IF NOT EXISTS user_company_subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  location_filter TEXT[] NOT NULL DEFAULT '{}',
  keyword_filter TEXT[] NOT NULL DEFAULT '{}',
  alert_frequency TEXT NOT NULL DEFAULT 'every_6h',
  last_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_company_subscriptions_user_id_company_id_key UNIQUE (user_id, company_id)
);

CREATE TABLE IF NOT EXISTS notification_channels (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL,
  channel_identifier TEXT NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notification_channels_user_id_channel_type_key UNIQUE (user_id, channel_type)
);

CREATE TABLE IF NOT EXISTS notifications_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_posting_id TEXT NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL,
  CONSTRAINT notifications_log_user_id_job_posting_id_channel_type_key UNIQUE (user_id, job_posting_id, channel_type)
);
