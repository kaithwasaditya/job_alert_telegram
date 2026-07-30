"use client";

import type { AlertFrequency, ExperienceLevel } from "@prisma/client";
import { Clock, Save } from "lucide-react";
import { useState, useTransition } from "react";
import {
  alertFrequencies,
  experienceLevels,
  locationOptions,
  softwareKeywordPresets
} from "@/lib/constants";
import { updateAlertPreferences } from "./actions";

type Props = {
  preference: {
    locationFilter: string;
    keywordFilter: string[];
    experienceLevel: ExperienceLevel;
    alertFrequency: AlertFrequency;
  };
};

export function AlertPreferencesForm({ preference }: Props) {
  const [locationFilter, setLocationFilter] = useState(preference.locationFilter);
  const [keywords, setKeywords] = useState(preference.keywordFilter);
  const [customKeywords, setCustomKeywords] = useState("");
  const [experienceLevel, setExperienceLevel] = useState(preference.experienceLevel);
  const [alertFrequency, setAlertFrequency] = useState(preference.alertFrequency);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function toggleKeyword(keyword: string) {
    setKeywords((current) =>
      current.includes(keyword)
        ? current.filter((item) => item !== keyword)
        : [...current, keyword]
    );
  }

  return (
    <section className="panel">
      <h2>Alert filters</h2>
      <div className="controlGrid controlGridFour">
        <div className="field">
          <label htmlFor="global-location">Location</label>
          <select
            id="global-location"
            value={locationFilter}
            onChange={(event) => setLocationFilter(event.target.value)}
          >
            {locationOptions.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="global-experience">Experience</label>
          <select
            id="global-experience"
            value={experienceLevel}
            onChange={(event) => setExperienceLevel(event.target.value as ExperienceLevel)}
          >
            {experienceLevels.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="global-frequency">Frequency</label>
          <select
            id="global-frequency"
            value={alertFrequency}
            onChange={(event) => setAlertFrequency(event.target.value as AlertFrequency)}
          >
            {alertFrequencies.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="custom-keywords">More keywords</label>
          <input
            id="custom-keywords"
            value={customKeywords}
            onChange={(event) => setCustomKeywords(event.target.value)}
            placeholder="React, Node, Security"
          />
        </div>
      </div>

      <div className="keywordGrid" aria-label="Software role keywords">
        {softwareKeywordPresets.map((keyword) => (
          <button
            className={keywords.includes(keyword) ? "chip chipActive" : "chip"}
            key={keyword}
            type="button"
            onClick={() => toggleKeyword(keyword)}
          >
            {keyword}
          </button>
        ))}
      </div>

      <div className="dashboardActions" style={{ marginTop: 14 }}>
        <button
          className="button buttonPrimary"
          type="button"
          disabled={isPending}
          onClick={() => {
            setSaved(false);
            startTransition(async () => {
              await updateAlertPreferences({
                locationFilter,
                keywordFilter: keywords,
                customKeywords,
                experienceLevel,
                alertFrequency
              });
              setCustomKeywords("");
              setSaved(true);
            });
          }}
        >
          {isPending ? <Clock size={17} /> : <Save size={17} />}
          {isPending ? "Saving" : saved ? "Saved" : "Save filters"}
        </button>
      </div>
    </section>
  );
}
