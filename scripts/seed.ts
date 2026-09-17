import { randomUUID } from "node:crypto";
import { seedCompanies } from "../src/lib/constants";
import { pool, query } from "../src/lib/db";

async function main() {
  const allowedSlugs = seedCompanies.map((c) => c.slug);
  await query(`DELETE FROM companies WHERE NOT (slug = ANY($1::text[]))`, [allowedSlugs]);

  for (const company of seedCompanies) {
    const tags = [...company.tags, "pollable"];

    await query(
      `INSERT INTO companies (id, name, slug, ats_type, ats_identifier, tags, is_active, last_poll_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       ON CONFLICT (slug) DO UPDATE SET
         ats_type = EXCLUDED.ats_type,
         ats_identifier = EXCLUDED.ats_identifier,
         tags = EXCLUDED.tags,
         is_active = EXCLUDED.is_active,
         last_poll_status = 'pending'`,
      [randomUUID(), company.name, company.slug, company.source.atsType, company.source.atsIdentifier, tags, true]
    );

    console.log(`${company.name}: ${company.source.atsType}`);
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
