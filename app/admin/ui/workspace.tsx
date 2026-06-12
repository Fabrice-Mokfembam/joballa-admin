"use client";

import type { LucideIcon } from "lucide-react";
import { CalendarDays, Search } from "lucide-react";
import { INPUT_MAX_LENGTH } from "@/lib/constants/input-limits";

export function SummaryCards({
  items,
}: {
  items: Array<{
    label: string;
    value: number | string;
    note?: string;
    icon: LucideIcon;
    tone?: "jade" | "blue" | "amber" | "red" | "violet";
    valueClassName?: string;
  }>;
}) {
  const tones = {
    jade: "bg-[var(--joballa-success-bg)] text-[var(--joballa-success-fg)]",
    blue: "bg-[var(--joballa-info-bg)] text-[var(--joballa-info-fg)]",
    amber: "bg-[var(--joballa-warning-bg)] text-[var(--joballa-warning-fg)]",
    red: "bg-[var(--joballa-danger-bg)] text-[var(--joballa-danger-fg)]",
    violet: "bg-[var(--joballa-violet-bg)] text-[var(--joballa-violet-fg)]",
  };

  return (
    <section className="mb-6 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article key={item.label} className="flex min-h-28 min-w-0 items-center gap-3 rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-3 sm:gap-4 sm:p-4">
          <span className={["grid h-10 w-10 shrink-0 place-items-center rounded-full sm:h-12 sm:w-12", tones[item.tone ?? "jade"]].join(" ")}>
            <item.icon size={21} />
          </span>
          <div className="min-w-0">
            <p className="admin-card-eyebrow">{item.label}</p>
            <p
              className={[
                "mt-1 break-words font-bold tracking-tight text-[var(--joballa-fg)]",
                item.valueClassName ?? "text-3xl",
              ].join(" ")}
            >
              {item.value}
            </p>
          </div>
        </article>
      ))}
    </section>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
  maxLength = INPUT_MAX_LENGTH.search,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength?: number;
}) {
  return (
    <label className="flex min-h-12 min-w-0 w-full flex-1 items-center gap-3 rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-4 sm:min-w-[240px]">
      <Search size={18} className="shrink-0 text-[var(--joballa-muted)]" />
      <input
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--joballa-muted)]"
        placeholder={placeholder}
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label={label}
      className="min-h-12 min-w-0 w-full flex-1 rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 text-sm font-semibold text-[var(--joballa-fg)] outline-none sm:w-auto sm:flex-none"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => <option key={option}>{option}</option>)}
    </select>
  );
}

export function DateField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex min-h-12 w-full items-center gap-2 rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 sm:w-auto">
      <CalendarDays size={17} className="text-[var(--joballa-muted)]" />
      <input
        aria-label="Filter by submitted date"
        type="date"
        className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[var(--joballa-fg)] outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
