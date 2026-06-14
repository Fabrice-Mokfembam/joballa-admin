"use client";

import { useMemo, useState } from "react";
import { jobsApi } from "@/lib/api/admin";
import { isHiddenVerifiedJobStatus, resolveDepartmentLabel } from "@/lib/api/format";
import type { JobDetail } from "@/lib/api/types";
import { useAdminRefresh } from "@/lib/admin-refresh";
import { useAuth } from "@/lib/auth/auth-context";
import { isAsyncRefreshing, isInitialAsyncLoad, useAsyncData } from "@/lib/hooks/use-async";
import { useTranslation } from "@/lib/i18n";
import { FilterSelect, PaginationBar, SearchField, StatusFilterPills } from "../../ui";
import { JobActionModals, getJobMenuItems, type JobActionRequest } from "../jobs/job-action-modals";
import { JobCard } from "../jobs/job-card";
import { JobDetailPanel } from "../jobs/job-detail-panel";
import { JobCardGridSkeleton } from "../../ui/skeletons";
import { AccessDeniedState, EmptyState, ErrorState } from "../../ui/states";

const VERIFIED_STATUS_FILTER_KEYS = ["jobs.live", "jobs.closed"] as const;
const VERIFIED_STATUS_FILTERS = ["Live", "Closed"] as const;
const PAGE_SIZE = 20;

function formatVerifiedJobStatusFilter(label: string): string {
  return label === "Live" ? "live" : "closed";
}

function matchesVerifiedStatusFilter(status: string, filter: string): boolean {
  const normalized = status.toLowerCase().replace(/\s+/g, "_");
  if (filter === "Live") {
    return normalized === "live" || normalized === "published";
  }
  return normalized === "closed";
}

export function VerifiedJobsPanel() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const canRead = hasPermission("jobs:read") || hasPermission("jobs:manage");
  const canModerate = hasPermission("jobs:manage") || hasPermission("jobs:moderate") || hasPermission("jobs:verify");
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All departments");
  const [typeFilter, setTypeFilter] = useState("All job types");
  const [sortOrder, setSortOrder] = useState("Newest first");
  const [statusFilter, setStatusFilter] = useState("Live");
  const [page, setPage] = useState(1);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [actionRequest, setActionRequest] = useState<JobActionRequest | null>(null);

  const { data: listResult, loading, error, reload } = useAsyncData(async () => {
    return jobsApi.list({
      page,
      limit: PAGE_SIZE,
      search: searchQuery.trim() || undefined,
      status: formatVerifiedJobStatusFilter(statusFilter),
    });
  }, [page, searchQuery, statusFilter]);

  useAdminRefresh(["jobs"], reload);

  const jobs = useMemo(() => listResult?.items ?? [], [listResult]);
  const totalPages = listResult?.totalPages ?? 1;
  const isInitialLoad = isInitialAsyncLoad(loading, listResult);
  const isRefreshing = isAsyncRefreshing(loading, listResult);

  const visibleJobs = useMemo(
    () =>
      jobs
        .filter((job) => !isHiddenVerifiedJobStatus(job.status))
        .filter((job) => matchesVerifiedStatusFilter(job.status, statusFilter))
        .filter((job) => departmentFilter === "All departments" || resolveDepartmentLabel(job.department) === departmentFilter)
        .filter((job) => typeFilter === "All job types" || job.availability === typeFilter)
        .sort((left, right) => {
          const comparison = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
          return sortOrder === "Newest first" ? comparison : -comparison;
        }),
    [jobs, departmentFilter, typeFilter, sortOrder, statusFilter]
  );

  const selectedJob = visibleJobs.find((job) => job.id === selectedJobId) ?? null;
  const detail: JobDetail | null = selectedJob as JobDetail | null;

  if (isInitialLoad) {
    return <JobCardGridSkeleton count={6} />;
  }

  if (!canRead) {
    return <AccessDeniedState description={t("jobs.verifiedAccessDenied")} />;
  }

  if (error && listResult === null) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  return (
    <div>
      <section className="mb-4 flex flex-wrap items-center gap-3">
        <SearchField
          value={searchQuery}
          onChange={(value) => {
            setSearchQuery(value);
            setPage(1);
          }}
          placeholder={t("jobs.verifiedSearchPlaceholder")}
        />
        <FilterSelect
          label={t("jobs.departmentFilter")}
          value={departmentFilter === "All departments" ? t("jobs.allDepartments") : departmentFilter}
          options={[t("jobs.allDepartments"), ...Array.from(new Set(jobs.map((job) => resolveDepartmentLabel(job.department)).filter(Boolean)))]}
          onChange={(value) => setDepartmentFilter(value === t("jobs.allDepartments") ? "All departments" : value)}
        />
        <FilterSelect
          label={t("jobs.typeFilter")}
          value={typeFilter === "All job types" ? t("jobs.allJobTypes") : typeFilter}
          options={[t("jobs.allJobTypes"), ...Array.from(new Set(jobs.map((job) => job.availability)))]}
          onChange={(value) => setTypeFilter(value === t("jobs.allJobTypes") ? "All job types" : value)}
        />
        <FilterSelect
          label={t("jobs.sortFilter")}
          value={sortOrder === "Newest first" ? t("common.newestFirst") : t("common.oldestFirst")}
          options={[t("common.newestFirst"), t("common.oldestFirst")]}
          onChange={(value) => setSortOrder(value === t("common.oldestFirst") ? "Oldest first" : "Newest first")}
        />
      </section>

      <StatusFilterPills
        statuses={VERIFIED_STATUS_FILTER_KEYS.map((key) => t(key))}
        value={t(VERIFIED_STATUS_FILTER_KEYS[VERIFIED_STATUS_FILTERS.indexOf(statusFilter as (typeof VERIFIED_STATUS_FILTERS)[number])])}
        onChange={(label) => {
          const index = VERIFIED_STATUS_FILTER_KEYS.findIndex((key) => t(key) === label);
          if (index >= 0) setStatusFilter(VERIFIED_STATUS_FILTERS[index]);
          setPage(1);
          setSelectedJobId(null);
          setIsDetailsOpen(false);
        }}
      />

      {error ? (
        <p className="mb-4 rounded-[8px] border border-[var(--joballa-danger-border)] bg-[var(--joballa-danger-bg)] px-4 py-3 text-sm font-medium text-[var(--joballa-danger-fg)]">
          {error}
        </p>
      ) : null}

      <div
        className={[
          "grid gap-6",
          isDetailsOpen && selectedJob ? "xl:grid-cols-[minmax(320px,500px)_minmax(0,1fr)] xl:items-start" : "",
        ].join(" ")}
      >
        <section
          aria-busy={isRefreshing}
          className={[
            "grid gap-4",
            isDetailsOpen && selectedJob ? "xl:max-w-[500px]" : "w-full md:grid-cols-2 xl:grid-cols-3",
            isRefreshing ? "pointer-events-none opacity-60 transition-opacity" : "",
          ].join(" ")}
        >
          {visibleJobs.length === 0 && !isRefreshing ? (
            <div className="col-span-full">
              <EmptyState title={t("jobs.noVerifiedJobs")} description={t("jobs.noVerifiedJobsDescription")} />
            </div>
          ) : (
            visibleJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                selected={isDetailsOpen && selectedJobId === job.id}
                menuItems={getJobMenuItems("verified", job, canModerate, setActionRequest, t)}
                onSelect={() => {
                  setSelectedJobId(job.id);
                  setIsDetailsOpen(true);
                }}
              />
            ))
          )}
        </section>

        {isDetailsOpen && selectedJob ? (
          <JobDetailPanel
            job={selectedJob}
            detail={detail}
            detailLoading={isRefreshing}
            onClose={() => setIsDetailsOpen(false)}
            menuItems={getJobMenuItems("verified", selectedJob, canModerate, setActionRequest, t)}
          />
        ) : null}
      </div>

      <PaginationBar page={page} totalPages={totalPages} total={listResult?.total} onPageChange={setPage} />

      <JobActionModals
        request={actionRequest}
        onClose={() => setActionRequest(null)}
        onSuccess={() => {
          reload();
          if (actionRequest?.kind === "reject" || actionRequest?.kind === "unpublish") {
            setIsDetailsOpen(false);
            setSelectedJobId(null);
          }
        }}
      />
    </div>
  );
}
