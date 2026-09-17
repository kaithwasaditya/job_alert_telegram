export const alertFrequencies = [
  { value: "hourly", label: "Hourly" },
  { value: "every_6h", label: "Every 6 hours" },
  { value: "daily_morning", label: "Daily morning" },
  { value: "daily_evening", label: "Daily evening" }
] as const;

export const locationOptions = [
  "Any",
  "India",
  "Remote",
  "United States",
  "Canada",
  "Singapore",
  "United Kingdom"
] as const;

export const experienceLevels = [
  { value: "any", label: "Any level" },
  { value: "internship", label: "Internship" },
  { value: "entry", label: "Entry level" },
  { value: "mid", label: "Mid level" },
  { value: "senior", label: "Senior" },
  { value: "staff", label: "Staff / Principal" },
  { value: "manager", label: "Manager" }
] as const;

export const softwareKeywordPresets = [
  "Software Engineer",
  "Software Developer",
  "Software Development Engineer",
  "SWE",
  "SDE",
  "Backend",
  "Frontend",
  "Full Stack",
  "Platform",
  "Infrastructure",
  "DevOps",
  "SRE",
  "Site Reliability",
  "Cloud",
  "Distributed Systems",
  "Android",
  "iOS",
  "Mobile",
  "Data Engineer",
  "Data Scientist",
  "Analytics Engineer",
  "Machine Learning",
  "ML Engineer",
  "Applied Scientist",
  "AI",
  "Security Engineer",
  "QA",
  "Automation",
  "Product Engineer",
  "Product Manager",
  "New Grad",
  "Intern"
] as const;

export const companyTagOptions = [
  { value: "all", label: "All" },
  { value: "pollable", label: "Pollable" },
  { value: "big-tech", label: "Big Tech" },
  { value: "product", label: "Product" },
  { value: "data", label: "Data / Security" }
] as const;

export const seedCompanies = [
  { name: "Google", slug: "google", tags: ["big-tech", "product"] },
  { name: "Microsoft", slug: "microsoft", tags: ["big-tech", "product"] },
  { name: "Atlassian", slug: "atlassian", tags: ["product"] },
  { name: "Snowflake", slug: "snowflake", tags: ["product", "data"] },
  { name: "Rubrik", slug: "rubrik", tags: ["product", "data"] }
] as const;
