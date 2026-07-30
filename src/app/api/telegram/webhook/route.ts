import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: { id?: number | string };
  };
};

export async function POST(request: Request) {
  const update = (await request.json()) as TelegramUpdate;
  const text = update.message?.text ?? "";
  const chatId = update.message?.chat?.id;

  if (!chatId || !text.startsWith("/start")) {
    return NextResponse.json({ ok: true });
  }

  const userId = text.split(" ")[1]?.trim();
  if (!userId) {
    return NextResponse.json({ ok: true, message: "Missing user token" });
  }

  await prisma.notificationChannel.upsert({
    where: {
      userId_channelType: {
        userId,
        channelType: "telegram"
      }
    },
    update: {
      channelIdentifier: String(chatId),
      isVerified: true
    },
    create: {
      userId,
      channelType: "telegram",
      channelIdentifier: String(chatId),
      isVerified: true
    }
  });

  return NextResponse.json({ ok: true });
}
