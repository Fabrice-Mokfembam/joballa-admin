"use client";

import { useState } from "react";
import { usersApi } from "@/lib/api/admin";
import { formatRoleLabel } from "@/lib/api/format";
import type { PlatformUser } from "@/lib/api/types";
import { emitAdminRefresh, useAdminRefresh } from "@/lib/admin-refresh";
import { EM_DASH } from "@/lib/constants";
import { useAuth } from "@/lib/auth/auth-context";
import { useAdminAction } from "@/lib/hooks/use-admin-action";
import { isAsyncRefreshing, isInitialAsyncLoad, useAsyncData, useMutation } from "@/lib/hooks/use-async";
import { useTranslation } from "@/lib/i18n";
import { DataTable, FilterSelect, MoreMenu, PaginationBar, SearchField, StatusBadge, StatusFilterPills } from "../ui";
import { DataTableSkeleton } from "../ui/skeletons";
import { AccessDeniedState, EmptyState, ErrorState } from "../ui/states";

const ROLE_FILTER_KEYS = ["common.all", "common.worker", "common.employer"] as const;
const ROLE_FILTER_VALUES = ["All", "Worker", "Employer"] as const;
const STATUS_FILTER_KEYS = ["common.all", "common.active", "common.suspended"] as const;
const STATUS_FILTER_VALUES = ["All", "Active", "Suspended"] as const;

export function UsersView() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("users:manage");
  const canRead = hasPermission("users:read");
  const { perform } = useAdminAction();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<(typeof ROLE_FILTER_VALUES)[number]>("All");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTER_VALUES)[number]>("All");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

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

  const tableColumns = [t("common.name"), t("common.role"), t("common.email"), t("common.status"), t("common.actions")] as const;

  async function refreshUsersAndDepartments() {
    emitAdminRefresh("users", "departments");
    reload();
  }

  const tableRows = visibleUsers.map((user: PlatformUser) => [
    <span key="name" className="font-semibold">
      {user.name}
    </span>,
    formatRoleLabel(user.role),
    user.email,
    <StatusBadge key="status" value={user.status} />,
    canManage ? (
      <MoreMenu
        key="actions"
        label={t("users.actionsFor", { name: user.name })}
        items={[
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
          ...(canManage
            ? [
                {
                  label: t("users.delete"),
                  tone: "danger" as const,
                  onClick: async () =>
                    perform(() => deleteUser(user.id), {
                      success: t("users.deletedSuccess"),
                      onSuccess: refreshUsersAndDepartments,
                    }),
                },
              ]
            : []),
        ]}
      />
    ) : (
      EM_DASH
    ),
  ]);

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
        <DataTableSkeleton columns={[...tableColumns]} rows={5} />
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

      <div className="mb-5 flex flex-wrap gap-3">
        <SearchField
          value={searchQuery}
          onChange={(value) => { setSearchQuery(value); setPage(1); }}
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
          }}
        />
      </div>

      <StatusFilterPills
        statuses={ROLE_FILTER_KEYS.map((key) => t(key))}
        value={t(ROLE_FILTER_KEYS[ROLE_FILTER_VALUES.indexOf(roleFilter)])}
        onChange={(label) => {
          const index = ROLE_FILTER_KEYS.findIndex((key) => t(key) === label);
          if (index >= 0) setRoleFilter(ROLE_FILTER_VALUES[index]);
          setPage(1);
        }}
      />

      {error ? (
        <p className="mb-4 rounded-[8px] border border-[var(--joballa-danger-border)] bg-[var(--joballa-danger-bg)] px-4 py-3 text-sm font-medium text-[var(--joballa-danger-fg)]">
          {error}
        </p>
      ) : null}

      <div
        aria-busy={isRefreshing}
        className={isRefreshing ? "pointer-events-none opacity-60 transition-opacity" : undefined}
      >
        {visibleUsers.length === 0 && !isRefreshing ? (
          <EmptyState title={t("users.noUsers")} description={t("users.noUsersDescription")} />
        ) : (
          <DataTable columns={[...tableColumns]} rows={tableRows} />
        )}
      </div>

      <PaginationBar page={page} totalPages={totalPages} total={data?.total} onPageChange={setPage} />
    </section>
  );
}
