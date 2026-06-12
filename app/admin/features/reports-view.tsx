"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { reportsApi } from "@/lib/api/admin";
import { formatRelativeDate } from "@/lib/api/format";
import type { ReportListItem } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";
import { useAdminRefresh } from "@/lib/admin-refresh";
import { INPUT_MAX_LENGTH } from "@/lib/constants/input-limits";
import { useTranslation } from "@/lib/i18n";
import { isAsyncRefreshing, isInitialAsyncLoad, useAsyncData } from "@/lib/hooks/use-async";
import { DataTable, FilterSelect, StatusBadge } from "../ui";
import { DataTableSkeleton, ReportCardGridSkeleton } from "../ui/skeletons";
import { AccessDeniedState, EmptyState, ErrorState } from "../ui/states";
import { DisputeActionsMenu } from "./dispute-actions";
import { DisputePartyCell } from "./dispute-party";

const STATUS_FILTER_KEYS = ["disputes.all", "disputes.open", "disputes.resolved", "disputes.closed"] as const;
const STATUS_FILTER_VALUES = ["All", "Open", "Resolved", "Closed"] as const;

export function ReportedIssuesTable({
  reports,
  onAction,
  isRefreshing = false,
}: {
  reports: ReportListItem[];
  onAction: () => void;
  isRefreshing?: boolean;
}) {
  const { t } = useTranslation();

  if (reports.length === 0 && !isRefreshing) {
    return <EmptyState title={t("disputes.noDisputes")} description={t("disputes.noDisputesDescription")} />;
  }

  return (
    <div
      aria-busy={isRefreshing}
      className={isRefreshing ? "pointer-events-none opacity-60 transition-opacity" : undefined}
    >
      <DataTable
        columns={[
          t("disputes.subject"),
          t("disputes.reporter"),
          t("disputes.reported"),
          t("disputes.status"),
          t("disputes.updated"),
          t("disputes.action"),
        ]}
        rows={reports.map((report) => [
          <span key="subject" className="font-semibold">
            {report.subject}
          </span>,
          <DisputePartyCell key="reporter" party={report.reporterParty} fallback={report.reporter} />,
          <DisputePartyCell key="reported" party={report.reportedParty} fallback={report.reported} />,
          <StatusBadge key="status" value={report.status} />,
          formatRelativeDate(report.lastActivityAt),
          <DisputeActionsMenu key="action" report={report} onAction={onAction} />,
        ])}
      />
    </div>
  );
}

export function ReportsView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTER_VALUES)[number]>("All");
  const { hasPermission } = useAuth();
  const { t } = useTranslation();

  const { data, loading, error, reload } = useAsyncData(
    async () =>
      reportsApi.list({
        limit: 100,
        status: statusFilter === "All" ? undefined : statusFilter.toLowerCase().replace(/ /g, "_"),
      }),
    [statusFilter],
    { cacheKey: `reports:list:${statusFilter}` }
  );

  useAdminRefresh(["reports"], reload);

  const isInitialLoad = isInitialAsyncLoad(loading, data);
  const isRefreshing = isAsyncRefreshing(loading, data);
  const visibleReports = useMemo(() => {
    const reports = data?.items ?? [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return reports;
    return reports.filter((report) =>
      [report.subject, report.reporter, report.reported, report.status].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [data, searchQuery]);

  if (!hasPermission("reports:read")) {
    return <AccessDeniedState description={t("disputes.accessDenied")} />;
  }

  if (isInitialLoad) {
    return (
      <>
        <div className="mb-5 hidden lg:block">
          <DataTableSkeleton
            columns={[
              t("disputes.subject"),
              t("disputes.reporter"),
              t("disputes.reported"),
              t("disputes.status"),
              t("disputes.updated"),
              t("disputes.action"),
            ]}
            rows={5}
          />
        </div>
        <div className="mb-5 lg:hidden">
          <ReportCardGridSkeleton count={6} />
        </div>
      </>
    );
  }

  if (error && data === null) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  return (
    <section>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex min-h-12 w-full max-w-[600px] flex-1 items-center rounded-[14px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-4">
          <input
            aria-label={t("disputes.searchPlaceholder")}
            className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--joballa-muted)]"
            placeholder={t("disputes.searchPlaceholder")}
            value={searchQuery}
            maxLength={INPUT_MAX_LENGTH.search}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <Search size={18} className="text-[var(--joballa-muted)]" />
        </div>
        <FilterSelect
          label={t("disputes.status")}
          value={t(STATUS_FILTER_KEYS[STATUS_FILTER_VALUES.indexOf(statusFilter)])}
          options={STATUS_FILTER_KEYS.map((key) => t(key))}
          onChange={(label) => {
            const index = STATUS_FILTER_KEYS.findIndex((key) => t(key) === label);
            if (index >= 0) setStatusFilter(STATUS_FILTER_VALUES[index]);
          }}
        />
      </div>

      {error ? (
        <p className="mb-4 rounded-[8px] border border-[var(--joballa-danger-border)] bg-[var(--joballa-danger-bg)] px-4 py-3 text-sm font-medium text-[var(--joballa-danger-fg)]">
          {error}
        </p>
      ) : null}

      <div className="hidden lg:block">
        <ReportedIssuesTable reports={visibleReports} onAction={reload} isRefreshing={isRefreshing} />
      </div>
      <div className="lg:hidden">
        <ReportCards reports={visibleReports} onAction={reload} isRefreshing={isRefreshing} />
      </div>
    </section>
  );
}

function ReportCards({
  reports,
  onAction,
  isRefreshing = false,
}: {
  reports: ReportListItem[];
  onAction: () => void;
  isRefreshing?: boolean;
}) {
  const { t } = useTranslation();

  if (reports.length === 0 && !isRefreshing) {
    return <EmptyState title={t("disputes.noDisputes")} description={t("disputes.noDisputesDescription")} />;
  }

  return (
    <div
      aria-busy={isRefreshing}
      className={[
        "grid gap-4",
        isRefreshing ? "pointer-events-none opacity-60 transition-opacity" : "",
      ].join(" ")}
    >
      {reports.map((report) => (
        <article
          key={report.id}
          className="rounded-[12px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-bold">{report.subject}</h3>
            <DisputeActionsMenu report={report} onAction={onAction} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--joballa-muted)]">
                {t("disputes.reporter")}
              </p>
              <DisputePartyCell party={report.reporterParty} fallback={report.reporter} />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--joballa-muted)]">
                {t("disputes.reported")}
              </p>
              <DisputePartyCell party={report.reportedParty} fallback={report.reported} />
            </div>
          </div>
          <div className="mt-4">
            <StatusBadge value={report.status} />
          </div>
        </article>
      ))}
    </div>
  );
}
