"use client";

import { useMemo, useState } from "react";
import { jobsApi } from "@/lib/api/admin";
import { formatJobDepartment, formatStatusFilter } from "@/lib/api/format";
import type { JobListItem } from "@/lib/api/types";
import { isAsyncRefreshing, isInitialAsyncLoad, useAsyncData } from "@/lib/hooks/use-async";
import { useTranslation } from "@/lib/i18n";
import { useTranslatedFormat } from "@/lib/i18n/use-translated-format";
import { DataTable, StatusBadge, StatusFilterPills } from "../ui";
import { DataTableSkeleton } from "../ui/skeletons";
import { EmptyState, ErrorState } from "../ui/states";

function isUnresolvedJob(job: JobListItem): boolean {
  const status = job.status.toLowerCase();
  return status !== "approved" && status !== "published" && status !== "closed";
}

export function JobsTable({
  limit,
  unresolvedOnly = false,
  initialItems,
  skeletonOnly = false,
}: {
  limit?: number;
  unresolvedOnly?: boolean;
  initialItems?: JobListItem[];
  skeletonOnly?: boolean;
} = {}) {
  const { t } = useTranslation();
  const { formatStatusLabel, formatRelativeDate } = useTranslatedFormat();
  const [statusFilter, setStatusFilter] = useState("All");

  const tableColumns = useMemo(
    () => [
      t("jobs.jobColumn"),
      t("jobs.departmentFilter"),
      t("jobs.clientColumn"),
      t("common.location"),
      t("common.pay"),
      t("common.status"),
    ],
    [t]
  );

  const { data: items, loading, error, reload } = useAsyncData(async () => {
    if (initialItems !== undefined) return initialItems;
    const result = await jobsApi.list({
      limit: limit ?? 100,
      moderationQueue: unresolvedOnly ? true : undefined,
      status: formatStatusFilter(statusFilter),
    });
    return result.items;
  }, [initialItems, limit, unresolvedOnly, statusFilter]);

  if (skeletonOnly) {
    return <DataTableSkeleton columns={tableColumns} rows={limit ?? 5} />;
  }

  const isInitialLoad = initialItems === undefined && isInitialAsyncLoad(loading, items);
  const isRefreshing = initialItems === undefined && isAsyncRefreshing(loading, items);

  if (isInitialLoad) {
    return <DataTableSkeleton columns={tableColumns} rows={limit ?? 5} />;
  }

  if (error && initialItems === undefined && items === null) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  const allJobs = items ?? [];
  const baseJobs = unresolvedOnly ? allJobs.filter(isUnresolvedJob) : allJobs;
  const statuses = [
    t("common.all"),
    ...Array.from(new Set(baseJobs.map((job) => formatStatusLabel(job.status)))),
  ];
  const visibleJobs =
    statusFilter === "All" || statusFilter === t("common.all")
      ? baseJobs
      : baseJobs.filter((job) => formatStatusLabel(job.status) === statusFilter);
  const displayedJobs = limit ? visibleJobs.slice(0, limit) : visibleJobs;
  const showStatusFilters = limit === undefined;
  const activeFilter = statusFilter === "All" ? t("common.all") : statusFilter;

  return (
    <>
      {showStatusFilters ? (
        <StatusFilterPills statuses={statuses} value={activeFilter} onChange={setStatusFilter} />
      ) : null}

      {error && initialItems === undefined ? (
        <p className="mb-4 rounded-[8px] border border-[var(--joballa-danger-border)] bg-[var(--joballa-danger-bg)] px-4 py-3 text-sm font-medium text-[var(--joballa-danger-fg)]">
          {error}
        </p>
      ) : null}

      {displayedJobs.length === 0 && !isRefreshing ? (
        <EmptyState title={t("jobs.noJobs")} description={t("jobs.noJobsDescription")} />
      ) : (
      <div
        aria-busy={isRefreshing}
        className={isRefreshing ? "pointer-events-none opacity-60 transition-opacity" : undefined}
      >
      <DataTable
        columns={tableColumns}
        rows={displayedJobs.map((job) => [
          <div key="job" className="min-w-0">
            <span className="font-semibold">{job.title}</span>
            <p className="mt-1 text-xs text-[var(--joballa-muted)]">{formatRelativeDate(job.createdAt)}</p>
          </div>,
          formatJobDepartment(job.department),
          job.client,
          job.location,
          job.pay,
          <StatusBadge key="status" value={job.status} />,
        ])}
      />
      </div>
      )}
    </>
  );
}
