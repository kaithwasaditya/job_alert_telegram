import { fetchJobsByCompany } from "../src/lib/ats";
import { seedCompanies } from "../src/lib/constants";

async function main() {
  const results = [];
  for (const company of seedCompanies) {
    let jobs = 0;
    let message = "Configured source is reachable.";
    try {
      jobs = (await fetchJobsByCompany(company.source.atsType, company.source.atsIdentifier)).length;
    } catch (error) {
      message = error instanceof Error ? error.message : "Configured source failed.";
    }
    results.push({
      company: company.name,
      slug: company.slug,
      tags: company.tags.join(","),
      atsType: company.source.atsType,
      atsIdentifier: company.source.atsIdentifier,
      jobs,
      message
    });
  }
  console.table(results);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
