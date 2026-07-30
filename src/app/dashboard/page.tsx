import { auth } from "@clerk/nextjs/server";
import { PauseCircle } from "lucide-react";
import { redirect } from "next/navigation";
import { AddCompanyForm } from "@/app/dashboard/add-company-form";
import { AlertPreferencesForm } from "@/app/dashboard/alert-preferences-form";
import { CompanyDirectory } from "@/app/dashboard/company-directory";
import { pauseAllSubscriptions } from "@/app/dashboard/actions";
import { TelegramConnectPanel } from "@/app/dashboard/telegram-connect-panel";
import { requireSyncedUser } from "@/lib/clerk-user";
import { softwareKeywordPresets } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { telegramDeepLink, telegramStartCommand } from "@/lib/telegram";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const user = await requireSyncedUser();
  const [companies, channels, subscriptionCount, preference] = await Promise.all([
    prisma.company.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: {
        _count: { select: { postings: { where: { isActive: true } } } },
        subscriptions: { where: { userId: user.id }, take: 1 }
      }
    }),
    prisma.notificationChannel.findMany({ where: { userId: user.id } }),
    prisma.userCompanySubscription.count({ where: { userId: user.id, isEnabled: true } }),
    prisma.userAlertPreference.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        locationFilter: "Any",
        keywordFilter: [...softwareKeywordPresets],
        experienceLevel: "any",
        alertFrequency: "every_6h"
      }
    })
  ]);

  const telegram = channels.find((channel) => channel.channelType === "telegram");
  const deepLink = telegramDeepLink(user.id);

  return (
    <main className="page">
      <section className="dashboardHeader">
        <div>
          <h1>Your alert desk.</h1>
          <p>
            Track first-party ATS sources once globally, then receive only the
            roles matching your personal filters.
          </p>
        </div>
        <div className="dashboardActions">
          <form action={pauseAllSubscriptions}>
            <button className="button" type="submit">
              <PauseCircle size={17} />
              Pause all
            </button>
          </form>
        </div>
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

      <div style={{ marginBottom: 18 }}>
        <AlertPreferencesForm preference={preference} />
      </div>

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
          <section className="panel">
            <h2>Setup needed</h2>
            <div className="stack muted">
              <span>Add Clerk keys to `.env`.</span>
              <span>Add a Postgres `DATABASE_URL`.</span>
              <span>Create a Telegram bot and set its token.</span>
              <span>Run the seed and detection scripts.</span>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
