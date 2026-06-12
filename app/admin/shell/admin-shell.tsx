"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  BriefcaseBusiness,
  Check,
  CircleSlash,
  Clock3,
  Contact,
  FileText,
  FileUser,
  Gavel,
  Grid2X2,
  Lock,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Shield,
  Sun,
  Wallet,
  X,
} from "lucide-react";
import { dashboardApi, reportsApi } from "@/lib/api/admin";
import { emitAdminRefresh } from "@/lib/admin-refresh";
import { INPUT_MAX_LENGTH } from "@/lib/constants/input-limits";
import { getInitials } from "@/lib/api/format";
import { useAuth } from "@/lib/auth/auth-context";
import { useAdminAction } from "@/lib/hooks/use-admin-action";
import { AuthLoadingScreen } from "@/lib/auth/auth-loading-screen";
import { LoadingButton } from "../ui/states";
import { useClickAway } from "../ui/use-click-away";
import { getPageTitleKey, useTranslation } from "@/lib/i18n";
import { getSavedTheme, applyJoballaTheme } from "./utils";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, bootstrapping, logout, hasPermission, updateMe } = useAuth();
  const { t, locale, setLocale } = useTranslation();
  const { perform } = useAdminAction();
  const [sidebarCounts, setSidebarCounts] = useState({ kyc: 0, documents: 0, jobs: 0, reports: 0 });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem("joballa-sidebar-collapsed") === "true"
  );
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [accountForm, setAccountForm] = useState({ name: "", currentPassword: "", newPassword: "" });
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => getSavedTheme());
  const accountRef = useClickAway<HTMLDivElement>(() => setIsAccountOpen(false));
  const pathname = usePathname();
  const pageTitle = t(getPageTitleKey(pathname));
  const accountName = user?.name ?? "Admin";
  const accountEmail = user?.email ?? "";
  const accountInitials = getInitials(accountName);
  const hasAnyPermission = (...permissions: Parameters<typeof hasPermission>[0][]) =>
    permissions.some((permission) => hasPermission(permission));

  const navGroups = [
    {
      labelKey: "nav.overview" as const,
      items: [
        { href: "/admin", labelKey: "nav.dashboard" as const, icon: Grid2X2 },
        ...(hasPermission("view_platform_logs")
          ? [{ href: "/admin/platform-logs", labelKey: "nav.logs" as const, icon: FileText }]
          : []),
      ],
    },
    ...(hasAnyPermission("verify_jobs", "manage_jobs")
      ? [
          {
            labelKey: "nav.jobs" as const,
            items: [
              ...(hasAnyPermission("verify_jobs", "manage_jobs")
                ? [{ href: "/admin/jobs", labelKey: "nav.pending" as const, icon: Clock3, badge: sidebarCounts.jobs }]
                : []),
              ...(hasPermission("manage_jobs")
                ? [{ href: "/admin/verified-jobs", labelKey: "nav.verified" as const, icon: Check }]
                : []),
              ...(hasAnyPermission("verify_jobs", "manage_jobs")
                ? [{ href: "/admin/rejected-jobs", labelKey: "nav.rejected" as const, icon: CircleSlash }]
                : []),
            ],
          },
        ]
      : []),
    ...(hasAnyPermission("manage_platform_users", "create_profiles")
      ? [
          {
            labelKey: "nav.accounts" as const,
            items: [
              ...(hasPermission("manage_platform_users") ? [{ href: "/admin/users", labelKey: "nav.users" as const, icon: Contact }] : []),
              ...(hasPermission("create_profiles")
                ? [{ href: "/admin/profiles", labelKey: "nav.profiles" as const, icon: FileUser }]
                : []),
            ],
          },
        ]
      : []),
    ...(hasAnyPermission("verify_kyc", "verify_documents")
      ? [
          {
            labelKey: "nav.reviews" as const,
            items: [
              ...(hasPermission("verify_kyc")
                ? [{ href: "/admin/kyc", labelKey: "nav.kyc" as const, icon: Contact, badge: sidebarCounts.kyc }]
                : []),
              ...(hasPermission("verify_documents")
                ? [{ href: "/admin/documents", labelKey: "nav.documents" as const, icon: FileUser, badge: sidebarCounts.documents }]
                : []),
            ],
          },
        ]
      : []),
    ...(hasAnyPermission("manage_departments", "resolve_disputes")
      ? [
          {
            labelKey: "nav.management" as const,
            items: [
              ...(hasPermission("manage_departments")
                ? [{ href: "/admin/departments", labelKey: "nav.departments" as const, icon: Building2 }]
                : []),
              ...(hasPermission("resolve_disputes")
                ? [{ href: "/admin/reports", labelKey: "nav.disputes" as const, icon: Gavel, badge: sidebarCounts.reports }]
                : []),
            ],
          },
        ]
      : []),
    ...(hasPermission("view_financial_records")
      ? [
          {
            labelKey: "nav.finance" as const,
            items: [{ href: "/admin/financial-records", labelKey: "nav.financialRecords" as const, icon: Wallet }],
          },
        ]
      : []),
    ...(hasPermission("manage_admins")
      ? [
          {
            labelKey: "nav.administration" as const,
              items: [
                { href: "/admin/admins", labelKey: "nav.admins" as const, icon: Shield },
                { href: "/admin/permissions", labelKey: "nav.permissions" as const, icon: Lock },
              ],
          },
        ]
      : []),
  ];

  useEffect(() => {
    if (!user) return;
    dashboardApi
      .get()
      .then((data) => {
        setSidebarCounts({
          kyc: data.kyc?.pendingKyc ?? 0,
          documents: data.documents?.pendingDocuments ?? 0,
          jobs: data.jobs?.pendingJobs ?? 0,
          reports: 0,
        });
      })
      .catch(() => undefined);
    reportsApi
      .list({ status: "open", limit: 1 })
      .then((data) => setSidebarCounts((prev) => ({ ...prev, reports: data.total })))
      .catch(() => undefined);
  }, [user]);

  useEffect(() => {
    applyJoballaTheme(theme);
  }, [theme]);

  function applyTheme(nextTheme: "light" | "dark") {
    setTheme(nextTheme);
    applyJoballaTheme(nextTheme);
    window.localStorage.setItem("joballa-theme", nextTheme);
  }

  function toggleSidebarCollapsed() {
    setIsSidebarCollapsed((value) => {
      const nextValue = !value;
      window.localStorage.setItem("joballa-sidebar-collapsed", String(nextValue));
      return nextValue;
    });
  }

  if (pathname.startsWith("/admin/login")) {
    return <>{children}</>;
  }

  if (bootstrapping) {
    return <AuthLoadingScreen />;
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
    setIsLogoutOpen(false);
  }

  async function handleAccountUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = {
      name: accountForm.name.trim() || undefined,
      currentPassword: accountForm.currentPassword || undefined,
      newPassword: accountForm.newPassword || undefined,
    };
    if (!body.name && !body.newPassword) return;
    setIsSavingAccount(true);
    try {
      await perform(() => updateMe(body), {
        success: "Account updated",
        onSuccess: () => {
          setIsAccountSettingsOpen(false);
          setAccountForm({ name: "", currentPassword: "", newPassword: "" });
        },
      });
    } finally {
      setIsSavingAccount(false);
    }
  }

  return (
    <div className="h-[100dvh] overflow-hidden bg-[var(--joballa-page)] text-[var(--joballa-fg)]">
      {isSidebarOpen ? (
        <button
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      ) : null}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex w-[280px] min-h-0 flex-col border-r border-[var(--joballa-border)] bg-[var(--joballa-sidebar)] px-5 py-5 transition-[transform,width,padding] lg:translate-x-0",
          isSidebarCollapsed ? "lg:w-[88px] lg:px-4" : "lg:w-[250px]",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <button
          aria-label="Close sidebar"
          className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-[8px] border border-[var(--joballa-border)] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        >
          <X size={18} />
        </button>

        <div className="joballa-sidebar-scroll min-h-0 flex-1 overflow-y-auto">
          <div className={["flex items-center gap-2", isSidebarCollapsed ? "lg:justify-center" : "justify-between"].join(" ")}>
            <Link
              href="/admin"
              className={[
                "flex min-w-0 items-center gap-3",
                isSidebarCollapsed ? "lg:hidden" : "",
              ].join(" ")}
            >
              <Image src="/brand/joballa-panel-mark.png" alt="Joballa" width={34} height={34} className="rounded-[7px]" />
              <span className={["font-remixa text-xl font-bold", isSidebarCollapsed ? "lg:hidden" : ""].join(" ")}>
                joballa
              </span>
            </Link>
            <button
              type="button"
              aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden h-9 w-9 shrink-0 place-items-center rounded-[8px] text-[var(--joballa-muted)] transition hover:text-[var(--joballa-primary)] lg:grid"
              onClick={toggleSidebarCollapsed}
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>

          <nav className="mt-5 flex flex-col gap-4 pb-4">
          {navGroups.map((group, groupIndex) => (
            <section
              key={group.labelKey}
              className={isSidebarCollapsed && groupIndex > 0 ? "lg:border-t lg:border-[var(--joballa-border)] lg:pt-3" : ""}
            >
              <p
                className={[
                  "mb-1.5 px-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--joballa-muted)]",
                  isSidebarCollapsed ? "lg:sr-only" : "",
                ].join(" ")}
              >
                {t(group.labelKey)}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const isActive =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsSidebarOpen(false)}
                      className={[
                        "group/navitem relative flex items-center gap-3 rounded-[8px] px-3 py-2 text-[15px] font-medium transition-colors",
                        isActive
                          ? "bg-[var(--joballa-jade-3)] text-[var(--joballa-primary)]"
                          : "text-[var(--joballa-fg)] hover:bg-[var(--joballa-jade-3)] hover:text-[var(--joballa-primary)]",
                      ].join(" ")}
                      aria-current={isActive ? "page" : undefined}
                    >
                        <span className="grid h-6 w-6 place-items-center text-current">
                          <item.icon size={19} strokeWidth={1.9} />
                        </span>
                      <span className={["min-w-0 flex-1 truncate", isSidebarCollapsed ? "lg:hidden" : ""].join(" ")}>
                        {t(item.labelKey)}
                      </span>
                      {"badge" in item && item.badge ? (
                        <span
                          className={[
                            "grid min-w-5 place-items-center rounded-full bg-[var(--joballa-primary)] px-1.5 py-0 text-[9px] font-bold leading-4 text-white",
                            isSidebarCollapsed ? "lg:hidden" : "",
                          ].join(" ")}
                        >
                          {item.badge}
                        </span>
                      ) : null}
                      {isSidebarCollapsed ? (
                        <span className="pointer-events-none absolute bottom-0 left-1/2 z-50 hidden -translate-x-1/2 translate-y-[calc(100%+4px)] whitespace-nowrap rounded-[6px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] px-2 py-1 text-[10px] font-semibold text-[var(--joballa-fg)] opacity-0 shadow-[0_8px_24px_rgba(15,23,42,0.12)] transition-opacity lg:block lg:group-hover/navitem:opacity-100 lg:group-focus-visible/navitem:opacity-100">
                          {t(item.labelKey)}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
          </nav>
        </div>

        <div ref={accountRef} className="shrink-0 pt-3">
          {isAccountOpen ? (
            <div
              className={[
                "mb-3 rounded-[14px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.18)]",
                isSidebarCollapsed
                  ? "lg:fixed lg:bottom-5 lg:left-[96px] lg:z-50 lg:mb-0 lg:w-[320px]"
                  : "",
              ].join(" ")}
            >
              <button className="flex w-full items-center gap-3 text-left">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--joballa-primary)] text-xs font-bold text-white">
                  {accountInitials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{accountName}</span>
                  <span className="block truncate text-xs text-[var(--joballa-muted)]">{accountEmail}</span>
                </span>
              </button>
              <div className="my-4 h-px bg-[var(--joballa-border)]" />
              <label className="flex items-center justify-between gap-4 rounded-[8px] px-1 py-2.5">
                <span className="flex items-center gap-3 text-sm font-semibold">
                  {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
                  {t("common.light")}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={theme === "light"}
                  className={[
                    "relative h-7 w-12 rounded-full border transition",
                    theme === "light"
                      ? "border-[var(--joballa-primary)] bg-[var(--joballa-primary)]"
                      : "border-[var(--joballa-border)] bg-[var(--joballa-page-tint)]",
                  ].join(" ")}
                  onClick={() => applyTheme(theme === "light" ? "dark" : "light")}
                >
                  <span
                    className={[
                      "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-sm transition",
                      theme === "light" ? "left-6" : "left-1",
                    ].join(" ")}
                  />
                </button>
              </label>
              <label className="grid gap-2 rounded-[8px] px-1 py-2.5">
                <span className="text-sm font-semibold">{t("common.language")}</span>
                <select
                  aria-label={t("common.language")}
                  className="min-h-10 w-full rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 text-sm font-semibold text-[var(--joballa-fg)] outline-none"
                  value={locale}
                  onChange={(event) => setLocale(event.target.value as "en" | "fr")}
                >
                  <option value="en">{t("language.en")}</option>
                  <option value="fr">{t("language.fr")}</option>
                </select>
              </label>
              <button
                className="flex w-full items-center gap-3 rounded-[8px] px-1 py-2.5 text-left text-sm font-semibold text-[var(--joballa-danger-fg)] hover:bg-[var(--joballa-danger-bg)]"
                onClick={() => setIsLogoutOpen(true)}
              >
                <LogOut size={18} />
                {t("common.logout")}
              </button>
            </div>
          ) : null}

          <button
            className={[
              "flex w-full items-center gap-3 rounded-[10px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-3 text-left",
              isSidebarCollapsed ? "lg:justify-center lg:px-2" : "",
            ].join(" ")}
            onClick={() => setIsAccountOpen((value) => !value)}
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--joballa-primary)] text-xs font-bold text-white">
              {accountInitials}
            </span>
            <span className={["min-w-0 flex-1", isSidebarCollapsed ? "lg:hidden" : ""].join(" ")}>
              <span className="block truncate text-sm font-bold">{accountName}</span>
              <span className="block truncate text-xs text-[var(--joballa-muted)]">{accountEmail}</span>
            </span>
          </button>
        </div>
      </aside>

      {isAccountSettingsOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/55 px-4 py-4" onClick={() => setIsAccountSettingsOpen(false)}>
          <form
            className="w-full max-w-lg rounded-[12px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => void handleAccountUpdate(event)}
          >
            <h3 className="text-xl font-bold">{t("shell.accountSettings")}</h3>
            <p className="mt-1 text-sm text-[var(--joballa-muted)]">{t("shell.accountSettingsDescription")}</p>
            <label className="mt-5 grid gap-2 text-sm font-bold">
              {t("shell.displayName")}
              <input className="min-h-12 rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 font-normal outline-none" value={accountForm.name} maxLength={INPUT_MAX_LENGTH.name} onChange={(event) => setAccountForm((value) => ({ ...value, name: event.target.value }))} />
            </label>
            <label className="mt-4 grid gap-2 text-sm font-bold">
              {t("shell.currentPassword")}
              <input type="password" className="min-h-12 rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 font-normal outline-none" value={accountForm.currentPassword} maxLength={INPUT_MAX_LENGTH.password} onChange={(event) => setAccountForm((value) => ({ ...value, currentPassword: event.target.value }))} />
            </label>
            <label className="mt-4 grid gap-2 text-sm font-bold">
              {t("shell.newPassword")}
              <input type="password" minLength={8} maxLength={INPUT_MAX_LENGTH.password} className="min-h-12 rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 font-normal outline-none" value={accountForm.newPassword} onChange={(event) => setAccountForm((value) => ({ ...value, newPassword: event.target.value }))} />
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="rounded-full border border-[var(--joballa-border)] px-5 py-2.5 text-sm font-bold" disabled={isSavingAccount} onClick={() => setIsAccountSettingsOpen(false)}>{t("common.cancel")}</button>
              <LoadingButton type="submit" loading={isSavingAccount} loadingLabel={t("common.saving")} disabled={Boolean(accountForm.newPassword && !accountForm.currentPassword)}>{t("common.save")}</LoadingButton>
            </div>
          </form>
        </div>
      ) : null}

      {isLogoutOpen ? (
        <div
          aria-label="Close log out dialog"
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/55 px-4 py-4"
          onClick={() => setIsLogoutOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5 text-left shadow-[0_24px_70px_rgba(0,0,0,0.28)]"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="logout-dialog-title" className="text-xl font-bold">
              {t("shell.logoutTitle")}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--joballa-muted)]">
              {t("shell.logoutDescription")}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-full border border-[var(--joballa-border)] px-5 py-2.5 text-sm font-bold"
                onClick={() => setIsLogoutOpen(false)}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                disabled={isLoggingOut}
                className="rounded-full bg-[var(--joballa-danger-fg)] px-5 py-2.5 text-sm font-bold text-[var(--joballa-on-primary)] disabled:opacity-60"
                onClick={() => void handleLogout()}
              >
                {isLoggingOut ? t("shell.loggingOut") : t("common.logout")}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <main
        className={[
          "flex h-[100dvh] min-h-0 flex-col",
          isSidebarCollapsed ? "lg:pl-[88px]" : "lg:pl-[250px]",
        ].join(" ")}
      >
        <header className="z-10 flex min-h-20 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--joballa-border)] bg-[var(--joballa-header)] px-4 py-3 sm:px-5 lg:px-8">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {pathname === "/admin/admins" && hasPermission("manage_admins") ? (
              <button
                type="button"
                className="rounded-full bg-[var(--joballa-primary)] px-3 py-2.5 text-xs font-bold text-[var(--joballa-on-primary)] sm:px-4 sm:text-sm"
                onClick={() => window.dispatchEvent(new Event("admin:add-admin"))}
              >
                {t("shell.addAdmin")}
              </button>
            ) : null}
            {pathname === "/admin/departments" && hasPermission("manage_departments") ? (
              <button
                type="button"
                className="rounded-full bg-[var(--joballa-primary)] px-3 py-2.5 text-xs font-bold text-[var(--joballa-on-primary)] sm:px-4 sm:text-sm"
                onClick={() => window.dispatchEvent(new Event("admin:add-department"))}
              >
                {t("shell.addDepartment")}
              </button>
            ) : null}
            {pathname.startsWith("/admin/platform-logs") && hasPermission("audit_logs:read") ? (
              <button
                type="button"
                aria-label={t("shell.refreshLogs")}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--joballa-border)] bg-[var(--joballa-card)] px-3 py-2.5 text-xs font-bold text-[var(--joballa-fg)] transition hover:bg-[var(--joballa-page-tint)] sm:min-h-11 sm:px-4 sm:text-sm"
                onClick={() => emitAdminRefresh("audit-logs")}
              >
                <RefreshCw size={16} />
                {t("common.refresh")}
              </button>
            ) : null}
            {pathname === "/admin/profiles" && hasPermission("create_profiles") ? (
              <button
                type="button"
                className="rounded-full bg-[var(--joballa-primary)] px-3 py-2.5 text-xs font-bold text-[var(--joballa-on-primary)] sm:px-4 sm:text-sm"
                onClick={() => window.dispatchEvent(new Event("admin:add-profile"))}
              >
                {t("shell.addProfile")}
              </button>
            ) : null}
            <button
              aria-label={t("shell.openSidebar")}
              className="grid h-10 w-10 place-items-center rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
          </div>
        </header>
        <div className="joballa-sidebar-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="mx-auto w-full max-w-[1280px] px-4 py-5 sm:px-5 sm:py-6 lg:px-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
