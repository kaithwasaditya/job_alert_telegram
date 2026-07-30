"use client";

import { CheckCircle2, Copy, ExternalLink, Send } from "lucide-react";
import { useState, useTransition } from "react";
import { checkTelegramConnection, sendManualAlertsNow } from "./actions";

type Props = {
  deepLink: string | null;
  startCommand: string;
  isConnected: boolean;
};

export function TelegramConnectPanel({ deepLink, startCommand, isConnected }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <section className="panel">
      <h2>Telegram</h2>
      <div className="compactStack">
        <div className="panelHeaderInline">
          <span className={isConnected ? "badge badgeGreen" : "badge badgeAmber"}>
            {isConnected ? "Connected" : "Not connected"}
          </span>
        </div>
        <details className="detailsBox">
          <summary>Setup command</summary>
          <div className="commandBox">{startCommand}</div>
        </details>
        <div className="buttonGrid">
          <button
            className="button"
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(startCommand);
              setCopied(true);
            }}
          >
            <Copy size={17} />
            {copied ? "Copied" : "Copy"}
          </button>
          {deepLink ? (
            <a className="button" href={deepLink} target="_blank" rel="noreferrer">
              <ExternalLink size={17} />
              Bot
            </a>
          ) : null}
          <button
            className="button buttonPrimary"
            disabled={isPending}
            type="button"
            onClick={() => {
              setMessage(null);
              startTransition(async () => {
                const result = await checkTelegramConnection();
                setMessage(result.message);
              });
            }}
          >
            {isConnected ? <CheckCircle2 size={17} /> : <Send size={17} />}
            {isPending ? "Checking" : "Check"}
          </button>
          <button
            className="button buttonPrimary"
            disabled={isPending || !isConnected}
            type="button"
            onClick={() => {
              setMessage(null);
              startTransition(async () => {
                const result = await sendManualAlertsNow();
                setMessage(result.message);
              });
            }}
          >
            <Send size={17} />
            Send
          </button>
        </div>
        {message ? <p className="muted">{message}</p> : null}
      </div>
    </section>
  );
}
