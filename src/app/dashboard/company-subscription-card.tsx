"use client";

import type { AtsType } from "@prisma/client";
import { pollableAtsTypes } from "@/lib/ats";

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
  const canPoll = (pollableAtsTypes as readonly string[]).includes(company.atsType);
  const isTracked = subscription?.isEnabled ?? false;

  return (
    <article className="companyCard companyCardInline">
      <h3 className="companyName">{company.name}</h3>
      <span className={isTracked ? "companyTrackIcon tracked" : "companyTrackIcon"}>
        {isTracked ? "✓" : "✗"}
      </span>
      <span className="companyJobCount">{company._count.postings} jobs</span>
      <span className={canPoll ? "companyAts companyAtsPollable" : "companyAts"}>
        {company.atsType.replace(/_/g, " ")}
      </span>
    </article>
  );
}
