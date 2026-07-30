"use client";

import type { AtsType } from "@prisma/client";
import { CheckCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { companyTagOptions } from "@/lib/constants";
import { trackAllPollableCompanies } from "./actions";
import { CompanySubscriptionCard } from "./company-subscription-card";

type Company = {
  id: string;
  name: string;
  atsType: AtsType;
  tags: string[];
  isActive: boolean;
  lastPollStatus: string;
  _count: { postings: number };
  subscriptions: { isEnabled: boolean }[];
};

type Props = {
  companies: Company[];
};

export function CompanyDirectory({ companies }: Props) {
  const [activeTag, setActiveTag] = useState("all");

  const filteredCompanies = useMemo(() => {
    if (activeTag === "all") return companies;
    return companies.filter((company) => company.tags.includes(activeTag));
  }, [activeTag, companies]);

  return (
    <section className="companyList" aria-label="Companies">
      <div className="directoryToolbar">
        <div className="tagBar">
          {companyTagOptions.map((tag) => (
            <button
              className={activeTag === tag.value ? "chip chipActive" : "chip"}
              key={tag.value}
              type="button"
              onClick={() => setActiveTag(tag.value)}
            >
              {tag.label}
            </button>
          ))}
        </div>
        <form action={trackAllPollableCompanies}>
          <button className="button buttonPrimary" type="submit">
            <CheckCheck size={17} />
            Track all
          </button>
        </form>
      </div>

      {filteredCompanies.length === 0 ? (
        <div className="empty">No companies in this category yet.</div>
      ) : (
        filteredCompanies.map((company) => (
          <CompanySubscriptionCard
            key={company.id}
            company={company}
            subscription={company.subscriptions[0] ?? null}
          />
        ))
      )}
    </section>
  );
}
