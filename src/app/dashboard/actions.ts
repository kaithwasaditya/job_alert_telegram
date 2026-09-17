"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AtsType } from "@/lib/ats";
import { detectCompany, pollableAtsTypes } from "@/lib/ats";
import { requireSyncedUser } from "@/lib/clerk-user";
import { softwareKeywordPresets } from "@/lib/constants";
import { query } from "@/lib/db";
import { postingMatchesSubscription } from "@/lib/matching";
import { pollCompany } from "@/lib/poller";
import { findTelegramStartForUser, sendTelegramMessage } from "@/lib/telegram";
import { slugify } from "@/lib/text";

const subscriptionSchema = z.object({
  companyId: z.string(),
  isEnabled: z.boolean()
});

export async function upsertSubscription(input: z.infer<typeof subscriptionSchema>) {
  const user = await requireSyncedUser();
  const data = subscriptionSchema.parse(input);

  await query(
    `INSERT INTO user_company_subscriptions (user_id, company_id, is_enabled)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, company_id) DO UPDATE SET is_enabled = EXCLUDED.is_enabled`,
    [user.id, data.companyId, data.isEnabled]
  );

  revalidatePath("/dashboard");
}

const preferencesSchema = z.object({
  locationFilter: z.string().min(1),
  keywordFilter: z.array(z.string()).default([]),
  customKeywords: z.string().optional(),
  experienceLevel: z.enum(["any", "internship", "entry", "mid", "senior", "staff", "manager"]),
  alertFrequency: z.enum(["hourly", "every_6h", "daily_morning", "daily_evening"])
});

export async function updateAlertPreferences(input: z.infer<typeof preferencesSchema>) {
  const user = await requireSyncedUser();
  const data = preferencesSchema.parse(input);
  const customKeywords = data.customKeywords
    ? data.customKeywords
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean)
    : [];
  const keywordFilter = Array.from(new Set([...data.keywordFilter, ...customKeywords]));

  await query(
    `INSERT INTO user_alert_preferences (user_id, location_filter, keyword_filter, experience_level, alert_frequency, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       location_filter = EXCLUDED.location_filter,
       keyword_filter = EXCLUDED.keyword_filter,
       experience_level = EXCLUDED.experience_level,
       alert_frequency = EXCLUDED.alert_frequency,
       updated_at = NOW()`,
    [user.id, data.locationFilter, keywordFilter, data.experienceLevel, data.alertFrequency]
  );

  await query(
    `UPDATE user_company_subscriptions SET alert_frequency = $1 WHERE user_id = $2`,
    [data.alertFrequency, user.id]
  );

  revalidatePath("/dashboard");
}

export async function pauseAllSubscriptions() {
  const user = await requireSyncedUser();
  await query(
    `UPDATE user_company_subscriptions SET is_enabled = FALSE WHERE user_id = $1`,
    [user.id]
  );
  revalidatePath("/dashboard");
}

export async function trackAllPollableCompanies() {
  const user = await requireSyncedUser();
  const res = await query(
    `SELECT id FROM companies WHERE is_active = TRUE AND ats_type = ANY($1::text[])`,
    [pollableAtsTypes]
  );
  const companyIds: string[] = res.rows.map((r) => r.id);

  for (const companyId of companyIds) {
    await query(
      `INSERT INTO user_company_subscriptions (user_id, company_id, is_enabled)
       VALUES ($1, $2, TRUE)
       ON CONFLICT (user_id, company_id) DO UPDATE SET is_enabled = TRUE`,
      [user.id, companyId]
    );
  }

  revalidatePath("/dashboard");
}

export async function trackCompaniesByName(input: string) {
  const user = await requireSyncedUser();
  const names = input
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);

  if (names.length === 0) {
    return { ok: false, message: "Enter one or more company names." };
  }

  const res = await query(
    `SELECT id, name, ats_type AS "atsType", is_active AS "isActive"
     FROM companies
     WHERE slug = ANY($1::text[]) OR EXISTS (
       SELECT 1 FROM unnest($1::text[]) n WHERE companies.name ILIKE '%' || n || '%'
     )`,
    [names]
  );
  const companies = res.rows as Array<{ id: string; name: string; atsType: AtsType; isActive: boolean }>;

  const pollable = companies.filter(
    (company) =>
      company.isActive &&
      (pollableAtsTypes as readonly string[]).includes(company.atsType)
  );

  for (const company of pollable) {
    await query(
      `INSERT INTO user_company_subscriptions (user_id, company_id, is_enabled)
       VALUES ($1, $2, TRUE)
       ON CONFLICT (user_id, company_id) DO UPDATE SET is_enabled = TRUE`,
      [user.id, company.id]
    );
  }

  revalidatePath("/dashboard");

  if (pollable.length === 0) {
    return { ok: false, message: "No pollable matches found for those names." };
  }

  const trackedNames = pollable.map((company) => company.name).join(", ");
  const skipped = companies.length - pollable.length;
  return {
    ok: true,
    message: skipped > 0 ? `Tracking ${trackedNames}. Skipped ${skipped} unsupported match${skipped === 1 ? "" : "es"}.` : `Tracking ${trackedNames}.`
  };
}

export async function pollNow() {
  await requireSyncedUser();
  const res = await query(
    `SELECT id, slug, ats_type AS "atsType", ats_identifier AS "atsIdentifier", name
     FROM companies
     WHERE is_active = TRUE AND ats_type = ANY($1::text[])
     ORDER BY last_polled_at ASC NULLS FIRST, name ASC
     LIMIT 8`,
    [pollableAtsTypes]
  );
  const companies = res.rows as Array<{ id: string; slug: string; atsType: AtsType; atsIdentifier: string; name: string }>;

  const results = [];

  for (const company of companies) {
    try {
      const jobCount = await pollCompany(company);
      results.push({ ok: true, name: company.name, jobCount });
    } catch {
      await query(
        `UPDATE companies SET last_polled_at = NOW(), last_poll_status = 'error' WHERE id = $1`,
        [company.id]
      );
      results.push({ ok: false, name: company.name, jobCount: 0 });
    }
  }

  revalidatePath("/dashboard");

  const okCount = results.filter((result) => result.ok).length;
  return {
    ok: okCount > 0,
    message:
      results.length === 0
        ? "No pollable companies found."
        : `Polled ${okCount}/${results.length} companies.`
  };
}

export async function checkTelegramConnection() {
  const user = await requireSyncedUser();
  const result = await findTelegramStartForUser(user.id);

  if (!result.ok) {
    return {
      ok: false,
      message: "No Telegram /start message found yet. Open the bot, send the shown command, then check again."
    };
  }

  await query(
    `INSERT INTO notification_channels (user_id, channel_type, channel_identifier, is_verified)
     VALUES ($1, 'telegram', $2, TRUE)
     ON CONFLICT (user_id, channel_type) DO UPDATE SET
       channel_identifier = EXCLUDED.channel_identifier,
       is_verified = TRUE`,
    [user.id, result.chatId]
  );

  await sendTelegramMessage(result.chatId, "Alert Bot is connected. You will receive matching job alerts here.");

  revalidatePath("/dashboard");
  return { ok: true, message: "Telegram connected." };
}

export async function sendManualAlertsNow() {
  const user = await requireSyncedUser();
  const channelRes = await query(
    `SELECT channel_identifier AS "channelIdentifier", is_verified AS "isVerified"
     FROM notification_channels
     WHERE user_id = $1 AND channel_type = 'telegram'`,
    [user.id]
  );
  const channel = channelRes.rows[0];

  if (!channel?.isVerified) {
    return { ok: false, message: "Connect Telegram before sending alerts." };
  }

  let prefRes = await query(
    `SELECT location_filter AS "locationFilter", keyword_filter AS "keywordFilter",
            experience_level AS "experienceLevel", alert_frequency AS "alertFrequency"
     FROM user_alert_preferences WHERE user_id = $1`,
    [user.id]
  );

  let preference = prefRes.rows[0];
  if (!preference) {
    const createdPref = await query(
      `INSERT INTO user_alert_preferences (user_id, location_filter, keyword_filter, experience_level, alert_frequency)
       VALUES ($1, 'Any', $2, 'any', 'every_6h')
       RETURNING location_filter AS "locationFilter", keyword_filter AS "keywordFilter",
                 experience_level AS "experienceLevel", alert_frequency AS "alertFrequency"`,
      [user.id, softwareKeywordPresets]
    );
    preference = createdPref.rows[0];
  }

  const subRes = await query(
    `SELECT ucs.id AS subscription_id, c.id AS company_id, c.name AS company_name
     FROM user_company_subscriptions ucs
     JOIN companies c ON ucs.company_id = c.id
     WHERE ucs.user_id = $1 AND ucs.is_enabled = TRUE`,
    [user.id]
  );

  const matchingByCompany = [];
  let total = 0;

  for (const sub of subRes.rows) {
    const postingsRes = await query(
      `SELECT id, title, location_raw AS "locationRaw", location_country AS "locationCountry",
              experience_level AS "experienceLevel", url
       FROM job_postings
       WHERE company_id = $1 AND is_active = TRUE
       ORDER BY first_seen_at DESC
       LIMIT 15`,
      [sub.company_id]
    );

    const postingIds = postingsRes.rows.map((p) => p.id);
    if (postingIds.length === 0) continue;

    const sentRes = await query(
      `SELECT job_posting_id FROM notifications_log
       WHERE user_id = $1 AND channel_type = 'telegram' AND job_posting_id = ANY($2::text[])`,
      [user.id, postingIds]
    );
    const sentSet = new Set(sentRes.rows.map((r) => r.job_posting_id));

    const unsent = [];
    for (const posting of postingsRes.rows) {
      if (!sentSet.has(posting.id) && postingMatchesSubscription(posting, preference)) {
        unsent.push(posting);
      }
      if (unsent.length >= 5) break;
    }

    if (unsent.length > 0) {
      matchingByCompany.push({ companyName: sub.company_name, postings: unsent });
      total += unsent.length;
    }

    if (total >= 40) break;
  }

  if (total === 0) {
    return { ok: true, message: "No new unsent matches for your current filters." };
  }

  const text = matchingByCompany
    .flatMap(({ companyName, postings }) => [
      `${companyName}: ${postings.length} matching role${postings.length === 1 ? "" : "s"}`,
      ...postings.map(
        (posting) =>
          `- ${posting.title}\n${posting.locationRaw ?? "Location not listed"}\n${posting.url}`
      ),
      ""
    ])
    .join("\n");

  const sent = await sendTelegramMessage(channel.channelIdentifier, text);

  for (const { postings } of matchingByCompany) {
    for (const posting of postings) {
      await query(
        `INSERT INTO notifications_log (user_id, job_posting_id, channel_type, sent_at, status)
         VALUES ($1, $2, 'telegram', NOW(), $3)
         ON CONFLICT (user_id, job_posting_id, channel_type) DO UPDATE SET
           sent_at = NOW(), status = EXCLUDED.status`,
        [user.id, posting.id, sent.ok ? "sent" : "failed"]
      );
    }
  }

  await query(
    `UPDATE user_company_subscriptions SET last_notified_at = NOW()
     WHERE user_id = $1 AND is_enabled = TRUE`,
    [user.id]
  );

  revalidatePath("/dashboard");
  return {
    ok: sent.ok,
    message: sent.ok ? `Sent ${total} matching alert${total === 1 ? "" : "s"}.` : "Telegram send failed."
  };
}

export async function addCompanyFromUrl(formData: FormData) {
  const user = await requireSyncedUser();
  const url = String(formData.get("url") ?? "").trim();
  if (!url) return { ok: false, message: "Paste a careers page URL first." };

  const detection = await detectCompany(url);
  if (detection.atsType === "unsupported" || detection.jobs.length === 0) {
    return { ok: false, message: detection.message };
  }

  const parsedUrl = new URL(url);
  const name = parsedUrl.hostname.replace(/^www\./, "").split(".")[0];
  const slug = slugify(name);

  const companyRes = await query(
    `INSERT INTO companies (name, slug, ats_type, ats_identifier, is_active, last_poll_status)
     VALUES ($1, $2, $3, $4, TRUE, 'pending')
     ON CONFLICT (slug) DO UPDATE SET
       ats_type = EXCLUDED.ats_type,
       ats_identifier = EXCLUDED.ats_identifier,
       is_active = TRUE,
       last_poll_status = 'pending'
     RETURNING id, name`,
    [name.charAt(0).toUpperCase() + name.slice(1), slug, detection.atsType, detection.atsIdentifier]
  );
  const company = companyRes.rows[0];

  await query(
    `INSERT INTO user_company_subscriptions (user_id, company_id, is_enabled)
     VALUES ($1, $2, TRUE)
     ON CONFLICT (user_id, company_id) DO UPDATE SET is_enabled = TRUE`,
    [user.id, company.id]
  );

  revalidatePath("/dashboard");
  return { ok: true, message: `${detection.message} Added ${company.name}.` };
}
