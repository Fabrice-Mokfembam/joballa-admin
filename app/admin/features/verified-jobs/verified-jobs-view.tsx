"use client";

import { VerifiedJobsPanel } from "./verified-jobs-panel";

export function VerifiedJobsView() {
  return (
    <div>
      <p className="mb-6 max-w-3xl text-sm leading-6 text-[var(--joballa-muted)]">
        Jobs that are live or closed on the marketplace. Open a job to unpublish or reject live listings.
      </p>
      <VerifiedJobsPanel />
    </div>
  );
}
