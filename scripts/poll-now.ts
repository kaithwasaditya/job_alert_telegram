import type { AtsType } from "../src/lib/ats";
import { pollableAtsTypes } from "../src/lib/ats";
import { pool, query } from "../src/lib/db";
import { pollCompany } from "../src/lib/poller";

async function main() {
  const requestedSlugs = process.argv.slice(2);

  let res;
  if (requestedSlugs.length > 0) {
    res = await query(
      `SELECT id, slug, ats_type AS "atsType", ats_identifier AS "atsIdentifier", name
       FROM companies
       WHERE is_active = TRUE AND ats_type = ANY($1::text[]) AND slug = ANY($2::text[])
       ORDER BY last_polled_at ASC NULLS FIRST, name ASC`,
      [pollableAtsTypes, requestedSlugs]
    );
  } else {
    res = await query(
      `SELECT id, slug, ats_type AS "atsType", ats_identifier AS "atsIdentifier", name
       FROM companies
       WHERE is_active = TRUE AND ats_type = ANY($1::text[])
       ORDER BY last_polled_at ASC NULLS FIRST, name ASC`,
      [pollableAtsTypes]
    );
  }

  const companies = res.rows as Array<{ id: string; slug: string; atsType: AtsType; atsIdentifier: string; name: string }>;

  for (const company of companies) {
    try {
      const jobCount = await pollCompany(company);
      console.log(`${company.name}: ${jobCount}`);
    } catch (error) {
      await query(
        `UPDATE companies SET last_polled_at = NOW(), last_poll_status = 'error' WHERE id = $1`,
        [company.id]
      );
      console.log(`${company.name}: error - ${error instanceof Error ? error.message : "Unknown error"}`);
    }
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
