import { pollableAtsTypes } from "../src/lib/ats";
import { pollCompany } from "../src/lib/poller";
import { prisma } from "../src/lib/prisma";

async function main() {
  const requestedSlugs = process.argv.slice(2);
  const companies = await prisma.company.findMany({
    where: {
      isActive: true,
      atsType: { in: pollableAtsTypes },
      ...(requestedSlugs.length > 0 ? { slug: { in: requestedSlugs } } : {})
    },
    orderBy: [{ lastPolledAt: "asc" }, { name: "asc" }]
  });

  for (const company of companies) {
    try {
      const jobCount = await pollCompany(company);
      console.log(`${company.name}: ${jobCount}`);
    } catch (error) {
      await prisma.company.update({
        where: { id: company.id },
        data: {
          lastPolledAt: new Date(),
          lastPollStatus: "error"
        }
      });
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
    await prisma.$disconnect();
  });
