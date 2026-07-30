import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { pollCompany } from "@/lib/poller";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companies = await prisma.company.findMany({
    where: {
      isActive: true,
      atsType: { in: ["greenhouse", "lever", "workday", "custom_scraped"] }
    },
    orderBy: { lastPolledAt: "asc" },
    take: 20
  });

  const results = [];

  for (const company of companies) {
    try {
      const jobCount = await pollCompany(company);
      results.push({ company: company.slug, status: "ok", jobs: jobCount });
    } catch (error) {
      await prisma.company.update({
        where: { id: company.id },
        data: {
          lastPolledAt: new Date(),
          lastPollStatus: "error"
        }
      });
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
