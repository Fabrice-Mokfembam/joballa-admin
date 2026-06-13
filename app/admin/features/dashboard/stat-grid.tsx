"use client";

import { dashboardApi } from "@/lib/api/admin";
import { useAsyncData } from "@/lib/hooks/use-async";
import { useTranslation } from "@/lib/i18n";
import { ErrorState } from "../../ui/states";
import { StatGridSkeleton } from "../../ui/skeletons";

export function StatGrid() {
  const { t } = useTranslation();
  const { data, loading, error, reload } = useAsyncData(() => dashboardApi.get(), []);

  if (loading) {
    return <StatGridSkeleton />;
  }

  if (error || !data) {
    return <ErrorState message={error ?? t("dashboard.statsLoadError")} onRetry={reload} />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 xl:grid-cols-4">
      {data.stats.map((stat) => (
        <section
          key={stat.label}
          className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-4 sm:p-5"
        >
          <p className="text-sm font-medium text-[var(--joballa-muted)]">{stat.label}</p>
          <p className="mt-3 text-2xl font-bold sm:text-3xl">{stat.value}</p>
          {stat.change ? (
            <p className="mt-2 text-sm font-medium text-[var(--joballa-primary)]">{stat.change}</p>
          ) : null}
        </section>
      ))}
    </div>
  );
}
