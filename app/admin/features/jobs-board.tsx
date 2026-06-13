"use client";

import { useMemo, useState } from "react";
import { jobsApi } from "@/lib/api/admin";
import type { JobDetail } from "@/lib/api/types";
import { useAdminRefresh } from "@/lib/admin-refresh";
import { useAuth } from "@/lib/auth/auth-context";
import { isAsyncRefreshing, isInitialAsyncLoad, useAsyncData } from "@/lib/hooks/use-async";
import { useTranslation } from "@/lib/i18n";
import { resolveDepartmentLabel } from "@/lib/api/format";
import { FilterSelect, PaginationBar, SearchField, StatusFilterPills } from "../ui";
import { JobActionModals, getJobMenuItems, getJobPanelActions, type JobActionRequest } from "./jobs/job-action-modals";
import { JobCard } from "./jobs/job-card";
import { JobDetailPanel } from "./jobs/job-detail-panel";
import { JobCardGridSkeleton } from "../ui/skeletons";
import { AccessDeniedState, EmptyState, ErrorState } from "../ui/states";

const PENDING_STATUS_FILTERS = ["All", "Pending review", "Rejected"] as const;
const PENDING_STATUS_FILTER_KEYS = ["common.all", "jobs.pendingReview", "common.rejected"] as const;
const DEPARTMENT_FILTER_ALL = "All departments";
const TYPE_FILTER_ALL = "All job types";
const SORT_KEYS = ["common.newestFirst", "common.oldestFirst"] as const;
const SORT_VALUES = ["Newest first", "Oldest first"] as const;
const PAGE_SIZE = 20;

function formatJobStatusFilter(label: string): string | undefined {
  if (label === "All") return undefined;
  if (label === "Pending review") return "pending";
  return label.toLowerCase();
}

export function JobsBoard({
  variant = "pending",
  initialStatus = "All",
  fixedStatus = false,
}: {
  variant?: "pending" | "rejected";
  initialStatus?: (typeof PENDING_STATUS_FILTERS)[number];
  fixedStatus?: boolean;
} = {}) {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const canRead = hasPermission("jobs:read") || hasPermission("jobs:verify") || hasPermission("jobs:moderate");
  const canModerate = hasPermission("jobs:moderate") || hasPermission("jobs:verify");
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState(DEPARTMENT_FILTER_ALL);
  const [typeFilter, setTypeFilter] = useState(TYPE_FILTER_ALL);
  const [sortOrder, setSortOrder] = useState<(typeof SORT_VALUES)[number]>("Newest first");
  const [statusFilter, setStatusFilter] = useState<string>(variant === "rejected" ? "Rejected" : initialStatus);
  const [page, setPage] = useState(1);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [actionRequest, setActionRequest] = useState<JobActionRequest | null>(null);

  const { data: listResult, loading, error, reload } = useAsyncData(async () => {
    const params = {
      page,
      limit: PAGE_SIZE,
      search: searchQuery.trim() || undefined,
      status: formatJobStatusFilter(statusFilter),
    };
    return variant === "rejected" ? jobsApi.rejected(params) : jobsApi.pending(params);
  }, [page, searchQuery, statusFilter, variant], {
    cacheKey: `jobs:${variant}:${page}:${statusFilter}:${searchQuery.trim()}`,
  });

  useAdminRefresh(["jobs"], reload);

  const jobs = useMemo(() => listResult?.items ?? [], [listResult]);
  const totalPages = listResult?.totalPages ?? 1;
  const isInitialLoad = isInitialAsyncLoad(loading, listResult);
  const isRefreshing = isAsyncRefreshing(loading, listResult);

  const visibleJobs = useMemo(
    () =>
      jobs
        .filter((job) => !["draft", "paused"].includes(job.status.toLowerCase()))
        .filter((job) => departmentFilter === DEPARTMENT_FILTER_ALL || resolveDepartmentLabel(job.department) === departmentFilter)
        .filter((job) => typeFilter === TYPE_FILTER_ALL || job.availability === typeFilter)
        .sort((left, right) => {
          const comparison = new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
          return sortOrder === "Newest first" ? comparison : -comparison;
        }),
    [jobs, departmentFilter, typeFilter, sortOrder]
  );

  const selectedJob = visibleJobs.find((job) => job.id === selectedJobId) ?? null;
  const detail: JobDetail | null = selectedJob as JobDetail | null;
  const departmentOptions = [
    t("jobs.allDepartments"),
    ...Array.from(new Set(jobs.map((job) => resolveDepartmentLabel(job.department)).filter(Boolean))),
  ];
  const typeOptions = [t("jobs.allJobTypes"), ...Array.from(new Set(jobs.map((job) => job.availability)))];

  if (isInitialLoad) {
    return <JobCardGridSkeleton count={6} />;
  }

  if (!canRead) {
    return <AccessDeniedState description={t("jobs.accessDenied")} />;
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
          placeholder={t("jobs.searchPlaceholder")}
        />
        <FilterSelect
          label={t("jobs.departmentFilter")}
          value={departmentFilter === DEPARTMENT_FILTER_ALL ? t("jobs.allDepartments") : departmentFilter}
          options={departmentOptions}
          onChange={(label) => {
            setDepartmentFilter(label === t("jobs.allDepartments") ? DEPARTMENT_FILTER_ALL : label);
          }}
        />
        <FilterSelect
          label={t("jobs.typeFilter")}
          value={typeFilter === TYPE_FILTER_ALL ? t("jobs.allJobTypes") : typeFilter}
          options={typeOptions}
          onChange={(label) => {
            setTypeFilter(label === t("jobs.allJobTypes") ? TYPE_FILTER_ALL : label);
          }}
        />
        <FilterSelect
          label={t("jobs.sortFilter")}
          value={t(SORT_KEYS[SORT_VALUES.indexOf(sortOrder)])}
          options={SORT_KEYS.map((key) => t(key))}
          onChange={(label) => {
            const index = SORT_KEYS.findIndex((key) => t(key) === label);
            if (index >= 0) setSortOrder(SORT_VALUES[index]);
          }}
        />
      </section>

      {variant === "pending" && !fixedStatus ? (
        <StatusFilterPills
          statuses={PENDING_STATUS_FILTER_KEYS.map((key) => t(key))}
          value={t(PENDING_STATUS_FILTER_KEYS[PENDING_STATUS_FILTERS.indexOf(statusFilter as (typeof PENDING_STATUS_FILTERS)[number])])}
          onChange={(label) => {
            const index = PENDING_STATUS_FILTER_KEYS.findIndex((key) => t(key) === label);
            if (index >= 0) {
              setStatusFilter(PENDING_STATUS_FILTERS[index]);
              setPage(1);
              setSelectedJobId(null);
              setIsDetailsOpen(false);
            }
          }}
        />
      ) : null}

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
              <EmptyState title={t("jobs.noJobs")} description={t("jobs.noJobsDescription")} />
            </div>
          ) : (
            visibleJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                selected={isDetailsOpen && selectedJobId === job.id}
                menuItems={getJobMenuItems(variant, job, canModerate, setActionRequest, t)}
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
            detailLoading={false}
            onClose={() => setIsDetailsOpen(false)}
            primaryActions={getJobPanelActions(variant, selectedJob, canModerate, setActionRequest, t)}
          />
        ) : null}
      </div>

      <PaginationBar page={page} totalPages={totalPages} total={listResult?.total} onPageChange={setPage} />

      <JobActionModals
        request={actionRequest}
        onClose={() => setActionRequest(null)}
        onSuccess={() => {
          reload();
        }}
      />
    </div>
  );
}
