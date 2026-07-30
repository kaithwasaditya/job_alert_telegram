"use client";

import { CheckCheck, Clock, PauseCircle, RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";
import { pauseAllSubscriptions, pollNow, trackAllPollableCompanies } from "./actions";

export function BulkActions() {
  const [status, setStatus] = useState<"idle" | "tracked" | "paused">("idle");
  const [pollMessage, setPollMessage] = useState<string | null>(null);
  const [isTracking, startTracking] = useTransition();
  const [isPausing, startPausing] = useTransition();
  const [isPolling, startPolling] = useTransition();

  return (
    <div className="bulkActionWrap">
      <div className="dashboardActions">
        <button
          className="button"
          disabled={isTracking || isPausing || isPolling}
          type="button"
          onClick={() => {
            setPollMessage(null);
            startPolling(async () => {
              const result = await pollNow();
              setPollMessage(result.message);
            });
          }}
        >
          {isPolling ? <Clock size={17} /> : <RefreshCw size={17} />}
          {isPolling ? "Polling..." : "Poll now"}
        </button>
      <button
        className="button buttonPrimary"
        disabled={isTracking || isPausing || isPolling}
        type="button"
        onClick={() => {
          startTracking(async () => {
            await trackAllPollableCompanies();
            setStatus("tracked");
          });
        }}
      >
        {isTracking ? <Clock size={17} /> : <CheckCheck size={17} />}
        {isTracking ? "Tracking..." : status === "tracked" ? "Tracking all" : "Track all"}
      </button>
      <button
        className="button"
        disabled={isTracking || isPausing || isPolling}
        type="button"
        onClick={() => {
          startPausing(async () => {
            await pauseAllSubscriptions();
            setStatus("paused");
          });
        }}
      >
        {isPausing ? <Clock size={17} /> : <PauseCircle size={17} />}
        {isPausing ? "Pausing..." : status === "paused" ? "Paused all" : "Pause all"}
      </button>
      </div>
      {pollMessage ? <p className="actionNote">{pollMessage}</p> : null}
    </div>
  );
}
