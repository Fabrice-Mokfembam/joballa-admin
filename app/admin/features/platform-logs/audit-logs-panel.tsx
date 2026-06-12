"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { auditLogsApi } from "@/lib/api/admin";
import { formatAuditAction, formatAuditArea, formatAuditEntity, formatRoleLabel } from "@/lib/api/format";
import type { AuditLogListItem } from "@/lib/api/types";
import { useAdminRefresh } from "@/lib/admin-refresh";
import { INPUT_MAX_LENGTH } from "@/lib/constants/input-limits";
import { isAsyncRefreshing, isInitialAsyncLoad, useAsyncData } from "@/lib/hooks/use-async";
import { useTranslation, type TranslationKey } from "@/lib/i18n";
import { PaginationBar } from "../../ui";
import { DataTableSkeleton } from "../../ui/skeletons";
import { EmptyState, ErrorState } from "../../ui/states";

const MODULE_FILTERS = ["All modules", "KYC", "Documents", "Jobs", "Reports", "Users", "Departments", "Admins"] as const;
const ACTION_FILTERS = ["All actions", "Created", "Updated", "Deleted", "Approved", "Rejected", "Resolved"] as const;
const DATE_FILTERS = ["Any time", "Today", "Last 7 days", "Last 30 days"] as const;

const ACTION_VERB_KEYS: Record<string, TranslationKey> = {
  Created: "logs.created",
  Updated: "logs.updated",
  Deleted: "logs.deleted",
  Approved: "logs.approved",
  Rejected: "logs.rejected",
  Resolved: "logs.resolved",
};

const DATE_FILTER_KEYS: Record<(typeof DATE_FILTERS)[number], TranslationKey> = {
  "Any time": "logs.anyTime",
  Today: "logs.today",
  "Last 7 days": "logs.last7Days",
  "Last 30 days": "logs.last30Days",
};

function splitDate(iso: string) {
  const date = new Date(iso);
  const dateLine = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
  const timeLine = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(date)
    .replace(" ", "");
  return { dateLine, timeLine };
}

function actionVerb(action: string) {
  const normalized = action.toLowerCase();
  if (normalized.includes("create") || normalized.includes("grant")) return "Created";
  if (normalized.includes("delete") || normalized.includes("revoke")) return "Deleted";
  if (normalized.includes("approve") || normalized.includes("verified")) return "Approved";
  if (normalized.includes("reject")) return "Rejected";
  if (normalized.includes("resolve") || normalized.includes("close")) return "Resolved";
  if (normalized.includes("update") || normalized.includes("edit") || normalized.includes("suspend")) return "Updated";
  return formatAuditAction(action);
}

function actionToneClass(action: string): string {
  const verb = actionVerb(action);
  switch (verb) {
    case "Deleted":
    case "Rejected":
      return "text-[var(--joballa-danger-fg)]";
    case "Created":
    case "Approved":
      return "text-[var(--joballa-success-fg)]";
    case "Resolved":
      return "text-[var(--joballa-violet-fg)]";
    case "Updated":
      return "text-[var(--joballa-muted)]";
    default:
      return "text-[var(--joballa-muted)]";
  }
}

function moduleMatches(log: AuditLogListItem, filter: string) {
  if (filter === "All modules") return true;
  const area = formatAuditArea(log.scope).toLowerCase();
  const entity = log.entityType.toLowerCase();
  const key = filter.toLowerCase();
  return area.includes(key) || entity.includes(key.replace(/s$/, ""));
}

function actionMatches(log: AuditLogListItem, filter: string) {
  if (filter === "All actions") return true;
  return actionVerb(log.action).toLowerCase() === filter.toLowerCase();
}

function dateMatches(log: AuditLogListItem, filter: string) {
  if (filter === "Any time") return true;
  const created = new Date(log.createdAt).getTime();
  const now = Date.now();
  const ageDays = (now - created) / 86_400_000;
  if (filter === "Today") return ageDays < 1;
  if (filter === "Last 7 days") return ageDays <= 7;
  return ageDays <= 30;
}

function logDetails(log: AuditLogListItem) {
  if (log.entityLabel?.trim()) return log.entityLabel.trim().replace(/\.$/, "");
  const target = formatAuditEntity(log);
  const area = formatAuditArea(log.scope);
  return `${formatAuditAction(log.action)} ${target || area}`.trim();
}

function getModuleFilterLabel(filter: string, t: (key: TranslationKey) => string): string {
  if (filter === "All modules") return t("logs.allModules");
  return filter;
}

function getActionFilterLabel(filter: string, t: (key: TranslationKey) => string): string {
  if (filter === "All actions") return t("logs.allActions");
  return t(ACTION_VERB_KEYS[filter] ?? "logs.created");
}

export function AuditLogsPanel() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("All modules");
  const [actionFilter, setActionFilter] = useState<string>("All actions");
  const [dateFilter, setDateFilter] = useState<string>("Any time");
  const [page, setPage] = useState(1);

  const { data: listResult, loading, error, reload } = useAsyncData(
    async () =>
      auditLogsApi.list({
        page,
        limit: 50,
        search: searchQuery.trim() || undefined,
        module: moduleFilter === "All modules" ? undefined : moduleFilter.toLowerCase(),
      }),
    [page, searchQuery, moduleFilter],
    { cacheKey: `audit-logs:${page}:${moduleFilter}:${searchQuery.trim()}` }
  );

  useAdminRefresh(["audit-logs"], reload);

  const logs = useMemo(() => listResult?.items ?? [], [listResult]);
  const totalPages = listResult?.totalPages ?? 1;
  const visibleLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return logs.filter((log) => {
      const text = `${log.actor} ${log.action} ${formatAuditArea(log.scope)} ${formatAuditEntity(log)} ${logDetails(log)}`.toLowerCase();
      return (
        (!query || text.includes(query)) &&
        moduleMatches(log, moduleFilter) &&
        actionMatches(log, actionFilter) &&
        dateMatches(log, dateFilter)
      );
    });
  }, [logs, searchQuery, moduleFilter, actionFilter, dateFilter]);

  const isInitialLoad = isInitialAsyncLoad(loading, listResult);
  const isRefreshing = isAsyncRefreshing(loading, listResult);
  const tableColumns = [t("logs.time"), t("logs.admin"), t("logs.action"), t("logs.moduleFilter"), t("logs.details")] as const;

  if (isInitialLoad) {
    return <DataTableSkeleton rows={8} columns={[...tableColumns]} />;
  }

  if (error && listResult === null) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  return (
    <section>
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(280px,1fr)_180px_180px_180px]">
        <div className="col-span-2 flex min-h-12 items-center rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-4 xl:col-span-1">
          <input
            className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--joballa-muted)]"
            placeholder={t("logs.searchPlaceholder")}
            value={searchQuery}
            maxLength={INPUT_MAX_LENGTH.search}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setPage(1);
            }}
          />
          <Search size={18} className="text-[var(--joballa-muted)]" />
        </div>
        <LogSelect
          label={t("logs.moduleFilter")}
          value={moduleFilter}
          options={[...MODULE_FILTERS]}
          getOptionLabel={(option) => getModuleFilterLabel(option, t)}
          onChange={setModuleFilter}
        />
        <LogSelect
          label={t("logs.actionFilter")}
          value={actionFilter}
          options={[...ACTION_FILTERS]}
          getOptionLabel={(option) => getActionFilterLabel(option, t)}
          onChange={setActionFilter}
        />
        <LogSelect
          label={t("logs.dateFilter")}
          value={dateFilter}
          options={[...DATE_FILTERS]}
          getOptionLabel={(option) => t(DATE_FILTER_KEYS[option as (typeof DATE_FILTERS)[number]])}
          onChange={setDateFilter}
        />
      </div>

      {error ? (
        <p className="mb-4 rounded-[8px] border border-[var(--joballa-danger-border)] bg-[var(--joballa-danger-bg)] px-4 py-3 text-sm font-medium text-[var(--joballa-danger-fg)]">
          {error}
        </p>
      ) : null}

      <div
        aria-busy={isRefreshing}
        className={[
          "overflow-hidden rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)]",
          isRefreshing ? "pointer-events-none opacity-60 transition-opacity" : "",
        ].join(" ")}
      >
        <div className="hidden border-b border-[var(--joballa-border)] bg-[var(--joballa-page-tint)] px-5 py-4 text-xs font-bold uppercase tracking-[0.08em] text-[var(--joballa-muted)] lg:grid lg:grid-cols-[150px_180px_120px_130px_minmax(0,1fr)] lg:gap-4">
          <span>{t("logs.time")}</span>
          <span>{t("logs.admin")}</span>
          <span>{t("logs.action")}</span>
          <span>{t("logs.moduleFilter")}</span>
          <span>{t("logs.details")}</span>
        </div>

        {visibleLogs.length === 0 && !isRefreshing ? (
          <div className="p-5">
            <EmptyState title={t("logs.noLogs")} description={t("logs.noLogsDescription")} />
          </div>
        ) : (
          visibleLogs.map((log) => {
            const { dateLine, timeLine } = splitDate(log.createdAt);
            const area = formatAuditArea(log.scope);
            const verb = actionVerb(log.action);
            const verbLabel = ACTION_VERB_KEYS[verb] ? t(ACTION_VERB_KEYS[verb]) : verb;
            return (
              <article
                key={log.id}
                className="grid min-w-0 gap-4 border-b border-[var(--joballa-border)] px-5 py-4 last:border-0 lg:grid-cols-[150px_180px_120px_130px_minmax(0,1fr)] lg:items-center"
              >
                <div>
                  <p className="text-sm font-bold">{dateLine}</p>
                  <p className="mt-1 text-xs font-semibold text-[var(--joballa-muted)]">{timeLine}</p>
                </div>
                <div>
                  <p className="text-sm font-bold">{log.actor}</p>
                  {log.actorRole ? <p className="mt-1 text-xs font-semibold text-[var(--joballa-muted)]">{formatRoleLabel(log.actorRole)}</p> : null}
                </div>
                <span className={["w-fit rounded-full bg-[var(--joballa-page-tint)] px-3 py-1.5 text-xs font-bold", actionToneClass(log.action)].join(" ")}>
                  {verbLabel}
                </span>
                <p className="truncate text-sm font-semibold text-[var(--joballa-muted)]">{area}</p>
                <div className="min-w-0 overflow-hidden">
                  <p className="truncate text-sm font-semibold" title={logDetails(log)}>{logDetails(log)}</p>
                </div>
              </article>
            );
          })
        )}
      </div>

      <PaginationBar page={page} totalPages={totalPages} total={listResult?.total} onPageChange={setPage} />
    </section>
  );
}


function LogSelect({
  label,
  value,
  options,
  getOptionLabel,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  getOptionLabel: (option: string) => string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label={label}
      className="min-h-12 min-w-0 w-full rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-2 text-sm font-semibold text-[var(--joballa-fg)] outline-none sm:px-3"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {getOptionLabel(option)}
        </option>
      ))}
    </select>
  );
}
