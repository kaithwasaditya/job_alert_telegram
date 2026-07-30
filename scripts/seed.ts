import { PrismaClient } from "@prisma/client";
import { detectCompany } from "../src/lib/ats";
import { seedCompanies } from "../src/lib/constants";

const prisma = new PrismaClient();

async function main() {
  for (const company of seedCompanies) {
    const detected = await detectCompany(company.slug);
    await prisma.company.upsert({
      where: { slug: company.slug },
      update: {
        atsType: detected.atsType,
        atsIdentifier: detected.atsIdentifier,
        tags: [...company.tags, detected.atsType === "unsupported" ? "" : "pollable"].filter(Boolean),
        isActive: detected.atsType !== "unsupported",
        lastPollStatus: "pending"
      },
      create: {
        name: company.name,
        slug: company.slug,
        atsType: detected.atsType,
        atsIdentifier: detected.atsIdentifier,
        tags: [...company.tags, detected.atsType === "unsupported" ? "" : "pollable"].filter(Boolean),
        isActive: detected.atsType !== "unsupported"
      }
    });
    console.log(`${company.name}: ${detected.atsType} (${detected.jobs.length} jobs)`);
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
