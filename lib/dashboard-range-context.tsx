"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { DashboardAnalyticsRange } from "@/lib/api/types";

export const DASHBOARD_RANGE_OPTIONS: Array<{ value: DashboardAnalyticsRange; label: string }> = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "1y", label: "Last year" },
];

type DashboardRangeContextValue = {
  range: DashboardAnalyticsRange;
  setRange: (range: DashboardAnalyticsRange) => void;
};

const DashboardRangeContext = createContext<DashboardRangeContextValue | null>(null);

export function DashboardRangeProvider({ children }: { children: React.ReactNode }) {
  const [range, setRange] = useState<DashboardAnalyticsRange>("30d");
  const value = useMemo(() => ({ range, setRange }), [range]);

  return <DashboardRangeContext.Provider value={value}>{children}</DashboardRangeContext.Provider>;
}

export function useDashboardRange() {
  const context = useContext(DashboardRangeContext);
  if (!context) {
    throw new Error("useDashboardRange must be used within DashboardRangeProvider");
  }
  return context;
}
