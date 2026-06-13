"use client";

import { useEffect, useState } from "react";
import { BriefcaseBusiness, Building2, ShieldCheck, TrendingDown, TrendingUp, UserCog, UserX, X } from "lucide-react";
import { adminsApi, dashboardApi, departmentsApi } from "@/lib/api/admin";
import type { AdminListItem, DepartmentListItem } from "@/lib/api/types";
import { EM_DASH } from "@/lib/constants";
import {
  createVirtualOtherDepartment,
  filterStoredDepartments,
  isVirtualOtherDepartment,
} from "@/lib/constants/departments";
import { INPUT_MAX_LENGTH } from "@/lib/constants/input-limits";
import { useAuth } from "@/lib/auth/auth-context";
import { emitAdminRefresh, useAdminRefresh } from "@/lib/admin-refresh";
import { useTranslation } from "@/lib/i18n";
import { useAdminAction } from "@/lib/hooks/use-admin-action";
import { isAsyncRefreshing, isInitialAsyncLoad, useAsyncData, useMutation } from "@/lib/hooks/use-async";
import { DataTable, FilterSelect, MoreMenu, SearchField, StatusBadge, SummaryCards } from "../ui";
import { AdminCardGridSkeleton, DataTableSkeleton, DepartmentCardGridSkeleton } from "../ui/skeletons";
import { AccessDeniedState, EmptyState, ErrorState, LoadingButton } from "../ui/states";

function formatCategoryLabel(category: string): string {
  return category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getDepartmentEmail(department: DepartmentListItem): string {
  return department.email?.trim() || department.admin?.trim() || EM_DASH;
}

function departmentConversionRate(department: DepartmentListItem): number {
  const applications = department.applications ?? 0;
  const hires = department.hires ?? 0;
  if (applications === 0) return hires > 0 ? 100 : 0;
  return (hires / applications) * 100;
}

function compareDepartmentPerformance(a: DepartmentListItem, b: DepartmentListItem): number {
  const rateDelta = departmentConversionRate(b) - departmentConversionRate(a);
  if (rateDelta !== 0) return rateDelta;
  const hiresDelta = (b.hires ?? 0) - (a.hires ?? 0);
  if (hiresDelta !== 0) return hiresDelta;
  return (b.jobs ?? 0) - (a.jobs ?? 0);
}

function getPerformingDepartments(departments: DepartmentListItem[]) {
  const active = departments.filter(
    (department) => (department.jobs ?? 0) > 0 || (department.applications ?? 0) > 0 || (department.hires ?? 0) > 0
  );
  if (active.length === 0) return { top: null, least: null };
  const sorted = [...active].sort(compareDepartmentPerformance);
  return { top: sorted[0], least: sorted[sorted.length - 1] };
}

function departmentMatchesSearch(department: DepartmentListItem, query: string): boolean {
  if (!query) return true;
  const haystack = `${department.name} ${department.description ?? ""}`.toLowerCase();
  return haystack.includes(query);
}

export function DepartmentsGrid({ onEdit }: { onEdit: (department: DepartmentListItem) => void }) {
  const { hasPermission } = useAuth();
  const { t } = useTranslation();
  const { perform } = useAdminAction();
  const canManage = hasPermission("departments:manage");
  const canDelete = canManage;
  const [searchQuery, setSearchQuery] = useState("");

  const { data: departments, loading, error, reload } = useAsyncData(
    async () => (await departmentsApi.list({ limit: 100 })).items,
    [],
    { cacheKey: "departments:list" }
  );

  const { data: dashboard } = useAsyncData(
    () => dashboardApi.get(),
    [],
    { cacheKey: "dashboard:summary" }
  );

  useAdminRefresh(["departments"], reload);

  const { mutate: removeDepartment } = useMutation((id: string) => departmentsApi.delete(id));

  const isInitialLoad = isInitialAsyncLoad(loading, departments);
  const isRefreshing = isAsyncRefreshing(loading, departments);

  async function refreshDepartmentsAndUsers() {
    emitAdminRefresh("departments", "users");
    reload();
  }

  function departmentMenuItems(department: DepartmentListItem) {
    if (isVirtualOtherDepartment(department)) return [];
    return [
      { label: t("common.edit"), onClick: () => onEdit(department) },
      ...(canDelete
        ? [
            {
              label: t("common.delete"),
              tone: "danger" as const,
              onClick: async () =>
                perform(() => removeDepartment(department.id), {
                  success: t("departments.deletedSuccess"),
                  onSuccess: refreshDepartmentsAndUsers,
                }),
            },
          ]
        : []),
    ];
  }

  if (isInitialLoad) {
    return <DepartmentCardGridSkeleton count={6} />;
  }

  if (error && departments === null) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  if (!departments) {
    return (
      <EmptyState
        title={t("departments.noDepartments")}
        description={t("departments.noDepartmentsDescription")}
      />
    );
  }

  const storedDepartments = filterStoredDepartments(departments);
  const query = searchQuery.trim().toLowerCase();
  const assignedJobs = storedDepartments.reduce((sum, item) => sum + (item.jobs ?? 0), 0);
  const totalJobs = dashboard?.jobs?.totalJobs;
  const jobsInOtherDepartment =
    totalJobs !== undefined ? Math.max(0, totalJobs - assignedJobs) : 0;
  const otherDepartment = createVirtualOtherDepartment(
    jobsInOtherDepartment,
    t("departments.otherDescription"),
    t("departments.otherName")
  );
  const visibleStoredDepartments = storedDepartments.filter((department) => departmentMatchesSearch(department, query));
  const visibleDepartments = departmentMatchesSearch(otherDepartment, query)
    ? [...visibleStoredDepartments, otherDepartment]
    : visibleStoredDepartments;
  const { top, least } = getPerformingDepartments(storedDepartments);
  const departmentNameClass = "line-clamp-2 text-lg font-bold leading-snug";

  return (
    <>
    <SummaryCards items={[
      {
        label: t("departments.total"),
        value: storedDepartments.length,
        icon: Building2,
        tone: "violet",
      },
      {
        label: t("departments.topPerforming"),
        value: top?.name ?? EM_DASH,
        icon: TrendingUp,
        tone: "jade",
        valueClassName: departmentNameClass,
      },
      {
        label: t("departments.leastPerforming"),
        value: least?.name ?? EM_DASH,
        icon: TrendingDown,
        tone: "amber",
        valueClassName: departmentNameClass,
      },
      {
        label: t("departments.jobsOther"),
        value: totalJobs !== undefined ? jobsInOtherDepartment.toLocaleString() : EM_DASH,
        icon: BriefcaseBusiness,
        tone: "blue",
      },
    ]} />
    <div className="mb-5 flex flex-wrap gap-3">
      <SearchField
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={t("departments.searchPlaceholder")}
      />
    </div>
    <div
      aria-busy={isRefreshing}
      className={[
        "grid gap-4 md:grid-cols-2 xl:grid-cols-3",
        isRefreshing ? "pointer-events-none opacity-60 transition-opacity" : "",
      ].join(" ")}
    >
      {visibleDepartments.map((department) => {
        const isVirtualOther = isVirtualOtherDepartment(department);
        return (
        <section
          key={department.id}
          className={[
            "flex min-h-[220px] flex-col justify-between rounded-[8px] border bg-[var(--joballa-card)] px-5 py-7",
            isVirtualOther ? "border-dashed border-[var(--joballa-border)]" : "border-[var(--joballa-border)]",
          ].join(" ")}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold">{department.name}</h3>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--joballa-muted)]">
                {department.description || t("departments.noDescription")}
              </p>
            </div>
            {canManage && !isVirtualOther ? (
              <MoreMenu
                label={`${department.name} actions`}
                items={departmentMenuItems(department)}
              />
            ) : null}
          </div>
          <div className="mt-6 flex items-end justify-between gap-4 border-t border-[var(--joballa-border)] pt-4">
            {[
              [t("departments.jobs"), department.jobs ?? 0],
              [t("departments.appl"), department.applications ?? 0],
              [t("departments.hired"), department.hires ?? 0],
            ].map(([label, value]) => (
              <div key={String(label)} className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--joballa-muted)]">{label}</p>
                <p className="mt-1 text-xl font-bold">{Number(value).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </section>
        );
      })}
    </div>
    </>
  );
}

export function DepartmentsTable({ onEdit }: { onEdit: (department: DepartmentListItem) => void }) {
  const { hasPermission } = useAuth();
  const { perform } = useAdminAction();
  const canManage = hasPermission("departments:manage");
  const canDelete = canManage;

  const { t } = useTranslation();
  const { data: departments, loading, error, reload } = useAsyncData(
    async () => (await departmentsApi.list({ limit: 100 })).items,
    []
  );

  const { data: dashboard } = useAsyncData(
    () => dashboardApi.get(),
    [],
    { cacheKey: "dashboard:summary" }
  );

  useAdminRefresh(["departments"], reload);

  const { mutate: removeDepartment } = useMutation((id: string) => departmentsApi.delete(id));

  const isInitialLoad = isInitialAsyncLoad(loading, departments);
  const isRefreshing = isAsyncRefreshing(loading, departments);

  async function refreshDepartments() {
    emitAdminRefresh("departments");
    reload();
  }

  function departmentMenuItems(department: DepartmentListItem) {
    if (isVirtualOtherDepartment(department)) return [];
    return [
      { label: t("common.edit"), onClick: () => onEdit(department) },
      ...(canDelete
        ? [
            {
              label: t("common.delete"),
              tone: "danger" as const,
              onClick: async () =>
                perform(() => removeDepartment(department.id), {
                  success: t("departments.deletedSuccess"),
                  onSuccess: refreshDepartments,
                }),
            },
          ]
        : []),
    ];
  }

  if (isInitialLoad) {
    return (
      <DataTableSkeleton columns={[t("departments.department"), t("departments.email"), t("departments.category"), t("departments.jobs"), t("common.actions")]} rows={5} />
    );
  }

  if (error && departments === null) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  if (!departments) {
    return (
      <EmptyState title={t("departments.noDepartments")} description={t("departments.noDepartmentsDescription")} />
    );
  }

  const storedDepartments = filterStoredDepartments(departments);
  const assignedJobs = storedDepartments.reduce((sum, item) => sum + (item.jobs ?? 0), 0);
  const totalJobs = dashboard?.jobs?.totalJobs;
  const jobsInOtherDepartment =
    totalJobs !== undefined ? Math.max(0, totalJobs - assignedJobs) : 0;
  const otherDepartment = createVirtualOtherDepartment(
    jobsInOtherDepartment,
    t("departments.otherDescription"),
    t("departments.otherName")
  );
  const tableDepartments = [...storedDepartments, otherDepartment];

  return (
    <div
      aria-busy={isRefreshing}
      className={isRefreshing ? "pointer-events-none opacity-60 transition-opacity" : undefined}
    >
      <DataTable
        columns={[t("departments.department"), t("departments.email"), t("departments.category"), t("departments.jobs"), t("common.actions")]}
        rows={tableDepartments.map((department) => [
          <span key="name" className="font-semibold">
            {department.name}
          </span>,
          isVirtualOtherDepartment(department) ? EM_DASH : getDepartmentEmail(department),
          isVirtualOtherDepartment(department) ? EM_DASH : formatCategoryLabel(department.category),
          department.jobs,
          canManage && !isVirtualOtherDepartment(department) ? (
            <MoreMenu
              key="actions"
              label={`${department.name} actions`}
              items={departmentMenuItems(department)}
            />
          ) : (
            EM_DASH
          ),
        ])}
      />
    </div>
  );
}

/** @deprecated Use DepartmentsTable or AdminsTable */
export function DepartmentAdminsTable(props: { onEdit: (department: DepartmentListItem) => void }) {
  return <DepartmentsTable {...props} />;
}

export function AdminsTable({ onEdit }: { onEdit?: (admin: AdminListItem) => void }) {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const { perform } = useAdminAction();
  const canManage = hasPermission("admins:manage");
  const canDelete = canManage;
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const { data: admins, loading, error, reload } = useAsyncData(
    async () => (await adminsApi.list({ limit: 100 })).items,
    []
  );

  useAdminRefresh(["admins", "users"], reload);

  const { mutate: removeAdmin } = useMutation((id: string) => adminsApi.delete(id));
  const { mutate: suspendAdmin } = useMutation((id: string) => adminsApi.suspend(id));
  const { mutate: reactivateAdmin } = useMutation((id: string) => adminsApi.reactivate(id));

  const isInitialLoad = isInitialAsyncLoad(loading, admins);
  const isRefreshing = isAsyncRefreshing(loading, admins);

  if (isInitialLoad) {
    return <AdminCardGridSkeleton />;
  }

  if (error && admins === null) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  if (!admins || (admins.length === 0 && !isRefreshing)) {
    return <EmptyState title={t("departments.noAdmins")} description={t("departments.noAdminsDescription")} />;
  }

  const visibleAdmins = admins
    .filter((admin) => !searchQuery.trim() || `${admin.name} ${admin.email} ${admin.role}`.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    .filter((admin) => {
      if (statusFilter === "All") return true;
      if (statusFilter === "Suspended") return (admin.status ?? "active").toLowerCase() === "inactive";
      return formatCategoryLabel(admin.status ?? "active") === statusFilter;
    });

  return (
    <>
    <SummaryCards items={[
      { label: t("nav.admins"), value: visibleAdmins.length, icon: UserCog, tone: "blue" },
      { label: t("common.active"), value: visibleAdmins.filter((item) => (item.status ?? "active").toLowerCase() === "active").length, icon: ShieldCheck, tone: "jade" },
      { label: t("common.suspended"), value: visibleAdmins.filter((item) => (item.status ?? "active").toLowerCase() === "inactive").length, icon: UserX, tone: "red" },
    ]} />
    <div className="mb-5 flex flex-wrap gap-3">
      <SearchField value={searchQuery} onChange={setSearchQuery} placeholder={t("departments.searchPlaceholder")} />
      <FilterSelect
        label={t("common.status")}
        value={statusFilter === "All" ? t("common.all") : statusFilter === "Active" ? t("common.active") : t("common.suspended")}
        options={[t("common.all"), t("common.active"), t("common.suspended")]}
        onChange={(label) => {
          if (label === t("common.all")) setStatusFilter("All");
          else if (label === t("common.active")) setStatusFilter("Active");
          else setStatusFilter("Suspended");
        }}
      />
    </div>
    <div
      aria-busy={isRefreshing}
      className={isRefreshing ? "pointer-events-none opacity-60 transition-opacity" : undefined}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleAdmins.map((admin) => {
          const isActive = (admin.status ?? "active").toLowerCase() === "active";
          const isSuperAdmin = admin.role === "super_admin";
          const menuItems = [
            ...(onEdit && canManage ? [{ label: t("common.edit"), onClick: () => onEdit(admin) }] : []),
            ...(canManage && isActive && !isSuperAdmin
              ? [
                  {
                    label: t("departments.suspendAdmin"),
                    confirmationDescription: t("profiles.suspendConfirm"),
                    onClick: async () =>
                      perform(() => suspendAdmin(admin.id), {
                        success: t("departments.adminSuspendedSuccess"),
                        onSuccess: reload,
                      }),
                  },
                ]
              : []),
            ...(canManage && !isActive && !isSuperAdmin
              ? [
                  {
                    label: t("departments.reactivateAdmin"),
                    onClick: async () =>
                      perform(() => reactivateAdmin(admin.id), {
                        success: t("departments.adminReactivatedSuccess"),
                        onSuccess: reload,
                      }),
                  },
                ]
              : []),
            ...(canDelete && !isSuperAdmin
              ? [
                  {
                    label: t("departments.deleteAdmin"),
                    tone: "danger" as const,
                    onClick: async () =>
                      perform(() => removeAdmin(admin.id), {
                        success: t("departments.adminDeletedSuccess"),
                        onSuccess: reload,
                      }),
                  },
                ]
              : []),
          ];

          return <article key={admin.id} className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-[var(--joballa-primary)]">{formatCategoryLabel(admin.role)}</p>
                <h3 className="mt-2 text-lg font-bold">{admin.name}</h3>
                <p className="mt-1 text-sm text-[var(--joballa-muted)]">{admin.email}</p>
                {admin.departments?.length ? (
                  <p className="mt-3 text-xs font-semibold text-[var(--joballa-muted)]">
                    {admin.departments.map((department) => department.name).join(", ")}
                  </p>
                ) : null}
              </div>
              <StatusBadge value={admin.status ?? "active"} />
            </div>
            <div className="mt-6 flex items-end justify-between border-t border-[var(--joballa-border)] pt-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--joballa-muted)]/70">{t("profiles.createdLabel")}</p>
                <p className="mt-1 text-sm font-bold text-[var(--joballa-fg)]">
                  {admin.createdAt
                    ? new Date(admin.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : EM_DASH}
                </p>
              </div>
              {canManage ? <MoreMenu label={`${admin.name} actions`} items={menuItems} /> : null}
            </div>
          </article>;
        })}
      </div>
    </div>
    </>
  );
}

export function DepartmentAdminModal({
  mode,
  department,
  admin,
  onClose,
  onSaved,
  variant = "admin",
}: {
  mode: "add" | "edit";
  department?: DepartmentListItem;
  admin?: AdminListItem;
  onClose: () => void;
  onSaved: () => void;
  variant?: "department" | "admin";
}) {
  const { t } = useTranslation();
  const { perform } = useAdminAction();
  const { isSuperAdmin } = useAuth();
  const title =
    mode === "add"
      ? variant === "department"
        ? t("departments.addTitle")
        : t("departments.addAdminTitle")
      : variant === "department"
        ? t("departments.editTitle")
        : t("departments.editAdminTitle");
  const actionLabel = mode === "add" ? t("common.create") : t("departments.save");
  const savingLabel = mode === "add" ? t("common.creating") : t("common.saving");
  const idPrefix = `department-admin-${mode}`;

  const { mutate: saveDepartment, loading: saving } = useMutation(
    async (body: { name: string; email: string; description: string; status?: string; role?: string; password?: string }) => {
      if (variant === "admin") {
        const adminRole =
          body.role && body.role !== "super_admin"
            ? (body.role as "admin_manager" | "verifier" | "support_agent")
            : undefined;
        if (mode === "edit" && admin) {
          return adminsApi.update(admin.id, {
            fullName: body.name,
            email: body.email,
            role: adminRole,
            password: body.password,
          });
        }
        return adminsApi.create({
          fullName: body.name,
          email: body.email,
          role: adminRole as "admin_manager" | "verifier" | "support_agent",
          password: body.password,
        });
      }
      if (mode === "add") {
        return departmentsApi.create({
          name: body.name,
          description: body.description,
        });
      }
      if (!department) return null;
      return departmentsApi.update(department.id, {
        name: body.name,
        description: body.description,
      });
    }
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const status = String(form.get("status") ?? "").trim();
    const role = String(form.get("role") ?? admin?.role ?? "").trim();
    const password = String(form.get("password") ?? "").trim();

    if (!name) return;
    if (variant === "admin" && (!email || !role)) return;
    if (variant === "department" && !description) return;

    const successMessage =
      variant === "admin"
        ? mode === "add"
          ? t("departments.adminCreatedSuccess")
          : t("departments.adminUpdatedSuccess")
        : mode === "add"
          ? t("departments.createdSuccess")
          : t("departments.updatedSuccess");

    const ok = await perform(
      () =>
        saveDepartment({
          name,
          email,
          description,
          status: status || undefined,
          role: role || undefined,
          password: password || undefined,
        }),
      {
        success: successMessage,
        error: t("common.tryAgain"),
        onSuccess: () => {
          onSaved();
          onClose();
        },
      }
    );

    if (!ok) return;
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/55 px-4 py-4"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${idPrefix}-title`}
        className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5 text-left shadow-[0_24px_70px_rgba(0,0,0,0.28)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h3 id={`${idPrefix}-title`} className="text-xl font-bold">{title}</h3>
          <button type="button" aria-label={t("common.close")} className="grid h-9 w-9 place-items-center rounded-[8px] border border-[var(--joballa-border)]" onClick={onClose}><X size={17} /></button>
        </div>
        <form className="mt-5 grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
          <DepartmentAdminField
            id={`${idPrefix}-name`}
            name="name"
            label={variant === "department" ? t("departments.name") : t("departments.fullName")}
            defaultValue={department?.name ?? admin?.name}
            placeholder={variant === "department" ? t("departments.namePlaceholder") : t("departments.fullNamePlaceholder")}
            maxLength={variant === "department" ? INPUT_MAX_LENGTH.departmentName : INPUT_MAX_LENGTH.fullName}
            required
          />
          {variant === "admin" ? (
            <DepartmentAdminField
              id={`${idPrefix}-email`}
              name="email"
              label={t("departments.email")}
              defaultValue={admin?.email ?? department?.email ?? department?.admin}
              placeholder={variant === "admin" ? t("departments.adminEmailPlaceholder") : t("departments.departmentEmailPlaceholder")}
              type="email"
              maxLength={INPUT_MAX_LENGTH.email}
              required
            />
          ) : null}
          {variant === "department" ? (
            <label className="grid gap-2 text-sm font-bold">{t("departments.description")}
              <textarea name="description" required defaultValue={department?.description} maxLength={INPUT_MAX_LENGTH.description} className="min-h-28 rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 py-3 font-normal outline-none" />
            </label>
          ) : (
            <>
              <label className="grid gap-2 text-sm font-bold">{t("departments.adminRole")}
                <select name="role" required disabled={admin?.role === "super_admin"} defaultValue={admin?.role ?? "verifier"} className="min-h-12 rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 font-normal outline-none disabled:opacity-60">
                  {admin?.role === "super_admin" ? <option value="super_admin">{t("common.superAdmin")}</option> : null}
                  <option value="admin_manager">{t("common.adminManager")}</option>
                  <option value="verifier">{t("common.verifier")}</option>
                  <option value="support_agent">{t("common.supportAgent")}</option>
                </select>
                {admin?.role === "super_admin" ? <span className="text-xs font-medium text-[var(--joballa-muted)]">{t("departments.superAdminProtected")}</span> : null}
              </label>
              {mode === "add" || isSuperAdmin ? (
                <DepartmentAdminField
                  id={`${idPrefix}-password`}
                  name="password"
                  label={mode === "add" ? t("departments.passwordOptional") : t("departments.newPasswordOptional")}
                  placeholder={mode === "add" ? t("departments.passwordPlaceholderAdd") : t("departments.passwordPlaceholderEdit")}
                  type="password"
                  maxLength={INPUT_MAX_LENGTH.password}
                />
              ) : null}
            </>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="rounded-full border border-[var(--joballa-border)] px-5 py-2.5 text-sm font-bold"
              onClick={onClose}
            >
              {t("common.cancel")}
            </button>
            <LoadingButton type="submit" loading={saving} loadingLabel={savingLabel}>
              {actionLabel}
            </LoadingButton>
          </div>
        </form>
      </section>
    </div>
  );
}

function DepartmentAdminField({
  id,
  name,
  label,
  defaultValue,
  placeholder,
  type = "text",
  required,
  disabled,
  maxLength,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue?: string;
  placeholder: string;
  type?: "email" | "password" | "text";
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        className="min-h-12 w-full rounded-[12px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 text-sm outline-none disabled:opacity-60"
        defaultValue={defaultValue}
        placeholder={placeholder}
        type={type}
        required={required}
        disabled={disabled}
        maxLength={maxLength}
      />
    </div>
  );
}

export function DepartmentAdminViews() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const canRead = hasPermission("departments:read");
  const canManage = hasPermission("departments:manage");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentListItem | null>(null);

  function handleSaved() {
    emitAdminRefresh("departments", "users");
  }

  useEffect(() => {
    const openAddDepartment = () => setIsAddOpen(true);
    window.addEventListener("admin:add-department", openAddDepartment);
    return () => window.removeEventListener("admin:add-department", openAddDepartment);
  }, []);

  return (
    <section>
      {!canRead ? (
        <AccessDeniedState description={t("departments.manageAccessDenied")} />
      ) : (
        <>
      <DepartmentsGrid onEdit={canManage ? setEditingDepartment : () => undefined} />

      {isAddOpen && canManage ? (
        <DepartmentAdminModal
          mode="add"
          variant="department"
          onClose={() => setIsAddOpen(false)}
          onSaved={handleSaved}
        />
      ) : null}

      {editingDepartment && canManage && !isVirtualOtherDepartment(editingDepartment) ? (
        <DepartmentAdminModal
          mode="edit"
          department={editingDepartment}
          onClose={() => setEditingDepartment(null)}
          onSaved={handleSaved}
        />
      ) : null}
        </>
      )}
    </section>
  );
}

export function DepartmentsView() {
  return <DepartmentAdminViews />;
}

export function AdminsView() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("admins:manage");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminListItem | null>(null);

  useEffect(() => {
    const openAddAdmin = () => setIsAddOpen(true);
    window.addEventListener("admin:add-admin", openAddAdmin);
    return () => window.removeEventListener("admin:add-admin", openAddAdmin);
  }, []);

  function handleSaved() {
    emitAdminRefresh("admins", "users");
  }

  return (
    <section>
      {!canManage ? (
        <AccessDeniedState description={t("departments.adminsAccessDenied")} />
      ) : (
        <>
      <AdminsTable onEdit={canManage ? setEditingAdmin : undefined} />

      {isAddOpen && canManage ? (
        <DepartmentAdminModal
          mode="add"
          variant="admin"
          onClose={() => setIsAddOpen(false)}
          onSaved={handleSaved}
        />
      ) : null}

      {editingAdmin && canManage ? (
        <DepartmentAdminModal
          mode="edit"
          variant="admin"
          admin={editingAdmin}
          onClose={() => setEditingAdmin(null)}
          onSaved={handleSaved}
        />
      ) : null}
        </>
      )}
    </section>
  );
}

