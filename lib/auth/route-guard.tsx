"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "./auth-context";
import { AuthLoadingScreen } from "./auth-loading-screen";
import { getRouteRule, isProtectedAdminRoute, isPublicAdminRoute } from "./route-config";

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { user, bootstrapping, error, refresh, hasPermission, isSuperAdmin } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = isPublicAdminRoute(pathname);
  const hasRouteAccess = useCallback((rule: NonNullable<ReturnType<typeof getRouteRule>>) => {
    if (rule.permission && !hasPermission(rule.permission)) return false;
    if (rule.permissions && !rule.permissions.some((permission) => hasPermission(permission))) return false;
    return true;
  }, [hasPermission]);

  useEffect(() => {
    if (bootstrapping) return;

    if (!user && !error && isProtectedAdminRoute(pathname)) {
      router.replace("/admin/login");
      return;
    }

    if (user && isLoginPage) {
      router.replace("/admin");
      return;
    }

    if (!user || isLoginPage) return;

    const rule = getRouteRule(pathname);
    if (!rule || rule.public) return;

    if (rule.superAdminOnly && !isSuperAdmin) {
      router.replace("/admin");
      return;
    }

    if (!hasRouteAccess(rule)) {
      router.replace("/admin");
    }
  }, [bootstrapping, error, user, pathname, router, hasRouteAccess, isSuperAdmin, isLoginPage]);

  if (bootstrapping) {
    return <AuthLoadingScreen />;
  }

  if (!user && isProtectedAdminRoute(pathname)) {
    if (error) {
      return (
        <div className="grid min-h-screen place-items-center bg-[var(--joballa-page)] px-5">
          <div className="max-w-md rounded-[12px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-8 text-center">
            <h2 className="text-xl font-bold">{t("common.sessionError")}</h2>
            <p className="mt-2 text-sm text-[var(--joballa-muted)]">{error}</p>
            <button
              className="mt-5 rounded-full bg-[var(--joballa-primary)] px-5 py-2.5 text-sm font-bold text-white"
              type="button"
              onClick={() => void refresh()}
            >
              {t("common.tryAgain")}
            </button>
          </div>
        </div>
      );
    }
    return <AuthLoadingScreen />;
  }

  if (user && isLoginPage) {
    return <AuthLoadingScreen />;
  }

  const rule = getRouteRule(pathname);

  if (user && rule?.superAdminOnly && !isSuperAdmin) {
    return <AuthLoadingScreen />;
  }

  if (user && rule && !hasRouteAccess(rule)) {
    return <AuthLoadingScreen />;
  }

  return <>{children}</>;
}
