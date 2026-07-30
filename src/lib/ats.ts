import type { AtsType } from "@prisma/client";
import type { ExperienceLevel } from "@prisma/client";

export type NormalizedJob = {
  externalId: string;
  title: string;
  locationRaw: string | null;
  locationCountry: string | null;
  department: string | null;
  experienceLevel: ExperienceLevel;
  url: string;
};

export type DetectionResult = {
  atsType: AtsType;
  atsIdentifier: string;
  jobs: NormalizedJob[];
  message: string;
};

type GreenhouseJob = {
  id: number | string;
  title: string;
  absolute_url: string;
  location?: { name?: string };
  departments?: { name?: string }[];
};

type LeverJob = {
  id: string;
  text: string;
  hostedUrl: string;
  categories?: {
    location?: string;
    team?: string;
    department?: string;
  };
};

type WorkdayJob = {
  title?: string;
  externalPath?: string;
  locationsText?: string;
  bulletFields?: string[];
  postedOn?: string;
};

const knownCompanySources: Record<string, { atsType: AtsType; atsIdentifier: string }> = {
  adobe: {
    atsType: "workday",
    atsIdentifier: "https://adobe.wd5.myworkdayjobs.com/en-US/external_experienced"
  },
  paypal: {
    atsType: "workday",
    atsIdentifier: "https://paypal.wd1.myworkdayjobs.com/en-US/jobs"
  }
};

export async function fetchGreenhouseJobs(token: string): Promise<NormalizedJob[]> {
  const res = await fetch(
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`,
    { next: { revalidate: 0 } }
  );

  if (!res.ok) {
    throw new Error(`Greenhouse returned ${res.status}`);
  }

  const data = (await res.json()) as { jobs?: GreenhouseJob[] };
  if (!Array.isArray(data.jobs)) {
    throw new Error("Greenhouse response did not include jobs");
  }

  return data.jobs.map((job) => ({
    externalId: String(job.id),
    title: job.title,
    locationRaw: job.location?.name ?? null,
    locationCountry: normalizeCountry(job.location?.name),
    department: job.departments?.[0]?.name ?? null,
    experienceLevel: inferExperienceLevel(job.title),
    url: job.absolute_url
  }));
}

export async function fetchLeverJobs(slug: string): Promise<NormalizedJob[]> {
  const res = await fetch(
    `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`,
    { next: { revalidate: 0 } }
  );

  if (!res.ok) {
    throw new Error(`Lever returned ${res.status}`);
  }

  const data = (await res.json()) as LeverJob[];
  if (!Array.isArray(data)) {
    throw new Error("Lever response was not a list");
  }

  return data.map((job) => ({
    externalId: job.id,
    title: job.text,
    locationRaw: job.categories?.location ?? null,
    locationCountry: normalizeCountry(job.categories?.location),
    department: job.categories?.team ?? job.categories?.department ?? null,
    experienceLevel: inferExperienceLevel(job.text),
    url: job.hostedUrl
  }));
}

export async function fetchJobsByCompany(atsType: AtsType, atsIdentifier: string) {
  if (atsType === "greenhouse") return fetchGreenhouseJobs(atsIdentifier);
  if (atsType === "lever") return fetchLeverJobs(atsIdentifier);
  if (atsType === "workday") return fetchWorkdayJobs(atsIdentifier);
  if (atsType === "custom_scraped") return scrapeStructuredJobs(atsIdentifier);
  throw new Error(`${atsType} polling is not implemented yet`);
}

export async function detectCompany(input: string): Promise<DetectionResult> {
  const raw = input.trim();
  const url = safeUrl(raw);
  const known = knownCompanySources[raw.toLowerCase()];

  if (known) {
    try {
      const jobs = await fetchJobsByCompany(known.atsType, known.atsIdentifier);
      return {
        atsType: known.atsType,
        atsIdentifier: known.atsIdentifier,
        jobs,
        message: `Found ${jobs.length} Workday roles.`
      };
    } catch {
      return {
        atsType: known.atsType,
        atsIdentifier: known.atsIdentifier,
        jobs: [],
        message: "Known Workday source found, but the first fetch failed."
      };
    }
  }

  const candidates = url ? candidatesFromUrl(url) : candidatesFromName(raw);

  for (const candidate of candidates) {
    try {
      const jobs = await fetchGreenhouseJobs(candidate);
      if (jobs.length > 0) {
        return {
          atsType: "greenhouse",
          atsIdentifier: candidate,
          jobs,
          message: `Found ${jobs.length} Greenhouse roles.`
        };
      }
    } catch {
      // Continue to the next clean first-party source.
    }
  }

  for (const candidate of candidates) {
    try {
      const jobs = await fetchLeverJobs(candidate);
      if (jobs.length > 0) {
        return {
          atsType: "lever",
          atsIdentifier: candidate,
          jobs,
          message: `Found ${jobs.length} Lever roles.`
        };
      }
    } catch {
      // Continue to generic checks.
    }
  }

  if (url && url.hostname.endsWith("myworkdayjobs.com")) {
    const jobs = await fetchWorkdayJobs(url.toString());
    return {
      atsType: "workday",
      atsIdentifier: url.toString(),
      jobs,
      message: jobs.length > 0 ? `Found ${jobs.length} Workday roles.` : "This looks like Workday, but no jobs were returned."
    };
  }

  if (url) {
    const jobs = await scrapeStructuredJobs(url.toString());
    if (jobs.length > 0) {
      return {
        atsType: "custom_scraped",
        atsIdentifier: url.toString(),
        jobs,
        message: `Found ${jobs.length} roles from structured page data.`
      };
    }
  }

  return {
    atsType: "unsupported",
    atsIdentifier: raw,
    jobs: [],
    message: "This page cannot be tracked automatically yet."
  };
}

export async function fetchWorkdayJobs(inputUrl: string): Promise<NormalizedJob[]> {
  const source = new URL(inputUrl);
  const match = source.hostname.match(/^([^.]+)\.wd\d+\.myworkdayjobs\.com$/);
  const tenant = match?.[1];
  const site = source.pathname.split("/").filter(Boolean).find((part) => part !== "en-US");

  if (!tenant || !site) {
    throw new Error("Could not identify Workday tenant and site");
  }

  const endpoint = `https://${source.hostname}/wday/cxs/${tenant}/${site}/jobs`;
  const allJobs: NormalizedJob[] = [];
  let offset = 0;
  const limit = 20;

  while (offset < 1000) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json"
      },
      body: JSON.stringify({
        appliedFacets: {},
        limit,
        offset,
        searchText: ""
      }),
      next: { revalidate: 0 }
    });

    if (!res.ok) {
      throw new Error(`Workday returned ${res.status}`);
    }

    const data = (await res.json()) as { jobPostings?: WorkdayJob[]; total?: number };
    const postings = data.jobPostings ?? [];
    if (postings.length === 0) break;

    for (const job of postings) {
      if (!job.title || !job.externalPath) continue;
      const location = job.locationsText ?? job.bulletFields?.find(Boolean) ?? null;
      allJobs.push({
        externalId: job.externalPath.split("/").pop() ?? job.externalPath,
        title: job.title,
        locationRaw: location,
        locationCountry: normalizeCountry(location),
        department: null,
        experienceLevel: inferExperienceLevel(job.title),
        url: new URL(job.externalPath, `https://${source.hostname}`).toString()
      });
    }

    offset += postings.length;
    if (data.total && offset >= data.total) break;
    if (postings.length < limit) break;
  }

  return allJobs;
}

async function scrapeStructuredJobs(url: string): Promise<NormalizedJob[]> {
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return [];

  const html = await res.text();
  const matches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const jobs: NormalizedJob[] = [];

  for (const match of matches) {
    try {
      const parsed = JSON.parse(match[1].trim()) as unknown;
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of flattenJsonLd(items)) {
        if (item["@type"] !== "JobPosting" || !item.title) continue;
        const id = String(item.identifier?.value ?? item.url ?? item.title);
        jobs.push({
          externalId: id,
          title: String(item.title),
          locationRaw: extractJobLocation(item),
          locationCountry: normalizeCountry(extractJobLocation(item)),
          department: item.employmentType ? String(item.employmentType) : null,
          experienceLevel: inferExperienceLevel(String(item.title)),
          url: String(item.url ?? url)
        });
      }
    } catch {
      continue;
    }
  }

  return jobs;
}

function flattenJsonLd(items: unknown[]): Record<string, any>[] {
  return items.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, any>;
    if (Array.isArray(record["@graph"])) return flattenJsonLd(record["@graph"]);
    return [record];
  });
}

function extractJobLocation(item: Record<string, any>) {
  const location = Array.isArray(item.jobLocation) ? item.jobLocation[0] : item.jobLocation;
  const address = location?.address;
  return (
    address?.addressLocality ??
    address?.addressRegion ??
    address?.addressCountry ??
    location?.name ??
    null
  );
}

function candidatesFromName(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/facebook/g, "meta")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
  return Array.from(new Set([normalized, normalized.replace(/inc$/, "")])).filter(Boolean);
}

function candidatesFromUrl(url: URL) {
  const hostParts = url.hostname.replace(/^www\./, "").split(".");
  const pathParts = url.pathname.split("/").filter(Boolean);
  return Array.from(new Set([...pathParts, hostParts[0]].map((part) => part.toLowerCase()))).filter(Boolean);
}

function safeUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function normalizeCountry(value?: string | null) {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower.includes("india") || lower.includes("bengaluru") || lower.includes("bangalore")) return "India";
  if (lower.includes("remote")) return "Remote";
  if (lower.includes("united states") || lower.includes("usa") || lower.includes("us")) return "United States";
  if (lower.includes("canada")) return "Canada";
  if (lower.includes("singapore")) return "Singapore";
  if (lower.includes("united kingdom") || lower.includes("london")) return "United Kingdom";
  return null;
}

function inferExperienceLevel(title: string): ExperienceLevel {
  const lower = title.toLowerCase();
  if (lower.includes("intern") || lower.includes("internship")) return "internship";
  if (lower.includes("new grad") || lower.includes("graduate") || lower.includes("entry")) return "entry";
  if (lower.includes("staff") || lower.includes("principal") || lower.includes("architect")) return "staff";
  if (lower.includes("manager") || lower.includes("head of") || lower.includes("director")) return "manager";
  if (lower.includes("senior") || lower.includes("sr.") || lower.includes("sr ")) return "senior";
  if (lower.includes("junior") || lower.includes("associate")) return "entry";
  return "any";
}
