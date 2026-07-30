import type { Company } from "@prisma/client";
import { fetchJobsByCompany } from "@/lib/ats";
import { prisma } from "@/lib/prisma";

export async function pollCompany(company: Pick<Company, "id" | "slug" | "atsType" | "atsIdentifier">) {
  const jobs = await fetchJobsByCompany(company.atsType, company.atsIdentifier);
  const now = new Date();
  const seenIds = jobs.map((job) => job.externalId);

  if (jobs.length > 0) {
    await prisma.jobPosting.createMany({
      data: jobs.map((job) => ({
        companyId: company.id,
        externalId: job.externalId,
        title: job.title,
        locationRaw: job.locationRaw,
        locationCountry: job.locationCountry,
        department: job.department,
        experienceLevel: job.experienceLevel,
        url: job.url,
        firstSeenAt: now,
        lastSeenAt: now,
        isActive: true
      })),
      skipDuplicates: true
    });

    const existing = await prisma.jobPosting.findMany({
      where: {
        companyId: company.id,
        externalId: { in: seenIds }
      },
      select: { id: true, externalId: true }
    });

    const existingIds = new Set(existing.map((posting) => posting.externalId));
    const changedJobs = jobs.filter((job) => existingIds.has(job.externalId));

    for (let index = 0; index < changedJobs.length; index += 50) {
      const chunk = changedJobs.slice(index, index + 50);
      await prisma.$transaction(
        chunk.map((job) =>
          prisma.jobPosting.update({
            where: {
              companyId_externalId: {
                companyId: company.id,
                externalId: job.externalId
              }
            },
            data: {
              title: job.title,
              locationRaw: job.locationRaw,
              locationCountry: job.locationCountry,
              department: job.department,
              experienceLevel: job.experienceLevel,
              url: job.url,
              lastSeenAt: now,
              isActive: true
            }
          })
        )
      );
    }
  }

  await prisma.jobPosting.updateMany({
    where: {
      companyId: company.id,
      externalId: { notIn: seenIds }
    },
    data: { isActive: false }
  });

  await prisma.company.update({
    where: { id: company.id },
    data: {
      lastPolledAt: now,
      lastPollStatus: jobs.length === 0 ? "error" : "ok"
    }
  });

  return jobs.length;
}
