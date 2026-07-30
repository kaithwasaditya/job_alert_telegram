"use client";

import type { AtsType } from "@prisma/client";
import { Plus } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { companyTagOptions } from "@/lib/constants";
import { trackCompaniesByName } from "./actions";
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
  const [companyNames, setCompanyNames] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredCompanies = useMemo(() => {
    if (activeTag === "all") return companies;
    return companies.filter((company) => company.tags.includes(activeTag));
  }, [activeTag, companies]);

  return (
    <section className="companyList" aria-label="Companies">
      <div className="panel quickTrackPanel">
        <div>
          <h2>Track by name</h2>
          <p className="muted">Comma-separate companies, like CRED, PhonePe, Adobe.</p>
        </div>
        <div className="quickTrackForm">
          <input
            value={companyNames}
            onChange={(event) => setCompanyNames(event.target.value)}
            placeholder="CRED, Razorpay, Google"
          />
          <button
            className="button buttonPrimary"
            disabled={isPending}
            type="button"
            onClick={() => {
              setMessage(null);
              startTransition(async () => {
                const result = await trackCompaniesByName(companyNames);
                setMessage(result.message);
                if (result.ok) setCompanyNames("");
              });
            }}
          >
            <Plus size={17} />
            {isPending ? "Adding..." : "Add"}
          </button>
        </div>
        {message ? <p className="actionNote">{message}</p> : null}
      </div>

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

      {filteredCompanies.length === 0 ? (
        <div className="empty">No companies in this category yet.</div>
      ) : (
        <div className="companyTabletGrid">
          {filteredCompanies.map((company) => (
            <CompanySubscriptionCard
              key={company.id}
              company={company}
              subscription={company.subscriptions[0] ?? null}
            />
          ))}
        </div>
      )}
    </section>
  );
}
