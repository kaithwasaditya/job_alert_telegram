"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { detectCompany } from "@/lib/ats";
import { requireSyncedUser } from "@/lib/clerk-user";
import { softwareKeywordPresets } from "@/lib/constants";
import { postingMatchesSubscription } from "@/lib/matching";
import { prisma } from "@/lib/prisma";
import { findTelegramStartForUser, sendTelegramMessage } from "@/lib/telegram";
import { slugify } from "@/lib/text";

const subscriptionSchema = z.object({
  companyId: z.string(),
  isEnabled: z.boolean()
});

export async function upsertSubscription(input: z.infer<typeof subscriptionSchema>) {
  const user = await requireSyncedUser();
  const data = subscriptionSchema.parse(input);

  await prisma.userCompanySubscription.upsert({
    where: {
      userId_companyId: {
        userId: user.id,
        companyId: data.companyId
      }
    },
    update: {
      isEnabled: data.isEnabled
    },
    create: {
      userId: user.id,
      companyId: data.companyId,
      isEnabled: data.isEnabled
    }
  });

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

  await prisma.userAlertPreference.upsert({
    where: { userId: user.id },
    update: {
      locationFilter: data.locationFilter,
      keywordFilter,
      experienceLevel: data.experienceLevel,
      alertFrequency: data.alertFrequency
    },
    create: {
      userId: user.id,
      locationFilter: data.locationFilter,
      keywordFilter,
      experienceLevel: data.experienceLevel,
      alertFrequency: data.alertFrequency
    }
  });

  await prisma.userCompanySubscription.updateMany({
    where: { userId: user.id },
    data: { alertFrequency: data.alertFrequency }
  });

  revalidatePath("/dashboard");
}

export async function pauseAllSubscriptions() {
  const user = await requireSyncedUser();
  await prisma.userCompanySubscription.updateMany({
    where: { userId: user.id },
    data: { isEnabled: false }
  });
  revalidatePath("/dashboard");
}

export async function trackAllPollableCompanies() {
  const user = await requireSyncedUser();
  const companies = await prisma.company.findMany({
    where: {
      isActive: true,
      atsType: { in: ["greenhouse", "lever", "workday", "custom_scraped"] }
    },
    select: { id: true }
  });

  await Promise.all(
    companies.map((company) =>
      prisma.userCompanySubscription.upsert({
        where: {
          userId_companyId: {
            userId: user.id,
            companyId: company.id
          }
        },
        update: { isEnabled: true },
        create: {
          userId: user.id,
          companyId: company.id,
          isEnabled: true
        }
      })
    )
  );

  revalidatePath("/dashboard");
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

  await prisma.notificationChannel.upsert({
    where: {
      userId_channelType: {
        userId: user.id,
        channelType: "telegram"
      }
    },
    update: {
      channelIdentifier: result.chatId,
      isVerified: true
    },
    create: {
      userId: user.id,
      channelType: "telegram",
      channelIdentifier: result.chatId,
      isVerified: true
    }
  });

  await sendTelegramMessage(result.chatId, "Alert Bot is connected. You will receive matching job alerts here.");

  revalidatePath("/dashboard");
  return { ok: true, message: "Telegram connected." };
}

export async function sendManualAlertsNow() {
  const user = await requireSyncedUser();
  const channel = await prisma.notificationChannel.findUnique({
    where: {
      userId_channelType: {
        userId: user.id,
        channelType: "telegram"
      }
    }
  });

  if (!channel?.isVerified) {
    return { ok: false, message: "Connect Telegram before sending alerts." };
  }

  const preference =
    (await prisma.userAlertPreference.findUnique({ where: { userId: user.id } })) ??
    (await prisma.userAlertPreference.create({
      data: {
        userId: user.id,
        locationFilter: "Any",
        keywordFilter: [...softwareKeywordPresets],
        experienceLevel: "any",
        alertFrequency: "every_6h"
      }
    }));

  const subscriptions = await prisma.userCompanySubscription.findMany({
    where: { userId: user.id, isEnabled: true },
    include: {
      company: {
        include: {
          postings: {
            where: { isActive: true },
            orderBy: { firstSeenAt: "desc" },
            take: 15
          }
        }
      }
    }
  });

  const postingIds = subscriptions.flatMap((subscription) =>
    subscription.company.postings.map((posting) => posting.id)
  );
  const sentLogs =
    postingIds.length > 0
      ? await prisma.notificationLog.findMany({
          where: {
            userId: user.id,
            channelType: "telegram",
            jobPostingId: { in: postingIds }
          },
          select: { jobPostingId: true }
        })
      : [];
  const sentPostingIds = new Set(sentLogs.map((log) => log.jobPostingId));
  const matchingByCompany = [];
  let total = 0;

  for (const subscription of subscriptions) {
    const unsent = [];
    for (const posting of subscription.company.postings) {
      if (!sentPostingIds.has(posting.id) && postingMatchesSubscription(posting, preference)) {
        unsent.push(posting);
      }

      if (unsent.length >= 5) break;
    }

    if (unsent.length > 0) {
      matchingByCompany.push({ subscription, postings: unsent });
      total += unsent.length;
    }

    if (total >= 40) break;
  }

  if (total === 0) {
    return { ok: true, message: "No new unsent matches for your current filters." };
  }

  const text = matchingByCompany
    .flatMap(({ subscription, postings }) => [
      `${subscription.company.name}: ${postings.length} matching role${postings.length === 1 ? "" : "s"}`,
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
      await prisma.notificationLog.upsert({
        where: {
          userId_jobPostingId_channelType: {
            userId: user.id,
            jobPostingId: posting.id,
            channelType: "telegram"
          }
        },
        update: {
          sentAt: new Date(),
          status: sent.ok ? "sent" : "failed"
        },
        create: {
          userId: user.id,
          jobPostingId: posting.id,
          channelType: "telegram",
          status: sent.ok ? "sent" : "failed"
        }
      });
    }
  }

  await prisma.userCompanySubscription.updateMany({
    where: { userId: user.id, isEnabled: true },
    data: { lastNotifiedAt: new Date() }
  });

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

  const company = await prisma.company.upsert({
    where: { slug },
    update: {
      atsType: detection.atsType,
      atsIdentifier: detection.atsIdentifier,
      isActive: true,
      lastPollStatus: "pending"
    },
    create: {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      slug,
      atsType: detection.atsType,
      atsIdentifier: detection.atsIdentifier,
      isActive: true
    }
  });

  await prisma.userCompanySubscription.upsert({
    where: {
      userId_companyId: {
        userId: user.id,
        companyId: company.id
      }
    },
    update: { isEnabled: true },
    create: {
      userId: user.id,
      companyId: company.id,
      isEnabled: true
    }
  });

  revalidatePath("/dashboard");
  return { ok: true, message: `${detection.message} Added ${company.name}.` };
}
