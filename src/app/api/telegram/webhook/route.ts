import { NextResponse } from "next/server";
import { query } from "@/lib/db";

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

  await query(
    `INSERT INTO notification_channels (user_id, channel_type, channel_identifier, is_verified)
     VALUES ($1, 'telegram', $2, TRUE)
     ON CONFLICT (user_id, channel_type) DO UPDATE SET
       channel_identifier = EXCLUDED.channel_identifier,
       is_verified = TRUE`,
    [userId, String(chatId)]
  );

  return NextResponse.json({ ok: true });
}
