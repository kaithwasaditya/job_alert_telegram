import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { postingMatchesSubscription, shouldDispatchNow } from "@/lib/matching";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscriptions = await prisma.userCompanySubscription.findMany({
    where: { isEnabled: true },
    include: {
      company: {
        include: {
          postings: {
            where: { isActive: true },
            orderBy: { firstSeenAt: "desc" },
            take: 25
          }
        }
      },
      user: {
        include: {
          alertPreference: true,
          notificationChannels: {
            where: { channelType: "telegram", isVerified: true },
            take: 1
          }
        }
      }
    }
  });

  const results = [];

  for (const subscription of subscriptions) {
    const preference =
      subscription.user.alertPreference ?? {
        locationFilter: "Any",
        keywordFilter: [],
        experienceLevel: "any" as const,
        alertFrequency: subscription.alertFrequency
      };

    if (!shouldDispatchNow(preference.alertFrequency, subscription.lastNotifiedAt)) continue;

    const channel = subscription.user.notificationChannels[0];
    if (!channel) {
      results.push({ subscription: subscription.id, status: "skipped_no_telegram" });
      continue;
    }

    const unsent = [];
    for (const posting of subscription.company.postings) {
      const alreadySent = await prisma.notificationLog.findUnique({
        where: {
          userId_jobPostingId_channelType: {
            userId: subscription.userId,
            jobPostingId: posting.id,
            channelType: "telegram"
          }
        }
      });
      if (!alreadySent && postingMatchesSubscription(posting, preference)) {
        unsent.push(posting);
      }
    }

    if (unsent.length === 0) {
      await prisma.userCompanySubscription.update({
        where: { id: subscription.id },
        data: { lastNotifiedAt: new Date() }
      });
      continue;
    }

    const text = [
      `${subscription.company.name}: ${unsent.length} new matching role${unsent.length === 1 ? "" : "s"}`,
      "",
      ...unsent.slice(0, 10).map((posting) => `- ${posting.title}\n${posting.locationRaw ?? "Location not listed"}\n${posting.url}`)
    ].join("\n");

    const sent = await sendTelegramMessage(channel.channelIdentifier, text);

    for (const posting of unsent) {
      await prisma.notificationLog.upsert({
        where: {
          userId_jobPostingId_channelType: {
            userId: subscription.userId,
            jobPostingId: posting.id,
            channelType: "telegram"
          }
        },
        update: {
          sentAt: new Date(),
          status: sent.ok ? "sent" : "failed"
        },
        create: {
          userId: subscription.userId,
          jobPostingId: posting.id,
          channelType: "telegram",
          status: sent.ok ? "sent" : "failed"
        }
      });
    }

    await prisma.userCompanySubscription.update({
      where: { id: subscription.id },
      data: { lastNotifiedAt: new Date() }
    });

    results.push({ subscription: subscription.id, status: sent.ok ? "sent" : "failed", count: unsent.length });
  }

  return NextResponse.json({ results });
}

export async function GET(request: Request) {
  return POST(request);
}
