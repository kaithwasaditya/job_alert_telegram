import { detectCompany } from "../src/lib/ats";
import { seedCompanies } from "../src/lib/constants";

async function main() {
  const results = [];
  for (const company of seedCompanies) {
    const detected = await detectCompany(company.slug);
    results.push({
      company: company.name,
      slug: company.slug,
      tags: company.tags.join(","),
      atsType: detected.atsType,
      atsIdentifier: detected.atsIdentifier,
      jobs: detected.jobs.length,
      message: detected.message
    });
  }
  console.table(results);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
