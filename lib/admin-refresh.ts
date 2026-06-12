"use client";

import { useEffect } from "react";

export type AdminRefreshScope =
  | "users"
  | "departments"
  | "admins"
  | "kyc"
  | "documents"
  | "jobs"
  | "reports"
  | "audit-logs"
  | "dashboard";

export const ALL_ADMIN_REFRESH_SCOPES: AdminRefreshScope[] = [
  "users",
  "departments",
  "admins",
  "kyc",
  "documents",
  "jobs",
  "reports",
  "audit-logs",
  "dashboard",
];

const ADMIN_REFRESH_EVENT = "admin:refresh";

export function emitAdminRefresh(...scopes: AdminRefreshScope[]) {
  if (typeof window === "undefined") return;
  const resolved = scopes.length > 0 ? scopes : ALL_ADMIN_REFRESH_SCOPES;
  window.dispatchEvent(
    new CustomEvent<{ scopes: AdminRefreshScope[] }>(ADMIN_REFRESH_EVENT, {
      detail: { scopes: resolved },
    })
  );
}

/** Invalidate admin list views after a mutation; optionally refetch the current screen. */
export function refreshAfterAdminAction(
  localReload?: () => void,
  scopes: AdminRefreshScope[] = ALL_ADMIN_REFRESH_SCOPES
) {
  emitAdminRefresh(...scopes);
  localReload?.();
}

export function useAdminRefresh(scopes: AdminRefreshScope[], reload: () => void) {
  useEffect(() => {
    function handleRefresh(event: Event) {
      const detail = (event as CustomEvent<{ scopes: AdminRefreshScope[] }>).detail;
      if (!detail?.scopes?.some((scope) => scopes.includes(scope))) return;
      reload();
    }

    window.addEventListener(ADMIN_REFRESH_EVENT, handleRefresh);
    return () => window.removeEventListener(ADMIN_REFRESH_EVENT, handleRefresh);
  }, [scopes, reload]);
}
