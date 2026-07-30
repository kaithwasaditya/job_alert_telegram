"use client";

import type { AtsType } from "@prisma/client";

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
  const canPoll =
    company.atsType === "greenhouse" ||
    company.atsType === "lever" ||
    company.atsType === "workday" ||
    company.atsType === "custom_scraped";
  const isTracked = subscription?.isEnabled ?? false;

  return (
    <article className="companyCard">
      <h3 className="companyTitle">{company.name}</h3>
      <div className="tabletMeta">
        <span className={isTracked ? "badge badgeGreen" : "badge"}>{isTracked ? "tracked" : "untracked"}</span>
        <span className={canPoll ? "badge badgeBlue" : "badge badgeAmber"}>{company.atsType}</span>
      </div>
      <p className="muted tabletCount">{company._count.postings} jobs</p>
    </article>
  );
}
