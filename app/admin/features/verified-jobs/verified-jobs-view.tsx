"use client";

import { VerifiedJobsPanel } from "./verified-jobs-panel";
import { useTranslation } from "@/lib/i18n";

export function VerifiedJobsView() {
  const { t } = useTranslation();

  return (
    <div>
      <p className="mb-6 max-w-3xl text-sm leading-6 text-[var(--joballa-muted)]">
        {t("jobs.verifiedDescription")}
      </p>
      <VerifiedJobsPanel />
    </div>
  );
}
