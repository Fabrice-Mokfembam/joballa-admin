"use client";

import { X } from "lucide-react";
import { formatJobDepartment, formatJobPosterName, formatJobStatusLabel } from "@/lib/api/format";
import type { JobDetail, JobListItem } from "@/lib/api/types";
import { EM_DASH, MIDDLE_DOT } from "@/lib/constants";
import { MoreMenu } from "../../ui";

export function JobDetailPanel({
  job,
  detail,
  detailLoading,
  onClose,
  menuItems,
  primaryActions,
}: {
  job: JobListItem;
  detail: JobDetail | null;
  detailLoading: boolean;
  onClose: () => void;
  menuItems?: Array<{ label: string; tone?: "danger"; onClick: () => void | Promise<boolean | null> }>;
  primaryActions?: React.ReactNode;
}) {
  const posterName = formatJobPosterName(job.client, job.department);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-0 min-[600px]:px-6 min-[600px]:py-8 xl:static xl:z-auto xl:block xl:bg-transparent xl:p-0"
      onClick={onClose}
    >
      <aside
        className="h-full w-full overflow-y-auto rounded-none border border-[var(--joballa-border)] bg-[var(--joballa-page-tint)] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.28)] min-[600px]:h-[min(88vh,900px)] min-[600px]:max-w-[760px] min-[600px]:rounded-[20px] xl:sticky xl:top-5 xl:h-fit xl:max-h-[calc(100dvh-6.5rem)] xl:max-w-none xl:shadow-none"
        onClick={(event) => event.stopPropagation()}
      >
        {detailLoading && !detail ? (
          <div className="grid min-h-[320px] place-items-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--joballa-border)] border-t-[var(--joballa-primary)]" />
          </div>
        ) : (
          <>
            <section className="rounded-[16px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5">
              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  aria-label="Close job details"
                  className="grid h-10 w-10 place-items-center rounded-full border border-[var(--joballa-border)] text-[var(--joballa-muted)] hover:text-[var(--joballa-fg)]"
                  onClick={onClose}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex justify-between gap-4">
                <div>
                  <p className="text-3xl font-bold text-[var(--joballa-primary)]">{job.pay}</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--joballa-muted)]">
                    {detail?.type ?? EM_DASH} {MIDDLE_DOT} {detail?.cadence ?? EM_DASH}
                  </p>
                </div>
                {menuItems && menuItems.length > 0 ? (
                  <MoreMenu label="Job details actions" items={menuItems} />
                ) : null}
              </div>

              <h3 className="mt-8 text-2xl font-bold">{job.title}</h3>
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-[var(--joballa-muted)]">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--joballa-neutral-avatar-bg)] text-[var(--joballa-neutral-avatar-fg)]">
                  {posterName.charAt(0).toUpperCase()}
                </span>
                {posterName}
              </div>
              <p className="mt-1 text-xs font-semibold text-[var(--joballa-muted)]">
                Department: {formatJobDepartment(job.department)}
              </p>

              <p className="mt-3 inline-flex rounded-full border border-[var(--joballa-border)] bg-[var(--joballa-tag-bg)] px-3 py-1 text-sm font-semibold text-[var(--joballa-tag-fg)]">
                {formatJobStatusLabel(job.status)}
              </p>

              {primaryActions ? <div className="mt-6 grid gap-3 sm:grid-cols-2">{primaryActions}</div> : null}

              <dl className="mt-6 space-y-3 text-sm">
                {[
                  ["Job state", formatJobStatusLabel(job.status)],
                  ["Job type", detail?.type ?? EM_DASH],
                  ["Location", job.location],
                  ["Start date", detail?.startDate ?? EM_DASH],
                  ["Duration", detail?.duration ?? EM_DASH],
                  ["Applications", String(job.applications)],
                  ["Posted by", posterName],
                  ["Department", formatJobDepartment(job.department)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-6">
                    <dt className="font-bold">{label}</dt>
                    <dd className="text-right font-semibold text-[var(--joballa-muted)]">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {detail?.about ? (
              <section className="mt-4 rounded-[16px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5">
                <h3 className="font-bold">About this role</h3>
                <p className="mt-4 text-sm leading-6 text-[var(--joballa-muted)]">{detail.about}</p>
                {detail.requirements && detail.requirements.length > 0 ? (
                  <>
                    <h3 className="mt-8 font-bold">Requirements</h3>
                    <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--joballa-muted)]">
                      {detail.requirements.map((requirement) => (
                        <li key={requirement}>{requirement}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </section>
            ) : null}

            {detail?.moderationNotes ? (
              <section className="mt-4 rounded-[16px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5">
                <h3 className="font-bold">Moderation notes</h3>
                <p className="mt-4 text-sm leading-6 text-[var(--joballa-muted)]">{detail.moderationNotes}</p>
              </section>
            ) : null}
          </>
        )}
      </aside>
    </div>
  );
}
