import { randomUUID } from "node:crypto";
import type { AtsType } from "@/lib/ats";
import { fetchJobsByCompany } from "@/lib/ats";
import { query } from "@/lib/db";

export type PollerCompanyInput = {
  id: string;
  slug: string;
  atsType: AtsType;
  atsIdentifier: string;
};

export async function pollCompany(company: PollerCompanyInput) {
  const jobs = await fetchJobsByCompany(company.atsType, company.atsIdentifier);
  const now = new Date();
  const seenIds = jobs.map((job) => job.externalId);

  if (jobs.length > 0) {
    for (const job of jobs) {
      await query(
        `INSERT INTO job_postings (
          id, company_id, external_id, title, location_raw, location_country,
          department, experience_level, url, first_seen_at, last_seen_at, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10, TRUE)
        ON CONFLICT (company_id, external_id) DO UPDATE SET
          title = EXCLUDED.title,
          location_raw = EXCLUDED.location_raw,
          location_country = EXCLUDED.location_country,
          department = EXCLUDED.department,
          experience_level = EXCLUDED.experience_level,
          url = EXCLUDED.url,
          last_seen_at = EXCLUDED.last_seen_at,
          is_active = TRUE`,
        [
          randomUUID(),
          company.id,
          job.externalId,
          job.title,
          job.locationRaw,
          job.locationCountry,
          job.department,
          job.experienceLevel,
          job.url,
          now
        ]
      );
    }
  }

  if (seenIds.length > 0) {
    await query(
      `UPDATE job_postings 
       SET is_active = FALSE 
       WHERE company_id = $1 AND NOT (external_id = ANY($2::text[]))`,
      [company.id, seenIds]
    );
  } else {
    await query(
      `UPDATE job_postings 
       SET is_active = FALSE 
       WHERE company_id = $1`,
      [company.id]
    );
  }

  await query(
    `UPDATE companies 
     SET last_polled_at = $1, last_poll_status = $2 
     WHERE id = $3`,
    [now, jobs.length === 0 ? "error" : "ok", company.id]
  );

  return jobs.length;
}
