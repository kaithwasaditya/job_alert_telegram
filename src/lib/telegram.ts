export function telegramDeepLink(userId: string) {
  const bot = process.env.TELEGRAM_BOT_USERNAME;
  if (!bot) return null;
  return `https://t.me/${bot}?start=${encodeURIComponent(userId)}`;
}

export function telegramStartCommand(userId: string) {
  return `/start ${userId}`;
}

type TelegramUpdate = {
  update_id: number;
  message?: {
    text?: string;
    chat?: { id?: number | string };
  };
};

export async function findTelegramStartForUser(userId: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { ok: false as const, error: "TELEGRAM_BOT_TOKEN is not configured" };
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, {
    next: { revalidate: 0 }
  });

  if (!res.ok) {
    return { ok: false as const, error: await res.text() };
  }

  const data = (await res.json()) as { ok: boolean; result?: TelegramUpdate[] };
  const updates = data.result ?? [];
  const matchingUpdate = [...updates]
    .reverse()
    .find((update) => update.message?.text?.trim() === telegramStartCommand(userId));

  const chatId = matchingUpdate?.message?.chat?.id;
  if (!chatId) {
    return { ok: false as const, error: "No matching /start message found yet" };
  }

  return { ok: true as const, chatId: String(chatId) };
}

export async function sendTelegramMessage(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN is not configured" };
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true
    })
  });

  if (!res.ok) {
    return { ok: false, error: await res.text() };
  }

  return { ok: true };
}
