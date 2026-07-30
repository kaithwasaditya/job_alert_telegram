import type { JobPosting, UserAlertPreference } from "@prisma/client";

export function postingMatchesSubscription(
  posting: Pick<JobPosting, "title" | "locationRaw" | "locationCountry" | "experienceLevel">,
  preference: Pick<UserAlertPreference, "locationFilter" | "keywordFilter" | "experienceLevel">
) {
  const locationText = `${posting.locationRaw ?? ""} ${posting.locationCountry ?? ""}`.toLowerCase();
  const titleText = posting.title.toLowerCase();

  const locationOk =
    preference.locationFilter.toLowerCase() === "any" ||
    locationText.includes(preference.locationFilter.toLowerCase());

  const keywordOk =
    preference.keywordFilter.length === 0 ||
    preference.keywordFilter.some((filter) => titleText.includes(filter.toLowerCase()));

  const experienceOk =
    preference.experienceLevel === "any" ||
    posting.experienceLevel === "any" ||
    posting.experienceLevel === preference.experienceLevel;

  return locationOk && keywordOk && experienceOk;
}

export function shouldDispatchNow(frequency: string, lastNotifiedAt: Date | null) {
  if (!lastNotifiedAt) return true;

  const elapsedMs = Date.now() - lastNotifiedAt.getTime();
  if (frequency === "hourly") return elapsedMs >= 60 * 60 * 1000;
  if (frequency === "every_6h") return elapsedMs >= 6 * 60 * 60 * 1000;
  if (frequency === "daily_morning" || frequency === "daily_evening") {
    return elapsedMs >= 24 * 60 * 60 * 1000;
  }

  return false;
}
