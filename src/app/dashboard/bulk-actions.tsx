"use client";

import { CheckCheck, Clock, PauseCircle, RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";
import { pauseAllSubscriptions, pollNow, trackAllPollableCompanies } from "./actions";

export function BulkActions() {
  const [status, setStatus] = useState<"idle" | "tracked" | "paused">("idle");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
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
            setActionMessage(null);
            startPolling(async () => {
              try {
                const result = await pollNow();
                setActionMessage(result.message);
              } catch {
                setActionMessage("Could not run the poller right now.");
              }
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
          setActionMessage(null);
          startTracking(async () => {
            try {
              const result = await trackAllPollableCompanies();
              setActionMessage(result.message);
              if (result.ok) setStatus("tracked");
            } catch {
              setActionMessage("Could not track companies right now.");
            }
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
          setActionMessage(null);
          startPausing(async () => {
            try {
              const result = await pauseAllSubscriptions();
              setActionMessage(result.message);
              if (result.ok) setStatus("paused");
            } catch {
              setActionMessage("Could not pause subscriptions right now.");
            }
          });
        }}
      >
        {isPausing ? <Clock size={17} /> : <PauseCircle size={17} />}
        {isPausing ? "Pausing..." : status === "paused" ? "Paused all" : "Pause all"}
      </button>
      </div>
      {actionMessage ? <p className="actionNote">{actionMessage}</p> : null}
    </div>
  );
}
