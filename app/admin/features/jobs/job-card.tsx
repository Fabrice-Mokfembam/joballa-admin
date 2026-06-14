"use client";

import { formatJobDepartment, formatJobPosterName } from "@/lib/api/format";
import type { JobListItem } from "@/lib/api/types";
import { MIDDLE_DOT } from "@/lib/constants";
import { useTranslation } from "@/lib/i18n";
import { useTranslatedFormat } from "@/lib/i18n/use-translated-format";
import { MoreMenu, UserAvatar } from "../../ui";

export function JobCard({
  job,
  selected,
  onSelect,
  menuItems,
}: {
  job: JobListItem;
  selected: boolean;
  onSelect: () => void;
  menuItems?: Array<{ label: string; tone?: "danger"; onClick: () => void | Promise<void | boolean | null> }>;
}) {
  const { t } = useTranslation();
  const { formatRelativeDate, formatJobStatusLabel, formatRoleLabel } = useTranslatedFormat();
  const posterName = formatJobPosterName(job.client, job.department);
  const posterRole =
    job.postedByType === "company" ? "employer" : job.postedByType === "worker" ? "worker" : "unknown";
  const normalizedStatus = job.status.toLowerCase();
  const issue =
    job.rejectionReason ?? job.issueReason ?? job.tierReason ?? job.moderationNotes ?? null;
  const showIssue = issue && normalizedStatus === "rejected";

  return (
    <article
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
      className={[
        "w-full min-w-0 cursor-pointer rounded-[8px] border bg-[var(--joballa-card)] p-5 text-left transition",
        selected
          ? "border-[var(--joballa-primary)] shadow-[0_0_0_1px_var(--joballa-primary)]"
          : "border-[var(--joballa-border)] hover:border-[var(--joballa-primary)]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-semibold text-[var(--joballa-muted)]">
          {formatRelativeDate(job.createdAt)}
        </span>
        <div className="flex items-center gap-2">
          {job.createdByAdmin ? (
            <span className="rounded-full border border-[var(--joballa-primary)] bg-[var(--joballa-jade-3)] px-3 py-1 text-xs font-bold text-[var(--joballa-primary)]">
              {t("jobs.adminCreatedTag")}
            </span>
          ) : null}
          <span className="rounded-full bg-[var(--joballa-page-tint)] px-3 py-1 text-xs font-bold text-[var(--joballa-muted)]">
            {formatJobStatusLabel(job.status)}
          </span>
          {menuItems && menuItems.length > 0 ? (
            <MoreMenu label={t("jobs.actionsFor", { title: job.title })} items={menuItems} />
          ) : null}
        </div>
      </div>
      <div className="mt-8">
        <h3 className="text-xl font-bold tracking-tight text-[var(--joballa-fg)]">{job.title}</h3>
        <p className="admin-card-description mt-1">
          {job.location} {MIDDLE_DOT} {job.pay}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <span className="rounded-full border border-[var(--joballa-border)] bg-[var(--joballa-tag-bg)] px-3 py-1 text-sm font-semibold text-[var(--joballa-tag-fg)]">
            {formatJobDepartment(job.department)}
          </span>
          <span className="rounded-full border border-[var(--joballa-border)] bg-[var(--joballa-tag-bg)] px-3 py-1 text-sm font-semibold text-[var(--joballa-tag-fg)]">
            {t("jobs.applicationsCount", { count: String(job.applications) })}
          </span>
        </div>
      </div>
      <div className="mt-12 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar name={posterName} photoUrl={job.posterPhotoUrl} size="sm" />
          <div className="min-w-0">
            <span className="admin-card-title block truncate">{posterName}</span>
            <span className="admin-card-meta block truncate">
              {formatRoleLabel(posterRole)}
            </span>
          </div>
        </div>
      </div>
      {showIssue ? (
        <div className="mt-4 rounded-[8px] border border-[var(--joballa-warning-border)] bg-[var(--joballa-warning-bg)] px-3 py-2">
          <p className="line-clamp-3 text-sm font-semibold leading-5 text-[var(--joballa-warning-fg)]">
            {t("common.reason")}: {issue}
          </p>
        </div>
      ) : null}
    </article>
  );
}
