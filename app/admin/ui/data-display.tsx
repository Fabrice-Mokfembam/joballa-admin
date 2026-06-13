"use client";

import { formatStatusLabelWithT } from "@/lib/i18n/use-translated-format";
import { useTranslation } from "@/lib/i18n";

const DANGER_STATUSES = new Set(["rejected", "flagged", "high", "suspended", "inactive", "closed", "escalated"]);
const WARNING_STATUSES = new Set([
  "pending",
  "pending_review",
  "under_review",
  "medium",
  "waiting_for_user",
  "resubmission_requested",
  "open",
  "in_review",
]);

export function StatusBadge({ value }: { value: string }) {
  const { t } = useTranslation();
  const normalized = value.toLowerCase().replace(/\s+/g, "_");
  const label = formatStatusLabelWithT(value, t);
  const danger = DANGER_STATUSES.has(normalized);
  const warning = WARNING_STATUSES.has(normalized);

  return (
    <span
      className={[
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
        danger
          ? "bg-[var(--joballa-danger-bg)] text-[var(--joballa-danger-fg)]"
          : warning
            ? "bg-[var(--joballa-warning-bg)] text-[var(--joballa-warning-fg)]"
            : "bg-[var(--joballa-jade-3)] text-[var(--joballa-primary)]",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

export function StatusFilterPills({
  statuses,
  value,
  onChange,
}: {
  statuses: string[];
  value: string;
  onChange: (status: string) => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {statuses.map((status) => (
        <button
          key={status}
          type="button"
          className={[
            "rounded-full border px-4 py-2 text-sm font-bold",
            value === status
              ? "border-[var(--joballa-primary)] bg-[var(--joballa-primary)] text-[var(--joballa-on-primary)]"
              : "border-[var(--joballa-border)] bg-[var(--joballa-card)] text-[var(--joballa-muted)]",
          ].join(" ")}
          onClick={() => onChange(status)}
        >
          {status}
        </button>
      ))}
    </div>
  );
}

export function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="admin-card-eyebrow">{label}</p>
      <p className="admin-card-value mt-1">{value}</p>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: string;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--joballa-muted)]">{description}</p>
      </div>
      {action ? (
        <button className="w-fit rounded-[8px] bg-[var(--joballa-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--joballa-on-primary)] shadow-sm">
          {action}
        </button>
      ) : null}
    </div>
  );
}

export function Filters({ placeholder = "Search by name, ID or department" }: { placeholder?: string }) {
  return (
    <div className="mb-5 flex flex-col gap-3 lg:flex-row">
      <div className="flex min-h-12 flex-1 items-center rounded-[12px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-4">
        <input
          className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--joballa-muted)]"
          placeholder={placeholder}
        />
      </div>
      {["Status", "Department", "Date"].map((filter) => (
        <button
          key={filter}
          className="min-h-12 rounded-[12px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] px-4 text-sm font-semibold text-[var(--joballa-muted)]"
        >
          {filter}
        </button>
      ))}
    </div>
  );
}

export function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<Array<React.ReactNode>>;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)]">
      <div className="grid gap-3 p-3 md:hidden">
        {rows.map((row, rowIndex) => (
          <article
            key={rowIndex}
            className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-4"
          >
            {row.map((cell, cellIndex) => (
              <div key={cellIndex} className="flex items-start justify-between gap-4 py-2 text-sm first:pt-0 last:pb-0">
                <span className="admin-card-eyebrow shrink-0">
                  {columns[cellIndex]}
                </span>
                <span className="admin-card-title min-w-0 text-right">{cell}</span>
              </div>
            ))}
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b border-[var(--joballa-border)] bg-[var(--joballa-page-tint)] text-xs uppercase tracking-[0.08em] text-[var(--joballa-muted)]">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-5 py-4 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b border-[var(--joballa-border)] last:border-0 hover:bg-[var(--joballa-row-hover)]">
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={[
                      "px-5 py-4 align-middle",
                      cellIndex === row.length - 1 ? "w-px whitespace-nowrap" : "",
                    ].join(" ")}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
