"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { authApi } from "@/lib/api/admin";
import {
  clearTokens,
  getAccessToken,
  onSessionExpired,
  setTokens,
  tryRefreshSession,
} from "@/lib/api/client";
import { ApiError, formatApiError } from "@/lib/api/errors";
import type { AdminMe, AdminPermission } from "@/lib/api/types";
import { isPublicAdminRoute, isProtectedAdminRoute } from "./route-config";

const PERMISSION_ALIASES: Partial<Record<AdminPermission, AdminPermission[]>> = {
  "audit_logs:read": ["view_platform_logs"],
  "analytics:read": ["view_platform_analytics"],
  "admins:manage": ["manage_admins"],
  "jobs:manage": ["manage_jobs"],
  "jobs:moderate": ["verify_jobs", "manage_jobs"],
  "jobs:verify": ["verify_jobs"],
  "users:read": ["manage_platform_users"],
  "users:manage": ["manage_platform_users"],
  "departments:manage": ["manage_departments"],
  "departments:read": ["manage_departments"],
  "reports:read": ["resolve_disputes"],
  "reports:resolve": ["resolve_disputes"],
  "documents:read": ["verify_documents"],
  "documents:review": ["verify_documents"],
  "kyc:read": ["verify_kyc"],
  "kyc:review": ["verify_kyc"],
  "profiles:read": ["create_profiles"],
  "profiles:create": ["create_profiles"],
  "profiles:manage": ["create_profiles"],
  "finance:read": ["view_financial_records"],
};

function hasEffectivePermission(permissions: AdminPermission[], permission: AdminPermission) {
  return permissions.includes(permission) || (PERMISSION_ALIASES[permission] ?? []).some((alias) => permissions.includes(alias));
}

type AuthContextValue = {
  user: AdminMe | null;
  bootstrapping: boolean;
  error: string | null;
  login: (identifier: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateMe: (body: { name?: string; currentPassword?: string; newPassword?: string }) => Promise<void>;
  hasPermission: (permission: AdminPermission) => boolean;
  isSuperAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminMe | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sessionEpoch = useRef(0);
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  const clearSession = useCallback((message?: string) => {
    clearTokens();
    setUser(null);
    if (message) {
      setError(message);
    }
  }, []);

  const loadUserFromToken = useCallback(async (epoch: number, options?: { skipSessionExpired?: boolean }) => {
    const me = await authApi.me(options);
    if (epoch !== sessionEpoch.current) return false;
    setUser(me);
    setError(null);
    return true;
  }, []);

  const ensureAccessToken = useCallback(async (options?: { skipSessionExpired?: boolean }) => {
    if (getAccessToken()) return true;
    const refreshed = await tryRefreshSession(options);
    return refreshed !== null;
  }, []);

  const bootstrapSession = useCallback(async () => {
    const epoch = ++sessionEpoch.current;
    setBootstrapping(true);
    setError(null);

    try {
      const hasSession = await ensureAccessToken({ skipSessionExpired: true });
      if (epoch !== sessionEpoch.current) return;

      if (!hasSession) {
        setUser(null);
        return;
      }

      await loadUserFromToken(epoch, { skipSessionExpired: true });
    } catch (err) {
      if (epoch !== sessionEpoch.current) return;
      if (err instanceof ApiError && err.statusCode === 401) {
        clearSession();
      } else {
        setError(formatApiError(err));
      }
    } finally {
      if (epoch === sessionEpoch.current) {
        setBootstrapping(false);
      }
    }
  }, [clearSession, ensureAccessToken, loadUserFromToken]);

  const refreshSession = useCallback(async () => {
    const epoch = ++sessionEpoch.current;
    setError(null);

    try {
      const hasSession = await ensureAccessToken();
      if (epoch !== sessionEpoch.current) return;

      if (!hasSession) {
        clearSession("Session expired. Please sign in again.");
        return;
      }

      await loadUserFromToken(epoch);
    } catch (err) {
      if (epoch !== sessionEpoch.current) return;
      if (err instanceof ApiError && err.statusCode === 401) {
        clearSession(formatApiError(err));
      } else {
        setError(formatApiError(err));
      }
    }
  }, [clearSession, ensureAccessToken, loadUserFromToken]);

  useEffect(() => {
    queueMicrotask(() => void bootstrapSession());
  }, [bootstrapSession]);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    return onSessionExpired(() => {
      if (isPublicAdminRoute(pathnameRef.current)) return;

      sessionEpoch.current += 1;
      clearSession("Session expired. Please sign in again.");

      if (isProtectedAdminRoute(pathnameRef.current)) {
        router.replace("/admin/login");
      }
    });
  }, [clearSession, router]);

  const login = useCallback(async (identifier: string, password: string) => {
    sessionEpoch.current += 1;
    setError(null);

    try {
      clearTokens();
      const result = await authApi.login(identifier, password);
      setTokens(result.accessToken, result.refreshToken);
      setUser(result.session);
      return true;
    } catch (err) {
      clearSession();
      setError(formatApiError(err));
      return false;
    }
  }, [clearSession]);

  const logout = useCallback(async () => {
    sessionEpoch.current += 1;
    try {
      await authApi.logout();
    } catch {
      // Clear local session even if API call fails
    }
    clearSession();
    router.replace("/admin/login");
  }, [clearSession, router]);

  const updateMe = useCallback(async (body: { name?: string; currentPassword?: string; newPassword?: string }) => {
    const session = await authApi.updateMe(body);
    setUser(session);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      bootstrapping,
      error,
      login,
      logout,
      refresh: refreshSession,
      updateMe,
      hasPermission: (permission) =>
        user?.role === "super_admin" || (user ? hasEffectivePermission(user.permissions, permission) : false),
      isSuperAdmin: user?.role === "super_admin",
    }),
    [user, bootstrapping, error, login, logout, refreshSession, updateMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
