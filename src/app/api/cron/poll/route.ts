import { NextResponse } from "next/server";
import type { AtsType } from "@/lib/ats";
import { pollableAtsTypes } from "@/lib/ats";
import { representativeAtsTags, representativeCompanySlugs } from "@/lib/constants";
import { isCronAuthorized } from "@/lib/cron-auth";
import { query } from "@/lib/db";
import { pollCompany } from "@/lib/poller";

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await query(
    `SELECT id, slug, ats_type AS "atsType", ats_identifier AS "atsIdentifier", name
     FROM companies
     WHERE is_active = TRUE AND ats_type::text = ANY($1::text[])
       AND (slug = ANY($2::text[]) OR tags && $3::text[])
     ORDER BY last_polled_at ASC NULLS FIRST
     LIMIT 20`,
    [pollableAtsTypes, representativeCompanySlugs, representativeAtsTags]
  );
  const companies = res.rows as Array<{ id: string; slug: string; atsType: AtsType; atsIdentifier: string; name: string }>;

  const results = [];

  for (const company of companies) {
    try {
      const jobCount = await pollCompany(company);
      results.push({ company: company.slug, status: "ok", jobs: jobCount });
    } catch (error) {
      await query(
        `UPDATE companies SET last_polled_at = NOW(), last_poll_status = 'error' WHERE id = $1`,
        [company.id]
      );
      results.push({
        company: company.slug,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  return NextResponse.json({ results });
}

export async function GET(request: Request) {
  return POST(request);
}
