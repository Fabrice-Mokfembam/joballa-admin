"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { DashboardAnalyticsRange } from "@/lib/api/types";
import type { TranslationKey } from "@/lib/i18n";

export const DASHBOARD_RANGE_OPTIONS: Array<{ value: DashboardAnalyticsRange; labelKey: TranslationKey }> = [
  { value: "7d", labelKey: "dashboard.range7d" },
  { value: "30d", labelKey: "dashboard.range30d" },
  { value: "90d", labelKey: "dashboard.range90d" },
  { value: "1y", labelKey: "dashboard.range1y" },
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
