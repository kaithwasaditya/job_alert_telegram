import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AddCompanyForm } from "@/app/dashboard/add-company-form";
import { AlertPreferencesForm } from "@/app/dashboard/alert-preferences-form";
import { BulkActions } from "@/app/dashboard/bulk-actions";
import { CompanyDirectory } from "@/app/dashboard/company-directory";
import { TelegramConnectPanel } from "@/app/dashboard/telegram-connect-panel";
import { requireSyncedUser } from "@/lib/clerk-user";
import { softwareKeywordPresets } from "@/lib/constants";
import { query } from "@/lib/db";
import { telegramDeepLink, telegramStartCommand } from "@/lib/telegram";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const user = await requireSyncedUser();

  const [companiesRes, channelsRes, subCountRes] = await Promise.all([
    query(
      `SELECT 
         c.id, c.name, c.ats_type AS "atsType", c.tags, c.is_active AS "isActive", c.last_poll_status AS "lastPollStatus",
         (SELECT COUNT(*)::int FROM job_postings jp WHERE jp.company_id = c.id AND jp.is_active = TRUE) AS "postingCount",
         ucs.is_enabled AS "subscriptionIsEnabled"
       FROM companies c
       LEFT JOIN user_company_subscriptions ucs ON ucs.company_id = c.id AND ucs.user_id = $1
       WHERE c.is_active = TRUE
       ORDER BY c.name ASC`,
      [user.id]
    ),
    query(
      `SELECT channel_type AS "channelType", channel_identifier AS "channelIdentifier", is_verified AS "isVerified"
       FROM notification_channels WHERE user_id = $1`,
      [user.id]
    ),
    query(
      `SELECT COUNT(*)::int AS count FROM user_company_subscriptions WHERE user_id = $1 AND is_enabled = TRUE`,
      [user.id]
    )
  ]);

  let prefRes = await query(
    `SELECT location_filter AS "locationFilter", keyword_filter AS "keywordFilter",
            experience_level AS "experienceLevel", alert_frequency AS "alertFrequency"
     FROM user_alert_preferences WHERE user_id = $1`,
    [user.id]
  );

  let preference = prefRes.rows[0];
  if (!preference) {
    const insertRes = await query(
      `INSERT INTO user_alert_preferences (user_id, location_filter, keyword_filter, experience_level, alert_frequency)
       VALUES ($1, 'Any', $2, 'any', 'every_6h')
       RETURNING location_filter AS "locationFilter", keyword_filter AS "keywordFilter",
                 experience_level AS "experienceLevel", alert_frequency AS "alertFrequency"`,
      [user.id, softwareKeywordPresets]
    );
    preference = insertRes.rows[0];
  }

  const companies = companiesRes.rows.map((row) => ({
    id: row.id,
    name: row.name,
    atsType: row.atsType,
    tags: row.tags ?? [],
    isActive: row.isActive,
    lastPollStatus: row.lastPollStatus,
    _count: { postings: row.postingCount },
    subscriptions: row.subscriptionIsEnabled !== null ? [{ isEnabled: row.subscriptionIsEnabled }] : []
  }));

  const channels = channelsRes.rows;
  const subscriptionCount = subCountRes.rows[0]?.count ?? 0;
  const telegram = channels.find((channel) => channel.channelType === "telegram");
  const deepLink = telegramDeepLink(user.id);

  return (
    <main className="page">
      <section className="dashboardHeader">
        <div>
          <p className="eyebrow">Alert Bot</p>
          <h1>
            Your <span className="serifAccent">alert desk.</span>
          </h1>
          <p>
            Track first-party ATS sources once globally, then receive only the
            roles matching your personal filters.
          </p>
        </div>
        <BulkActions />
      </section>

      <section className="dashboardStats" style={{ marginBottom: 18 }}>
        <div className="stat">
          <strong>{companies.length}</strong>
          <span>companies available</span>
        </div>
        <div className="stat">
          <strong>{subscriptionCount}</strong>
          <span>active subscriptions</span>
        </div>
        <div className="stat">
          <strong>{telegram?.isVerified ? "Connected" : "Not connected"}</strong>
          <span>Telegram status</span>
        </div>
        <div className="stat">
          <strong>{companies.filter((company) => company.lastPollStatus === "ok").length}</strong>
          <span>healthy pollers</span>
        </div>
      </section>

      <AlertPreferencesForm preference={preference} />

      <div className="layoutGrid">
        <CompanyDirectory companies={companies} />

        <aside className="stack">
          <section className="panel">
            <h2>Add company</h2>
            <AddCompanyForm />
          </section>
          <TelegramConnectPanel
            deepLink={deepLink}
            startCommand={telegramStartCommand(user.id)}
            isConnected={telegram?.isVerified ?? false}
          />
        </aside>
      </div>
    </main>
  );
}
