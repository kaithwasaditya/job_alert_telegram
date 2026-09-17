import { detectCompany } from "../src/lib/ats";
import { seedCompanies } from "../src/lib/constants";
import { pool, query } from "../src/lib/db";

async function main() {
  for (const company of seedCompanies) {
    const detected = await detectCompany(company.slug);
    const tags = [...company.tags, detected.atsType === "unsupported" ? "" : "pollable"].filter(Boolean);
    const isActive = detected.atsType !== "unsupported";

    await query(
      `INSERT INTO companies (name, slug, ats_type, ats_identifier, tags, is_active, last_poll_status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       ON CONFLICT (slug) DO UPDATE SET
         ats_type = EXCLUDED.ats_type,
         ats_identifier = EXCLUDED.ats_identifier,
         tags = EXCLUDED.tags,
         is_active = EXCLUDED.is_active,
         last_poll_status = 'pending'`,
      [company.name, company.slug, detected.atsType, detected.atsIdentifier, tags, isActive]
    );

    console.log(`${company.name}: ${detected.atsType} (${detected.jobs.length} jobs)`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
