"use client";

import type { AtsType } from "@prisma/client";
import { Check, Clock, Pause } from "lucide-react";
import { useState, useTransition } from "react";
import { upsertSubscription } from "./actions";

type Props = {
  company: {
    id: string;
    name: string;
    atsType: AtsType;
    isActive: boolean;
    lastPollStatus: string;
    _count: { postings: number };
  };
  subscription: {
    isEnabled: boolean;
  } | null;
};

export function CompanySubscriptionCard({ company, subscription }: Props) {
  const [enabled, setEnabled] = useState(subscription?.isEnabled ?? false);
  const [isPending, startTransition] = useTransition();

  const canPoll =
    company.atsType === "greenhouse" ||
    company.atsType === "lever" ||
    company.atsType === "workday" ||
    company.atsType === "custom_scraped";

  return (
    <article className="companyCard">
      <div className="companyTop">
        <div>
          <h3 className="companyTitle">
            {company.name}
            <span className={canPoll ? "badge badgeGreen" : "badge badgeAmber"}>{company.atsType}</span>
            {!company.isActive ? <span className="badge">paused</span> : null}
          </h3>
          <p className="muted">
            {company._count.postings} stored postings · poll status {company.lastPollStatus}
          </p>
        </div>
        <button
          className={enabled ? "button buttonDanger" : "button buttonPrimary"}
          type="button"
          disabled={isPending}
          onClick={() => {
            const nextEnabled = !enabled;
            setEnabled(nextEnabled);
            startTransition(async () => {
              await upsertSubscription({
                companyId: company.id,
                isEnabled: nextEnabled
              });
            });
          }}
        >
          {isPending ? <Clock size={17} /> : enabled ? <Pause size={17} /> : <Check size={17} />}
          {isPending ? "Saving" : enabled ? "Pause" : "Track"}
        </button>
      </div>
    </article>
  );
}
