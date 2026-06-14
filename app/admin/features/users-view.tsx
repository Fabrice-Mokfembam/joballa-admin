"use client";

import { useState } from "react";
import { CalendarDays, Mail } from "lucide-react";
import { usersApi } from "@/lib/api/admin";
import { EM_DASH } from "@/lib/constants";
import { useTranslation } from "@/lib/i18n";
import { useTranslatedFormat } from "@/lib/i18n/use-translated-format";
import type { PlatformUser } from "@/lib/api/types";
import { emitAdminRefresh, useAdminRefresh } from "@/lib/admin-refresh";
import { useAuth } from "@/lib/auth/auth-context";
import { useAdminAction } from "@/lib/hooks/use-admin-action";
import { isAsyncRefreshing, isInitialAsyncLoad, useAsyncData, useMutation } from "@/lib/hooks/use-async";
import {
  DataTable,
  FilterSelect,
  MoreMenu,
  PaginationBar,
  SearchField,
  StatusBadge,
  StatusFilterPills,
  UserAvatar,
  ViewToggle,
} from "../ui";
import { DataTableSkeleton, ProfileCardGridSkeleton } from "../ui/skeletons";
import { AccessDeniedState, EmptyState, ErrorState } from "../ui/states";
import { UserDetailPanel, type UserDetailFields } from "./user-detail-panel";

const USERS_VIEW_STORAGE_KEY = "admin:users:view";

function readStoredUsersView(): "cards" | "table" {
  if (typeof window === "undefined") return "table";
  const stored = window.localStorage.getItem(USERS_VIEW_STORAGE_KEY);
  return stored === "cards" || stored === "table" ? stored : "table";
}

const ROLE_FILTER_KEYS = ["common.all", "common.worker", "common.employer"] as const;
const ROLE_FILTER_VALUES = ["All", "Worker", "Employer"] as const;
const STATUS_FILTER_KEYS = ["common.all", "common.active", "common.suspended"] as const;
const STATUS_FILTER_VALUES = ["All", "Active", "Suspended"] as const;

function formatUserDate(value?: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });
}

function userToDetailFields(
  user: PlatformUser,
  t: (key: string, vars?: Record<string, string>) => string,
  formatRoleLabel: (role: string) => string,
): UserDetailFields {
  const isActive = user.status.toLowerCase() === "active";
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    phone: user.phone,
    photoUrl: user.photoUrl,
    headline: formatRoleLabel(user.role),
    badges: [
      {
        label: isActive ? t("common.active") : t("common.suspended"),
        className: isActive
          ? "bg-[var(--joballa-jade-3)] text-[var(--joballa-primary)]"
          : "bg-[var(--joballa-danger-bg)] text-[var(--joballa-danger-fg)]",
      },
    ],
    sections: [
      formatUserDate(user.joinedAt)
        ? { title: t("users.joined"), content: formatUserDate(user.joinedAt) ?? "" }
        : null,
      formatUserDate(user.lastActivityAt)
        ? { title: t("users.lastActivity"), content: formatUserDate(user.lastActivityAt) ?? "" }
        : null,
    ].filter((section): section is { title: string; content: string } => section !== null),
  };
}

export function UsersView() {
  const { t } = useTranslation();
  const { formatRoleLabel } = useTranslatedFormat();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("users:manage");
  const canRead = hasPermission("users:read");
  const { perform } = useAdminAction();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<(typeof ROLE_FILTER_VALUES)[number]>("All");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTER_VALUES)[number]>("All");
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "table">(readStoredUsersView);
  const PAGE_SIZE = 20;

  function handleViewModeChange(next: "cards" | "table") {
    setViewMode(next);
    window.localStorage.setItem(USERS_VIEW_STORAGE_KEY, next);
    setSelectedUserId(null);
  }

  const tableColumns = [
    t("common.name"),
    t("common.role"),
    t("common.status"),
    t("users.joined"),
    t("common.actions"),
  ] as const;

  const { data, loading, error, reload } = useAsyncData(
    async () =>
      usersApi.list({
        page,
        limit: PAGE_SIZE,
        search: searchQuery.trim() || undefined,
        role:
          roleFilter === "Worker"
            ? "worker"
            : roleFilter === "Employer"
              ? "employer"
              : undefined,
        isActive:
          statusFilter === "Active" ? "true" : statusFilter === "Suspended" ? "false" : undefined,
      }),
    [page, searchQuery, roleFilter, statusFilter],
    { cacheKey: `users:list:${page}:${roleFilter}:${statusFilter}:${searchQuery.trim()}` }
  );

  useAdminRefresh(["users"], reload);

  const { mutate: deleteUser } = useMutation((id: string) => usersApi.delete(id));
  const { mutate: suspendUser } = useMutation((id: string) => usersApi.suspend(id));
  const { mutate: reactivateUser } = useMutation((id: string) => usersApi.reactivate(id));

  const isInitialLoad = isInitialAsyncLoad(loading, data);
  const isRefreshing = isAsyncRefreshing(loading, data);

  if (!canRead) {
    return <AccessDeniedState description={t("users.accessDenied")} />;
  }

  const users = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const visibleUsers = users;
  const workerCount = users.filter((user) => user.role === "worker").length;
  const employerCount = users.filter((user) => user.role === "employer").length;
  const selectedUser = visibleUsers.find((user) => user.id === selectedUserId) ?? null;

  async function refreshUsersAndDepartments() {
    emitAdminRefresh("users", "departments");
    reload();
  }

  function getUserActions(user: PlatformUser) {
    if (!canManage) return [];
    return [
      ...(user.status === "active"
        ? [
            {
              label: t("users.suspend"),
              onClick: async () =>
                perform(() => suspendUser(user.id), {
                  success: t("users.suspendedSuccess"),
                  onSuccess: refreshUsersAndDepartments,
                }),
            },
          ]
        : [
            {
              label: t("users.reactivate"),
              onClick: async () =>
                perform(() => reactivateUser(user.id), {
                  success: t("users.reactivatedSuccess"),
                  onSuccess: refreshUsersAndDepartments,
                }),
            },
          ]),
      {
        label: t("users.delete"),
        tone: "danger" as const,
        onClick: async () =>
          perform(() => deleteUser(user.id), {
            success: t("users.deletedSuccess"),
            onSuccess: () => {
              if (selectedUserId === user.id) setSelectedUserId(null);
              refreshUsersAndDepartments();
            },
          }),
      },
    ];
  }

  if (isInitialLoad) {
    return (
      <section>
        <div className="mb-6 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <article
              key={index}
              className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-4 sm:p-5"
            >
              <div className="h-4 w-20 animate-pulse rounded bg-[var(--joballa-border)]" />
              <div className="mt-3 h-8 w-16 animate-pulse rounded bg-[var(--joballa-border)]" />
            </article>
          ))}
        </div>
        {viewMode === "table" ? (
          <DataTableSkeleton columns={[...tableColumns]} rows={8} />
        ) : (
          <ProfileCardGridSkeleton count={6} />
        )}
      </section>
    );
  }

  if (error && data === null) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  return (
    <section>
      {!canManage ? (
        <p className="mb-4 text-sm leading-6 text-[var(--joballa-muted)]">{t("users.viewOnly")}</p>
      ) : null}
      <div className="mb-6 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
        {[
          [t("users.workers"), workerCount],
          [t("users.employers"), employerCount],
        ].map(([label, value]) => (
          <article
            key={String(label)}
            className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-4 sm:p-5"
          >
            <p className="text-sm font-medium text-[var(--joballa-muted)]">{label}</p>
            <p className="mt-3 text-2xl font-bold sm:text-3xl">{value}</p>
          </article>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <SearchField
          value={searchQuery}
          onChange={(value) => {
            setSearchQuery(value);
            setPage(1);
            setSelectedUserId(null);
          }}
          placeholder={t("users.searchPlaceholder")}
        />
        <FilterSelect
          label={t("users.statusFilter")}
          value={t(STATUS_FILTER_KEYS[STATUS_FILTER_VALUES.indexOf(statusFilter)])}
          options={STATUS_FILTER_KEYS.map((key) => t(key))}
          onChange={(label) => {
            const index = STATUS_FILTER_KEYS.findIndex((key) => t(key) === label);
            if (index >= 0) setStatusFilter(STATUS_FILTER_VALUES[index]);
            setPage(1);
            setSelectedUserId(null);
          }}
        />
        <div className="ml-auto">
          <ViewToggle view={viewMode} setView={handleViewModeChange} />
        </div>
      </div>

      <StatusFilterPills
        statuses={ROLE_FILTER_KEYS.map((key) => t(key))}
        value={t(ROLE_FILTER_KEYS[ROLE_FILTER_VALUES.indexOf(roleFilter)])}
        onChange={(label) => {
          const index = ROLE_FILTER_KEYS.findIndex((key) => t(key) === label);
          if (index >= 0) setRoleFilter(ROLE_FILTER_VALUES[index]);
          setPage(1);
          setSelectedUserId(null);
        }}
      />

      {error ? (
        <p className="mb-4 rounded-[8px] border border-[var(--joballa-danger-border)] bg-[var(--joballa-danger-bg)] px-4 py-3 text-sm font-medium text-[var(--joballa-danger-fg)]">
          {error}
        </p>
      ) : null}

      <div
        className={[
          "grid gap-6",
          selectedUser
            ? viewMode === "table"
              ? "xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] xl:items-start"
              : "xl:grid-cols-[minmax(320px,500px)_minmax(0,1fr)] xl:items-start"
            : "",
        ].join(" ")}
      >
        <div
          aria-busy={isRefreshing}
          className={[
            viewMode === "cards"
              ? [
                  "grid gap-4",
                  selectedUser ? "xl:max-w-[500px]" : "w-full md:grid-cols-2 xl:grid-cols-3",
                ].join(" ")
              : "min-w-0",
            isRefreshing ? "pointer-events-none opacity-60" : "",
          ].join(" ")}
        >
          {visibleUsers.length === 0 && !isRefreshing ? (
            viewMode === "cards" ? (
              <div className="col-span-full">
                <EmptyState title={t("users.noUsers")} description={t("users.noUsersDescription")} />
              </div>
            ) : (
              <EmptyState title={t("users.noUsers")} description={t("users.noUsersDescription")} />
            )
          ) : viewMode === "table" ? (
            <DataTable
              columns={[...tableColumns]}
              onRowClick={(rowIndex) => setSelectedUserId(visibleUsers[rowIndex]?.id ?? null)}
              getRowClassName={(rowIndex) =>
                visibleUsers[rowIndex]?.id === selectedUserId
                  ? "bg-[var(--joballa-jade-3)] hover:bg-[var(--joballa-jade-3)]"
                  : undefined
              }
              rows={visibleUsers.map((user) => {
                const userActions = getUserActions(user);
                return [
                  <span key="name" className="flex min-w-0 items-center gap-3">
                    <UserAvatar name={user.name} photoUrl={user.photoUrl} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-[var(--joballa-fg)]">{user.name}</span>
                      <span className="mt-0.5 block truncate text-sm font-medium text-[var(--joballa-muted)]">
                        {user.email}
                      </span>
                    </span>
                  </span>,
                  formatRoleLabel(user.role),
                  <StatusBadge key="status" value={user.status} />,
                  formatUserDate(user.joinedAt) ?? EM_DASH,
                  userActions.length > 0 ? (
                    <div key="actions" onClick={(event) => event.stopPropagation()}>
                      <MoreMenu label={t("users.actionsFor", { name: user.name })} items={userActions} />
                    </div>
                  ) : (
                    EM_DASH
                  ),
                ];
              })}
            />
          ) : (
            visibleUsers.map((user) => {
              const isActive = user.status.toLowerCase() === "active";
              const userActions = getUserActions(user);
              return (
                <article
                  key={user.id}
                  className={[
                    "cursor-pointer rounded-[18px] border bg-[var(--joballa-card)] p-5",
                    selectedUserId === user.id ? "border-[var(--joballa-primary)]" : "border-[var(--joballa-border)]",
                  ].join(" ")}
                  onClick={() => setSelectedUserId(user.id)}
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-4">
                      <UserAvatar name={user.name} photoUrl={user.photoUrl} size="md" />
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-semibold tracking-tight">{user.name}</h3>
                        <p className="mt-1 truncate text-sm font-medium text-[var(--joballa-muted)]">{user.email}</p>
                      </div>
                    </div>
                    {userActions.length > 0 ? (
                      <div onClick={(event) => event.stopPropagation()}>
                        <MoreMenu label={t("users.actionsFor", { name: user.name })} items={userActions} />
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="rounded-full border border-[var(--joballa-border)] bg-[var(--joballa-page-tint)] px-3 py-1.5 text-xs font-bold">
                      {formatRoleLabel(user.role)}
                    </span>
                    <span
                      className={[
                        "rounded-full px-3 py-1.5 text-xs font-bold",
                        isActive
                          ? "bg-[var(--joballa-jade-3)] text-[var(--joballa-primary)]"
                          : "bg-[var(--joballa-danger-bg)] text-[var(--joballa-danger-fg)]",
                      ].join(" ")}
                    >
                      {isActive ? t("common.active") : t("common.suspended")}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-2.5 text-sm font-medium text-[var(--joballa-muted)]">
                    <span className="flex min-w-0 items-center gap-2">
                      <Mail size={15} />
                      <span className="truncate">{user.email}</span>
                    </span>
                    {formatUserDate(user.joinedAt) ? (
                      <span className="flex items-center gap-2">
                        <CalendarDays size={15} />
                        {t("users.joinedOn", { date: formatUserDate(user.joinedAt) ?? "" })}
                      </span>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </div>

        {selectedUser ? (
          <UserDetailPanel
            user={isRefreshing ? null : userToDetailFields(selectedUser, (key, vars) => t(key as Parameters<typeof t>[0], vars), formatRoleLabel)}
            loading={isRefreshing}
            onClose={() => setSelectedUserId(null)}
            menuItems={getUserActions(selectedUser)}
            menuLabel={t("users.actionsFor", { name: selectedUser.name })}
          />
        ) : null}
      </div>

      <PaginationBar
        page={page}
        totalPages={totalPages}
        total={data?.total}
        onPageChange={(nextPage) => {
          setPage(nextPage);
          setSelectedUserId(null);
        }}
      />
    </section>
  );
}
