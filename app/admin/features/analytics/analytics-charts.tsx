"use client";

import { formatCurrency, formatStatusLabel } from "@/lib/api/format";

export type ChartItem = {
  label: string;
  value: number;
  display?: string;
  color?: string;
};

const CHART_COLORS = [
  "var(--joballa-primary)",
  "var(--joballa-info-fg)",
  "var(--joballa-warning-fg)",
  "var(--joballa-violet-fg)",
  "var(--joballa-danger-fg)",
  "var(--joballa-success-fg)",
];

export function parseMetricValue(value: string | number): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const normalized = String(value).replace(/,/g, "").trim();
  const match = normalized.match(/([\d.]+)\s*([kKmM])?/);
  if (!match) return null;
  let num = Number(match[1]);
  if (Number.isNaN(num)) return null;
  const suffix = match[2]?.toUpperCase();
  if (suffix === "K") num *= 1_000;
  if (suffix === "M") num *= 1_000_000;
  return num;
}

export function BarChart({ items, emptyLabel = "No data" }: { items: ChartItem[]; emptyLabel?: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-[var(--joballa-muted)]">{emptyLabel}</p>;
  }

  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={item.label}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold">{item.label}</span>
            <span className="shrink-0 font-semibold text-[var(--joballa-muted)]">
              {item.display ?? item.value.toLocaleString()}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-[var(--joballa-input-bg)]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max((item.value / max) * 100, item.value > 0 ? 4 : 0)}%`,
                backgroundColor: item.color ?? CHART_COLORS[index % CHART_COLORS.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DonutChart({
  items,
  centerLabel,
  centerValue,
}: {
  items: ChartItem[];
  centerLabel: string;
  centerValue: string;
}) {
  if (items.length === 0) {
    return null;
  }

  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  const segments = items.map((item, index) => {
    const pct = (item.value / total) * 100;
    const start = items.slice(0, index).reduce((sum, previous) => sum + (previous.value / total) * 100, 0);
    return `${item.color ?? CHART_COLORS[index % CHART_COLORS.length]} ${start}% ${start + pct}%`;
  });

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div
        className="relative grid h-44 w-44 shrink-0 place-items-center rounded-full"
        style={{
          background: `conic-gradient(${segments.join(", ")})`,
        }}
      >
        <div className="grid h-[68%] w-[68%] place-items-center rounded-full border border-[var(--joballa-border)] bg-[var(--joballa-card)] px-2 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--joballa-muted)]">
            {centerLabel}
          </p>
          <p className="mt-1 text-sm font-bold leading-tight">{centerValue}</p>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color ?? CHART_COLORS[index % CHART_COLORS.length] }}
              />
              <span className="truncate font-semibold">{item.label}</span>
            </span>
            <span className="shrink-0 font-semibold text-[var(--joballa-muted)]">
              {item.display ?? `${Math.round((item.value / total) * 100)}%`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function earningsChartItems(
  rows: Array<{ status: string; totalAmount: number; count: number }>,
  mode: "amount" | "count"
): ChartItem[] {
  return rows
    .filter((row) => (mode === "amount" ? row.totalAmount : row.count) > 0)
    .map((row, index) => {
      const value = mode === "amount" ? row.totalAmount : row.count;
      return {
        label: formatStatusLabel(row.status.toLowerCase()),
        value,
        display: mode === "amount" ? formatCurrency(value) : value.toLocaleString(),
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
    });
}
