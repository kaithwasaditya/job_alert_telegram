import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AddCompanyForm } from "@/app/dashboard/add-company-form";
import { AlertPreferencesForm } from "@/app/dashboard/alert-preferences-form";
import { BulkActions } from "@/app/dashboard/bulk-actions";
import { CompanyDirectory } from "@/app/dashboard/company-directory";
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
        </aside>
      </div>
    </main>
  );
}
