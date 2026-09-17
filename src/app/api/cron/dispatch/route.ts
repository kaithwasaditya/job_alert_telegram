import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { query } from "@/lib/db";
import { postingMatchesSubscription, shouldDispatchNow } from "@/lib/matching";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subRes = await query(
    `SELECT 
       ucs.id AS subscription_id, ucs.user_id, ucs.company_id, ucs.alert_frequency, ucs.last_notified_at,
       c.name AS company_name,
       nc.channel_identifier AS telegram_chat_id,
       uap.location_filter, uap.keyword_filter, uap.experience_level, uap.alert_frequency AS user_alert_frequency
     FROM user_company_subscriptions ucs
     JOIN companies c ON ucs.company_id = c.id
     LEFT JOIN notification_channels nc ON nc.user_id = ucs.user_id AND nc.channel_type = 'telegram' AND nc.is_verified = TRUE
     LEFT JOIN user_alert_preferences uap ON uap.user_id = ucs.user_id
     WHERE ucs.is_enabled = TRUE`
  );

  const results = [];

  for (const sub of subRes.rows) {
    const preference = {
      locationFilter: sub.location_filter ?? "Any",
      keywordFilter: sub.keyword_filter ?? [],
      experienceLevel: sub.experience_level ?? "any",
      alertFrequency: sub.user_alert_frequency ?? sub.alert_frequency ?? "every_6h"
    };

    if (!shouldDispatchNow(preference.alertFrequency, sub.last_notified_at)) continue;

    if (!sub.telegram_chat_id) {
      results.push({ subscription: sub.subscription_id, status: "skipped_no_telegram" });
      continue;
    }

    const postingsRes = await query(
      `SELECT id, title, location_raw AS "locationRaw", location_country AS "locationCountry",
              experience_level AS "experienceLevel", url
       FROM job_postings
       WHERE company_id = $1 AND is_active = TRUE
       ORDER BY first_seen_at DESC
       LIMIT 25`,
      [sub.company_id]
    );

    const unsent = [];
    for (const posting of postingsRes.rows) {
      const sentRes = await query(
        `SELECT 1 FROM notifications_log
         WHERE user_id = $1 AND job_posting_id = $2 AND channel_type = 'telegram' AND status = 'sent'`,
        [sub.user_id, posting.id]
      );
      if (sentRes.rowCount === 0 && postingMatchesSubscription(posting, preference)) {
        unsent.push(posting);
      }
    }

    if (unsent.length === 0) {
      continue;
    }

    const text = [
      `${sub.company_name}: ${unsent.length} new matching role${unsent.length === 1 ? "" : "s"}`,
      "",
      ...unsent.slice(0, 10).map((posting) => `- ${posting.title}\n${posting.locationRaw ?? "Location not listed"}\n${posting.url}`)
    ].join("\n");

    const sent = await sendTelegramMessage(sub.telegram_chat_id, text);

    for (const posting of unsent) {
      await query(
        `INSERT INTO notifications_log (id, user_id, job_posting_id, channel_type, sent_at, status)
         VALUES ($1, $2, $3, 'telegram', NOW(), $4)
         ON CONFLICT (user_id, job_posting_id, channel_type) DO UPDATE SET
           sent_at = NOW(), status = EXCLUDED.status`,
        [randomUUID(), sub.user_id, posting.id, sent.ok ? "sent" : "failed"]
      );
    }

    if (sent.ok) {
      await query(
        `UPDATE user_company_subscriptions SET last_notified_at = NOW() WHERE id = $1`,
        [sub.subscription_id]
      );
    }

    results.push({ subscription: sub.subscription_id, status: sent.ok ? "sent" : "failed", count: unsent.length });
  }

  return NextResponse.json({ results });
}

export async function GET(request: Request) {
  return POST(request);
}
