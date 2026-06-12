import type { AdminPermission } from "@/lib/api/types";

export type RouteRule = {
  prefix: string;
  permission?: AdminPermission;
  permissions?: AdminPermission[];
  superAdminOnly?: boolean;
  public?: boolean;
};

export const ADMIN_ROUTE_RULES: RouteRule[] = [
  { prefix: "/admin/login", public: true },
  { prefix: "/admin/kyc", permission: "verify_kyc" },
  { prefix: "/admin/documents", permission: "verify_documents" },
  { prefix: "/admin/jobs", permission: "verify_jobs" },
  { prefix: "/admin/rejected-jobs", permission: "manage_jobs" },
  { prefix: "/admin/verified-jobs", permission: "manage_jobs" },
  { prefix: "/admin/reports", permission: "resolve_disputes" },
  { prefix: "/admin/disputes", permission: "resolve_disputes" },
  { prefix: "/admin/departments", permission: "manage_departments" },
  { prefix: "/admin/admins", permission: "manage_admins" },
  { prefix: "/admin/permissions", permission: "manage_admins" },
  { prefix: "/admin/users", permission: "manage_platform_users" },
  { prefix: "/admin/profiles", permission: "create_profiles" },
  { prefix: "/admin/financial-records", permission: "view_financial_records" },
  { prefix: "/admin/platform-logs", permission: "view_platform_logs" },
  { prefix: "/admin" },
];

export function getRouteRule(pathname: string): RouteRule | undefined {
  const sorted = [...ADMIN_ROUTE_RULES].sort((a, b) => b.prefix.length - a.prefix.length);
  return sorted.find((rule) => pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`));
}

export function isPublicAdminRoute(pathname: string): boolean {
  return getRouteRule(pathname)?.public === true;
}

export function isProtectedAdminRoute(pathname: string): boolean {
  if (!pathname.startsWith("/admin")) return false;
  return !isPublicAdminRoute(pathname);
}
