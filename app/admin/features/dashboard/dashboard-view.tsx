"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  ChevronRight,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { dashboardApi } from "@/lib/api/admin";
import type { AdminPermission, DashboardData } from "@/lib/api/types";
import { ALL_ADMIN_REFRESH_SCOPES, useAdminRefresh } from "@/lib/admin-refresh";
import { useAuth } from "@/lib/auth/auth-context";
import type { DashboardAnalyticsRange } from "@/lib/api/types";
import { useTranslation, type TranslationKey } from "@/lib/i18n";
import { isAsyncRefreshing, useAsyncData } from "@/lib/hooks/use-async";
import { DashboardSkeleton } from "../../ui/skeletons";
import { ErrorState } from "../../ui/states";

const activityToneClasses = {
  success: "bg-[var(--joballa-success-bg)] text-[var(--joballa-success-fg)]",
  warning: "bg-[var(--joballa-warning-bg)] text-[var(--joballa-warning-fg)]",
  info: "bg-[var(--joballa-info-bg)] text-[var(--joballa-info-fg)]",
  violet: "bg-[var(--joballa-violet-bg)] text-[var(--joballa-violet-fg)]",
  danger: "bg-[var(--joballa-danger-bg)] text-[var(--joballa-danger-fg)]",
} as const;

type StatusSegment = { label: string; value: number; percent: string; color: string };

function buildSegments(
  entries: Array<{ key: string; label: string; color: string }>,
  data: Record<string, number>
): StatusSegment[] {
  const total = entries.reduce((sum, entry) => sum + (data[entry.key] ?? 0), 0) || 1;
  return entries.map((entry) => {
    const value = data[entry.key] ?? 0;
    return {
      label: entry.label,
      value,
      percent: `${((value / total) * 100).toFixed(1)}%`,
      color: entry.color,
    };
  });
}

function formatActivityTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  if (date.toDateString() === now.toDateString()) return time;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function getActivityPresentation(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes("kyc") && (normalized.includes("approved") || normalized.includes("verified"))) {
    return { tone: "success" as const, icon: ShieldCheck };
  }
  if (normalized.includes("reject")) return { tone: "danger" as const, icon: ShieldCheck };
  if (normalized.includes("document")) return { tone: "warning" as const, icon: FileText };
  if (normalized.includes("job")) return { tone: "info" as const, icon: BriefcaseBusiness };
  if (normalized.includes("dispute") || normalized.includes("resolve")) {
    return { tone: "violet" as const, icon: ShieldCheck };
  }
  return { tone: "info" as const, icon: FileText };
}

const APPLICATION_SOURCE_DEFS = [
  { key: "web", labelKey: "dashboard.web" as const },
  { key: "mobile_app", labelKey: "dashboard.mobileApp" as const },
] as const;

const APPLICATION_RANGE_OPTIONS: Array<{ value: DashboardAnalyticsRange; labelKey: TranslationKey }> = [
  { value: "7d", labelKey: "dashboard.range7d" },
  { value: "30d", labelKey: "dashboard.range30d" },
  { value: "90d", labelKey: "dashboard.range90d" },
  { value: "1y", labelKey: "dashboard.range1y" },
];

function normalizeApplicationsBySource(
  items: Array<{ source: string; applications: number }>,
  labelFor: (key: "dashboard.web" | "dashboard.mobileApp") => string
) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = (item.source?.trim() || "web").toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + item.applications);
  }
  return APPLICATION_SOURCE_DEFS.map(({ key, labelKey }) => ({
    source: key,
    label: labelFor(labelKey),
    applications: counts.get(key) ?? 0,
  }));
}

function buildApplicationsPath(points: Array<{ date: string; applications: number }>) {
  if (points.length === 0) return null;

  const width = 740;
  const height = 150;
  const padding = 20;
  const chartHeight = height - padding;
  const labelOffset = 24;
  const max = Math.max(...points.map((point) => point.applications), 1);
  const step = width / Math.max(points.length - 1, 1);

  const coords = points.map((point, index) => ({
    x: index * step,
    y: padding + chartHeight - (point.applications / max) * chartHeight,
    date: point.date,
    applications: point.applications,
  }));

  const line = coords
    .map((coord, index) => `${index === 0 ? "M" : "L"}${coord.x} ${coord.y}`)
    .join(" ");
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  const labels = coords.filter((_, index) => index % Math.ceil(coords.length / 6) === 0 || index === coords.length - 1);

  return { line, area, labels, width, height, labelOffset };
}

function DashboardCard({
  children,
  className = "",
  matchHeight = false,
}: {
  children: React.ReactNode;
  className?: string;
  matchHeight?: boolean;
}) {
  return (
    <section
      className={[
        "w-full min-w-0 rounded-[16px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5 shadow-sm",
        matchHeight ? "flex h-full flex-col self-stretch" : "h-fit self-start",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}

function KpiCard({ label, value, change, danger = false }: { label: string; value: string; change: string; danger?: boolean }) {
  return (
    <DashboardCard className="min-h-32">
      <p className="text-xs font-bold uppercase tracking-[0.04em] text-[var(--joballa-muted)]">{label}</p>
      <div className="mt-9 flex flex-wrap items-end gap-x-3 gap-y-1">
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        <p className={`pb-1 text-sm font-bold ${danger ? "text-[var(--joballa-danger-fg)]" : "text-[var(--joballa-primary)]"}`}>
          {change}
        </p>
      </div>
    </DashboardCard>
  );
}

function Donut({ segments, centerValue, centerLabel }: { segments: StatusSegment[]; centerValue?: string; centerLabel?: string }) {
  const stops = segments.map((segment, index) => {
    const start = segments
      .slice(0, index)
      .reduce((total, item) => total + Number(item.percent.replace("%", "")), 0);
    const end = start + Number(segment.percent.replace("%", ""));
    return `${segment.color} ${start}% ${end}%`;
  });

  return (
    <div
      className="relative grid h-36 w-36 shrink-0 place-items-center rounded-full"
      style={{ background: stops.length > 0 ? `conic-gradient(${stops.join(",")})` : "var(--joballa-page-tint)" }}
    >
      <div className="grid h-[68%] w-[68%] place-items-center rounded-full bg-[var(--joballa-card)] text-center">
        {centerValue ? (
          <div>
            <p className="text-2xl font-bold">{centerValue}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--joballa-muted)]">{centerLabel}</p>
          </div>
        ) : (
          <span className="h-10 w-10 rounded-full border-[5px] border-[var(--joballa-success-fg)]" />
        )}
      </div>
    </div>
  );
}

function StatusLegend({
  items,
  variant = "default",
}: {
  items: StatusSegment[];
  variant?: "default" | "stacked";
}) {
  if (variant === "stacked") {
    return (
      <div className="grid min-w-0 gap-4">
        {items.map((item) => (
          <div key={item.label} className="grid min-w-0 grid-cols-[10px_minmax(0,1fr)] items-start gap-x-3 gap-y-1 text-sm">
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
            <div className="min-w-0">
              <p className="font-semibold">{item.label}</p>
              <p className="mt-0.5 text-[var(--joballa-muted)]">{item.percent}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid min-w-0 gap-3">
      {items.map((item) => (
        <div key={item.label} className="grid min-w-0 grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-3 text-sm">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="font-semibold">{item.label}</span>
          <span className="text-right text-[var(--joballa-muted)]">
            {item.value.toLocaleString()} ({item.percent})
          </span>
        </div>
      ))}
    </div>
  );
}

type QuickActionDef = {
  titleKey: TranslationKey;
  detailKey: TranslationKey;
  detailVars?: (data: DashboardData) => Record<string, string>;
  href: string;
  permission?: AdminPermission;
  permissions?: AdminPermission[];
};

const QUICK_ACTION_DEFS: QuickActionDef[] = [
  {
    titleKey: "dashboard.quickActionManageJobs",
    detailKey: "dashboard.quickActionVerifiedJobsDetail",
    detailVars: (data) => ({ count: String(data.jobs?.approvedJobs ?? 0) }),
    href: "/admin/verified-jobs",
    permission: "manage_jobs",
  },
  {
    titleKey: "dashboard.quickActionReviewKyc",
    detailKey: "dashboard.quickActionKycDetail",
    detailVars: (data) => ({ count: String(data.kyc?.pendingKyc ?? 0) }),
    href: "/admin/kyc",
    permission: "verify_kyc",
  },
  {
    titleKey: "dashboard.quickActionCreateProfiles",
    detailKey: "dashboard.quickActionCreateProfilesDetail",
    href: "/admin/profiles",
    permission: "create_profiles",
  },
  {
    titleKey: "dashboard.quickActionAddDepartment",
    detailKey: "dashboard.quickActionAddDepartmentDetail",
    href: "/admin/departments",
    permission: "manage_departments",
  },
  {
    titleKey: "dashboard.quickActionAddAdmin",
    detailKey: "dashboard.quickActionAddAdminDetail",
    href: "/admin/admins",
    permission: "manage_admins",
  },
];

function canAccessQuickAction(
  action: QuickActionDef,
  hasPermission: (permission: AdminPermission) => boolean
) {
  if (action.permission) return hasPermission(action.permission);
  if (action.permissions) return action.permissions.some((permission) => hasPermission(permission));
  return true;
}

function QuickActions({ data }: { data: DashboardData }) {
  const { hasPermission } = useAuth();
  const { t } = useTranslation();
  const actions = QUICK_ACTION_DEFS.filter((action) => canAccessQuickAction(action, hasPermission)).map((action) => ({
    title: t(action.titleKey),
    detail: t(action.detailKey, action.detailVars?.(data)),
    href: action.href,
  }));

  return (
    <DashboardCard>
      <h2 className="font-bold">{t("dashboard.quickActions")}</h2>
      {actions.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {actions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="flex items-center justify-between gap-3 rounded-[12px] border border-[var(--joballa-border)] p-3 transition hover:bg-[var(--joballa-row-hover)]"
            >
              <span className="min-w-0">
                <span className="block font-bold">{action.title}</span>
                <span className="mt-1 block text-sm text-[var(--joballa-muted)]">{action.detail}</span>
              </span>
              <ChevronRight className="shrink-0 text-[var(--joballa-muted)]" />
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-[var(--joballa-muted)]">{t("dashboard.noQuickActions")}</p>
      )}
    </DashboardCard>
  );
}

export function DashboardView() {
  const { hasPermission } = useAuth();
  const { t } = useTranslation();
  const [applicationsRange, setApplicationsRange] = useState<DashboardAnalyticsRange>("30d");
  const canViewLogs = hasPermission("view_platform_logs");

  const { data, loading, error, reload } = useAsyncData(
    () => dashboardApi.get(),
    [],
    { cacheKey: "dashboard:summary" }
  );
  const {
    data: analytics,
    loading: analyticsLoading,
    error: analyticsError,
    reload: reloadAnalytics,
  } = useAsyncData(
    () => dashboardApi.analytics(),
    [],
    { cacheKey: "dashboard:analytics" }
  );
  const {
    data: applicationsAnalytics,
    loading: applicationsLoading,
    reload: reloadApplicationsAnalytics,
  } = useAsyncData(
    () => dashboardApi.analytics({ range: applicationsRange }),
    [applicationsRange],
    { cacheKey: `dashboard:applications:${applicationsRange}` }
  );

  useAdminRefresh(ALL_ADMIN_REFRESH_SCOPES, () => {
    reload();
    reloadAnalytics();
    reloadApplicationsAnalytics();
  });

  const isLoading = loading || analyticsLoading;
  const loadError = analyticsError ?? error;
  const applicationsRefreshing = isAsyncRefreshing(applicationsLoading, applicationsAnalytics);

  if (isLoading) return <DashboardSkeleton />;
  if (loadError || !data) {
    return (
      <ErrorState
        message={loadError ?? t("dashboard.loadError")}
        onRetry={() => {
          reload();
          reloadAnalytics();
          reloadApplicationsAnalytics();
        }}
      />
    );
  }

  const kpis = analytics?.kpis;
  const totalJobs = kpis?.totalJobs ?? data.jobs?.totalJobs ?? 0;
  const totalApplications = kpis?.totalApplications ?? 0;
  const activeUsers = kpis?.activeUsers ?? data.users?.activeUsers ?? 0;
  const kycSubmissions =
    kpis?.kycSubmissions ??
    (data.kyc?.pendingKyc ?? 0) + (data.kyc?.verifiedKyc ?? 0) + (data.kyc?.rejectedKyc ?? 0);
  const verifiedUsers = kpis?.verifiedUsers ?? data.profiles?.verifiedProfiles ?? 0;

  const jobsByStatus = buildSegments(
    [
      { key: "active", label: t("dashboard.active"), color: "var(--joballa-success-fg)" },
      { key: "draft", label: t("dashboard.draft"), color: "var(--joballa-info-fg)" },
      { key: "paused", label: t("dashboard.paused"), color: "var(--joballa-warning-fg)" },
      { key: "closed", label: t("dashboard.closed"), color: "var(--joballa-muted)" },
    ],
    analytics?.jobsByStatus ?? {
      active: data.jobs?.approvedJobs ?? 0,
      draft: 0,
      paused: 0,
      closed: 0,
    }
  );

  const documentStatuses = buildSegments(
    [
      { key: "approved", label: t("dashboard.approved"), color: "var(--joballa-success-fg)" },
      { key: "pending", label: t("dashboard.pending"), color: "#F59E0B" },
      { key: "rejected", label: t("dashboard.rejected"), color: "var(--joballa-danger-fg)" },
    ],
    analytics?.documentsByStatus ?? {
      approved: data.documents?.approvedDocuments ?? 0,
      pending: data.documents?.pendingDocuments ?? 0,
      rejected: data.documents?.rejectedDocuments ?? 0,
    }
  );

  const applicationsChart = buildApplicationsPath(applicationsAnalytics?.applicationsOverTime ?? []);
  const applicationsBySource = normalizeApplicationsBySource(
    applicationsAnalytics?.applicationsBySource ?? [],
    (labelKey) => t(labelKey)
  );
  const sourceTotal = applicationsBySource.reduce((sum, item) => sum + item.applications, 0) || 1;
  const applicationsRangeOption = APPLICATION_RANGE_OPTIONS.find((option) => option.value === applicationsRange) ?? APPLICATION_RANGE_OPTIONS[1];
  const applicationsRangeLabel = t(applicationsRangeOption.labelKey);
  const recentActivity = (analytics?.recentActivity ?? []).slice(0, 5);
  const topDepartments = (analytics?.topDepartments ?? []).slice(0, 5);

  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-1 gap-4 min-[440px]:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label={t("dashboard.totalJobs")}
          value={totalJobs.toLocaleString()}
          change={kpis ? `${kpis.jobsCreatedThisMonth.toLocaleString()} ${t("dashboard.thisMonth")}` : t("dashboard.thisMonth")}
        />
        <KpiCard
          label={t("dashboard.applications")}
          value={totalApplications.toLocaleString()}
          change={kpis ? `+${kpis.applicationsThisMonth.toLocaleString()} ${t("dashboard.thisMonth")}` : t("dashboard.thisMonth")}
        />
        <KpiCard
          label={t("dashboard.activeUsers")}
          value={activeUsers.toLocaleString()}
          change={kpis ? `+${kpis.activeUsersThisMonth.toLocaleString()} ${t("dashboard.thisMonth")}` : t("dashboard.thisMonth")}
        />
        <KpiCard
          label={t("dashboard.kycSubmissions")}
          value={kycSubmissions.toLocaleString()}
          change={kpis ? `${kpis.kycSubmissionPercentChange > 0 ? "+" : ""}${kpis.kycSubmissionPercentChange}% ${t("dashboard.thisMonth")}` : t("dashboard.thisMonth")}
          danger={Boolean(kpis && kpis.kycSubmissionPercentChange < 0)}
        />
        <KpiCard
          label={t("dashboard.verifiedUsers")}
          value={verifiedUsers.toLocaleString()}
          change={kpis ? `+${kpis.verifiedUsersThisMonth.toLocaleString()} ${t("dashboard.thisMonth")}` : t("dashboard.thisMonth")}
        />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.54fr)]">
        <section className="grid content-start gap-5">
          <DashboardCard>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">{t("dashboard.applicationsOverTime")}</h2>
                  <p className="mt-2 text-sm text-[var(--joballa-muted)]">
                    {t("dashboard.totalForRange", { range: applicationsRangeLabel.toLowerCase() })}
                  </p>
                </div>
                <select
                  aria-label={t("dashboard.applicationsOverTime")}
                  className="min-h-11 rounded-full border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-4 text-sm font-semibold text-[var(--joballa-fg)] outline-none"
                  value={applicationsRange}
                  onChange={(event) => setApplicationsRange(event.target.value as DashboardAnalyticsRange)}
                >
                  {APPLICATION_RANGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </select>
              </div>
              <div
                aria-busy={applicationsRefreshing}
                className={[
                  "mt-5 overflow-x-auto transition-opacity",
                  applicationsRefreshing ? "pointer-events-none opacity-60" : "",
                ].join(" ")}
              >
                {applicationsChart ? (
                  <svg
                    viewBox={`0 0 ${applicationsChart.width} ${applicationsChart.height + applicationsChart.labelOffset}`}
                    className="block h-auto w-full min-w-[320px]"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    {[20, 55, 90, 125].map((y) => (
                      <line key={y} x1="0" y1={y} x2={applicationsChart.width} y2={y} stroke="var(--joballa-border)" />
                    ))}
                    <defs>
                      <linearGradient id="applications-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--joballa-primary)" stopOpacity="0.24" />
                        <stop offset="100%" stopColor="var(--joballa-primary)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={applicationsChart.area} fill="url(#applications-fill)" />
                    <path d={applicationsChart.line} fill="none" stroke="var(--joballa-primary)" strokeWidth="4" strokeLinecap="round" />
                    {applicationsChart.labels.map((label) => (
                      <text
                        key={label.date}
                        x={label.x}
                        y={applicationsChart.height + applicationsChart.labelOffset - 4}
                        fill="var(--joballa-muted)"
                        fontSize="12"
                      >
                        {new Date(label.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </text>
                    ))}
                  </svg>
                ) : (
                  <p className="text-sm text-[var(--joballa-muted)]">{t("dashboard.noApplicationData")}</p>
                )}
              </div>
            </DashboardCard>

          <div className="grid items-stretch gap-5 md:grid-cols-2">
            <DashboardCard matchHeight>
              <h2 className="text-xl font-bold">{t("dashboard.documentsByStatus")}</h2>
              <div className="mt-5 flex flex-1 flex-col items-center justify-center gap-5 sm:flex-row sm:items-center">
                <Donut segments={documentStatuses} />
                <StatusLegend items={documentStatuses} variant="stacked" />
              </div>
            </DashboardCard>
            <DashboardCard matchHeight>
              <h2 className="text-xl font-bold">{t("dashboard.kycFunnel")}</h2>
              <div className="mt-5 flex flex-1 flex-wrap items-center justify-center gap-5">
                {analytics?.kycFunnel ? (
                  <>
                    <div className="grid justify-items-center">
                      {[
                        analytics.kycFunnel.submitted,
                        analytics.kycFunnel.underReview,
                        analytics.kycFunnel.verified,
                        analytics.kycFunnel.rejected,
                      ].map((value, index) => {
                        const widths = [120, 100, 80, 58];
                        return (
                          <span
                            key={index}
                            className="block h-10"
                            style={{
                              width: widths[index],
                              backgroundColor: [
                                "var(--joballa-info-bg)",
                                "var(--joballa-info-border)",
                                "var(--joballa-info-fg)",
                                "var(--joballa-danger-fg)",
                              ][index],
                            }}
                            title={String(value)}
                          />
                        );
                      })}
                    </div>
                    <div className="grid gap-3 text-sm">
                      {(
                        [
                          [analytics.kycFunnel.submitted, t("dashboard.submitted")],
                          [analytics.kycFunnel.underReview, t("dashboard.pending")],
                          [analytics.kycFunnel.verified, t("dashboard.verified")],
                          [analytics.kycFunnel.rejected, t("dashboard.rejected")],
                        ] as Array<[number, string]>
                      ).map(([value, label]) => (
                        <p
                          key={label}
                          className={[
                            "font-medium text-[var(--joballa-muted)]",
                            label === t("dashboard.rejected") ? "text-[var(--joballa-danger-fg)]" : "",
                          ].join(" ")}
                        >
                          {value.toLocaleString()} {label.toLowerCase()}
                        </p>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[var(--joballa-muted)]">{t("dashboard.noKycFunnelData")}</p>
                )}
              </div>
            </DashboardCard>
          </div>

          <div className="grid items-start gap-5 md:grid-cols-2">
              <DashboardCard>
                <h2 className="text-xl font-bold">{t("dashboard.applicationsBySource")}</h2>
                <div
                  aria-busy={applicationsRefreshing}
                  className={[
                    "mt-5 grid gap-5 transition-opacity",
                    applicationsRefreshing ? "pointer-events-none opacity-60" : "",
                  ].join(" ")}
                >
                  {applicationsBySource.some((item) => item.applications > 0) ? (
                    applicationsBySource.map((item) => {
                      const width = Math.round((item.applications / sourceTotal) * 100);
                      return (
                        <div key={item.source}>
                          <div className="flex justify-between gap-4 text-sm">
                            <span className="text-[var(--joballa-muted)]">{item.label}</span>
                            <span className="font-bold">
                              {item.applications.toLocaleString()} ({width}%)
                            </span>
                          </div>
                          <div className="mt-3 h-2.5 rounded-full bg-[var(--joballa-page-tint)]">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${width}%`,
                                backgroundColor: item.source === "web" ? "var(--joballa-primary)" : "var(--joballa-info-fg)",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-[var(--joballa-muted)]">{t("dashboard.noSourceData")}</p>
                  )}
                </div>
              </DashboardCard>
              <DashboardCard>
                <h2 className="text-xl font-bold">{t("dashboard.topDepartments")}</h2>
                <div className="mt-5 overflow-x-auto">
                  {topDepartments.length > 0 ? (
                    <table className="w-full min-w-[680px] text-left text-sm">
                      <thead className="border-b border-[var(--joballa-border)] text-xs uppercase tracking-[0.08em] text-[var(--joballa-muted)]">
                        <tr>
                          {[
                            t("dashboard.department"),
                            t("dashboard.jobs"),
                            t("dashboard.applications"),
                            t("dashboard.hires"),
                            t("dashboard.conversionRate"),
                          ].map((heading) => (
                            <th key={heading} className="px-3 py-4">{heading}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {topDepartments.map((department) => (
                          <tr key={department.departmentId} className="border-b border-[var(--joballa-border)] last:border-0">
                            <td className="px-3 py-5 font-semibold">{department.departmentName}</td>
                            <td className="px-3 py-5">{department.jobs.toLocaleString()}</td>
                            <td className="px-3 py-5">{department.applications.toLocaleString()}</td>
                            <td className="px-3 py-5">{department.hires.toLocaleString()}</td>
                            <td className="px-3 py-5">
                              <div className="h-2 w-20 rounded-full bg-[var(--joballa-page-tint)]">
                                <div
                                  className="h-full rounded-full bg-[var(--joballa-success-fg)]"
                                  style={{ width: `${Math.min(department.conversionRate, 100)}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-[var(--joballa-muted)]">{t("dashboard.noDepartmentData")}</p>
                  )}
                </div>
              </DashboardCard>
            </div>
        </section>

        <aside className="grid content-start gap-5">
          <DashboardCard>
            <h2 className="text-xl font-bold">{t("dashboard.jobsByStatus")}</h2>
            <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-center">
              <Donut
                segments={jobsByStatus}
                centerValue={totalJobs.toLocaleString()}
                centerLabel={t("dashboard.totalJobsLabel")}
              />
              <StatusLegend items={jobsByStatus} />
            </div>
          </DashboardCard>
          <QuickActions data={data} />
          <DashboardCard>
              <h2 className="text-xl font-bold">{t("dashboard.recentActivity")}</h2>
              <div className="mt-6 grid gap-6">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => {
                    const presentation = getActivityPresentation(activity.type);
                    const Icon = presentation.icon;
                    return (
                      <div key={activity.id} className="grid grid-cols-[40px_minmax(0,1fr)_70px] items-start gap-3">
                        <span className={`grid h-10 w-10 place-items-center rounded-full ${activityToneClasses[presentation.tone]}`}>
                          <Icon size={17} />
                        </span>
                        <p className="text-sm font-medium leading-5">{activity.description}</p>
                        <p className="text-right text-[10px] leading-4 text-[var(--joballa-muted)]">
                          {formatActivityTime(activity.createdAt)}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-[var(--joballa-muted)]">{t("dashboard.noRecentActivity")}</p>
                )}
              </div>
              {canViewLogs ? (
                <Link href="/admin/platform-logs" className="mt-8 flex items-center justify-center gap-2 text-sm font-bold text-[var(--joballa-primary)]">
                  {t("dashboard.viewAllActivity")} <ArrowRight size={16} />
                </Link>
              ) : null}
            </DashboardCard>
        </aside>
      </div>
    </div>
  );
}
