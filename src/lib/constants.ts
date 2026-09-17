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
  "Backend Engineer",
  "Frontend Engineer",
  "Full Stack Engineer",
  "Platform Engineer",
  "Infrastructure Engineer",
  "New Grad",
  "Intern"
] as const;

export const companyTagOptions = [
  { value: "all", label: "All" },
  { value: "greenhouse", label: "Greenhouse" },
  { value: "lever", label: "Lever" },
  { value: "ashby", label: "Ashby" },
  { value: "workday", label: "Workday" }
] as const;

export const representativeAtsTags = ["greenhouse", "lever", "ashby", "workday"] as const;

export const seedCompanies = [
  {
    name: "Airbnb",
    slug: "airbnb",
    tags: ["greenhouse"],
    source: { atsType: "greenhouse", atsIdentifier: "airbnb" }
  },
  {
    name: "Spotify",
    slug: "spotify",
    tags: ["lever"],
    source: { atsType: "lever", atsIdentifier: "spotify" }
  },
  {
    name: "Linear",
    slug: "linear",
    tags: ["ashby"],
    source: { atsType: "ashby", atsIdentifier: "linear" }
  },
  {
    name: "Salesforce",
    slug: "salesforce",
    tags: ["workday"],
    source: {
      atsType: "workday",
      atsIdentifier: "https://salesforce.wd12.myworkdayjobs.com/en-US/External_Career_Site"
    }
  }
] as const;

export const representativeCompanySlugs = seedCompanies.map((company) => company.slug);
