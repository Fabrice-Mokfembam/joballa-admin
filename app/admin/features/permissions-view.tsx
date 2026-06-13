"use client";

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { adminPermissionsApi } from "@/lib/api/admin";
import { useTranslation, type TranslationKey } from "@/lib/i18n";
import { useTranslatedFormat } from "@/lib/i18n/use-translated-format";
import type { AdminListItem, AdminPermission, AdminRole } from "@/lib/api/types";
import { emitAdminRefresh } from "@/lib/admin-refresh";
import { useAuth } from "@/lib/auth/auth-context";
import { useAdminAction } from "@/lib/hooks/use-admin-action";
import { isAsyncRefreshing, isInitialAsyncLoad, useAsyncData, useMutation } from "@/lib/hooks/use-async";
import { DataTableSkeleton } from "../ui/skeletons";
import { AccessDeniedState, EmptyState, ErrorState, LoadingButton } from "../ui/states";

type PermissionDefinition = {
  key: AdminPermission;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
};

const ROLE_FILTERS = ["All Admins", "Admin Managers", "Verifiers", "Support Agents"] as const;
const ROLE_FILTER_KEYS = ["permissions.allAdmins", "permissions.adminManagers", "permissions.verifiers", "permissions.supportAgents"] as const;

const PERMISSIONS: PermissionDefinition[] = [
  { key: "manage_admins", labelKey: "permissions.manageAdmins", descriptionKey: "permissions.manageAdminsDesc" },
  { key: "manage_jobs", labelKey: "permissions.manageJobs", descriptionKey: "permissions.manageJobsDesc" },
  { key: "manage_platform_users", labelKey: "permissions.manageUsers", descriptionKey: "permissions.manageUsersDesc" },
  { key: "verify_jobs", labelKey: "permissions.verifyJobs", descriptionKey: "permissions.verifyJobsDesc" },
  { key: "manage_departments", labelKey: "permissions.manageDepartments", descriptionKey: "permissions.manageDepartmentsDesc" },
  { key: "resolve_disputes", labelKey: "permissions.resolveDisputes", descriptionKey: "permissions.resolveDisputesDesc" },
  { key: "verify_documents", labelKey: "permissions.verifyDocuments", descriptionKey: "permissions.verifyDocumentsDesc" },
  { key: "verify_kyc", labelKey: "permissions.verifyKyc", descriptionKey: "permissions.verifyKycDesc" },
  { key: "view_financial_records", labelKey: "permissions.viewRecords", descriptionKey: "permissions.viewRecordsDesc" },
  { key: "create_profiles", labelKey: "permissions.createProfiles", descriptionKey: "permissions.createProfilesDesc" },
];

const ROLE_DEFAULTS: Record<AdminRole, AdminPermission[]> = {
  super_admin: PERMISSIONS.map((permission) => permission.key),
  admin: ["verify_jobs", "resolve_disputes", "verify_documents", "verify_kyc"],
  admin_manager: [
    "manage_admins",
    "manage_jobs",
    "manage_platform_users",
    "verify_jobs",
    "manage_departments",
    "resolve_disputes",
    "verify_documents",
    "verify_kyc",
    "view_financial_records",
    "create_profiles",
  ],
  verifier: ["verify_jobs", "resolve_disputes", "verify_documents", "verify_kyc"],
  support_agent: ["create_profiles"],
};

function normalizeRole(role: AdminRole): AdminRole {
  return role === "admin" ? "verifier" : role;
}

function filterMatchesRole(admin: AdminListItem, filter: (typeof ROLE_FILTERS)[number]) {
  const role = normalizeRole(admin.role);
  if (role === "super_admin") return false;
  if (filter === "All Admins") return true;
  if (filter === "Admin Managers") return role === "admin_manager";
  if (filter === "Verifiers") return role === "verifier";
  return role === "support_agent";
}

function arePermissionSetsEqual(left: Set<AdminPermission>, right: Set<AdminPermission>) {
  if (left.size !== right.size) return false;
  for (const permission of left) {
    if (!right.has(permission)) return false;
  }
  return true;
}

export function PermissionsView() {
  const { t } = useTranslation();
  const { formatRoleLabel } = useTranslatedFormat();
  const { user, hasPermission, refresh } = useAuth();
  const { perform } = useAdminAction();
  const canManagePermissions = hasPermission("admins:manage");
  const [roleFilter, setRoleFilter] = useState<(typeof ROLE_FILTERS)[number]>("All Admins");
  const [selectedAdminId, setSelectedAdminId] = useState("");
  const [savedPermissions, setSavedPermissions] = useState<Set<AdminPermission>>(new Set());
  const [draftPermissions, setDraftPermissions] = useState<Set<AdminPermission>>(new Set());
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);

  const { data: adminsResult, loading, error, reload } = useAsyncData(
    () => adminPermissionsApi.list({ limit: 100 }),
    []
  );

  const admins: AdminListItem[] = (adminsResult?.items ?? []).map((admin) => ({
    id: admin.adminId,
    name: admin.name,
    email: admin.email,
    role: admin.role as AdminRole,
    status: "active",
    permissions: admin.permissions,
    departments: admin.departments,
  }));
  const filteredAdmins = admins.filter((admin) => filterMatchesRole(admin, roleFilter));
  const selectedAdmin = filteredAdmins.find((admin) => admin.id === selectedAdminId) ?? filteredAdmins[0] ?? null;
  const selectedRole = selectedAdmin ? normalizeRole(selectedAdmin.role) : "support_agent";
  const roleDefaults = useMemo(() => new Set(ROLE_DEFAULTS[selectedRole]), [selectedRole]);
  const orderedPermissions = useMemo(
    () => [...PERMISSIONS].sort((left, right) => Number(roleDefaults.has(right.key)) - Number(roleDefaults.has(left.key))),
    [roleDefaults]
  );
  const hasChanges = selectedAdmin !== null && !arePermissionSetsEqual(savedPermissions, draftPermissions);

  const {
    data: permissionsResult,
    loading: permissionsLoading,
    error: permissionsError,
    reload: reloadPermissions,
  } = useAsyncData(async () => {
    if (!selectedAdmin) return null;
    return adminPermissionsApi.get(selectedAdmin.id);
  }, [selectedAdmin?.id]);

  const { mutate: savePermissions, loading: saving } = useMutation((permissions: AdminPermission[]) => {
    if (!selectedAdmin) return Promise.resolve(null);
    return adminPermissionsApi.update(selectedAdmin.id, permissions, departmentIds);
  });

  useEffect(() => {
    if (filteredAdmins.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedAdminId("");
      return;
    }
    if (!selectedAdminId || !filteredAdmins.some((admin) => admin.id === selectedAdminId)) {
      setSelectedAdminId(filteredAdmins[0].id);
    }
  }, [filteredAdmins, selectedAdminId]);

  useEffect(() => {
    if (!selectedAdminId || !permissionsResult) return;
    const incoming = new Set(
      permissionsResult.permissions
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedPermissions(incoming);
    setDraftPermissions(new Set(incoming));
    setDepartmentIds(permissionsResult.departments.map((department) => department.id));
  }, [permissionsResult, selectedAdminId]);

  function togglePermission(permission: AdminPermission) {
    if (saving) return;
    setDraftPermissions((current) => {
      const next = new Set(current);
      if (next.has(permission)) {
        next.delete(permission);
      } else {
        next.add(permission);
      }
      return next;
    });
  }

  async function handleSave() {
    if (!selectedAdmin || !hasChanges || saving) return;
    await perform(() => savePermissions([...draftPermissions]), {
      success: t("permissions.savedSuccess"),
      refresh: ["admins"],
      onSuccess: () => {
        setSavedPermissions(new Set(draftPermissions));
        emitAdminRefresh("admins");
        reloadPermissions();
        if (selectedAdmin.id === user?.id) {
          void refresh();
        }
      },
    });
  }

  if (!canManagePermissions) {
    return <AccessDeniedState description={t("permissions.accessDenied")} />;
  }

  if (isInitialAsyncLoad(loading, adminsResult)) {
    return <DataTableSkeleton columns={[t("common.name"), t("common.note"), t("permissions.permissionType"), t("common.actions")]} rows={8} />;
  }

  if (error && adminsResult === null) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  if (admins.length === 0) {
    return <EmptyState title={t("permissions.noAdmins")} description={t("permissions.noAdminsDescription")} />;
  }

  const isRefreshing = isAsyncRefreshing(loading || permissionsLoading, adminsResult);

  return (
    <section>
      <div className="mb-5 flex flex-wrap gap-2">
        {ROLE_FILTERS.map((filter, index) => (
          <button
            key={filter}
            type="button"
            className={[
              "rounded-full border px-4 py-2 text-sm font-bold transition",
              roleFilter === filter
                ? "border-[var(--joballa-primary)] bg-[var(--joballa-primary)] text-[var(--joballa-on-primary)]"
                : "border-[var(--joballa-border)] bg-[var(--joballa-card)] text-[var(--joballa-muted)] hover:text-[var(--joballa-primary)]",
            ].join(" ")}
            onClick={() => setRoleFilter(filter)}
          >
            {t(ROLE_FILTER_KEYS[index])}
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.08em] text-[var(--joballa-muted)]">
          {t("permissions.selectAdmin")}
          <select
            className="min-h-12 min-w-0 w-full rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 text-sm font-semibold normal-case tracking-normal text-[var(--joballa-fg)] outline-none sm:min-w-[360px]"
            value={selectedAdmin?.id ?? ""}
            onChange={(event) => setSelectedAdminId(event.target.value)}
          >
            {filteredAdmins.map((admin) => (
              <option key={admin.id} value={admin.id}>
                {admin.name} ({formatRoleLabel(admin.role)})
              </option>
            ))}
          </select>
        </label>
        <LoadingButton
          loading={saving}
          loadingLabel={t("common.saving")}
          disabled={!hasChanges}
          onClick={() => void handleSave()}
          className="min-h-12 w-full rounded-[8px] px-5 sm:w-fit"
        >
          {t("common.save")}
        </LoadingButton>
      </div>

      {filteredAdmins.length === 0 ? (
        <EmptyState title={t("permissions.noAdmins")} description={t("permissions.noAdminsDescription")} />
      ) : (
        <div
          aria-busy={isRefreshing}
          className={[
            "overflow-hidden rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)]",
            isRefreshing ? "pointer-events-none opacity-60 transition-opacity" : "",
          ].join(" ")}
        >
          <div className="hidden border-b border-[var(--joballa-border)] bg-[var(--joballa-page-tint)] px-5 py-4 text-xs font-bold uppercase tracking-[0.08em] text-[var(--joballa-muted)] xl:grid xl:grid-cols-[minmax(180px,1fr)_minmax(260px,1.5fr)_160px_170px]">
            <span>{t("common.name")}</span>
            <span>{t("common.note")}</span>
            <span>{t("permissions.permissionType")}</span>
            <span>{t("common.actions")}</span>
          </div>
          {permissionsError ? (
            <div className="p-5">
              <ErrorState message={permissionsError} onRetry={reloadPermissions} />
            </div>
          ) : (
            orderedPermissions.map((permission) => {
              const assigned = draftPermissions.has(permission.key);
              const isDefault = roleDefaults.has(permission.key);
              const disabled = saving;

              return (
                <article
                  key={permission.key}
                  className="grid gap-3 border-b border-[var(--joballa-border)] px-5 py-4 last:border-0 xl:grid-cols-[minmax(180px,1fr)_minmax(260px,1.5fr)_160px_170px] xl:items-center"
                >
                  <div>
                    <p className="text-sm font-bold">{t(permission.labelKey)}</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--joballa-muted)] xl:hidden">
                      {t(permission.descriptionKey)}
                    </p>
                  </div>
                  <p className="hidden text-sm font-medium text-[var(--joballa-muted)] xl:block">
                    {t(permission.descriptionKey)}
                  </p>
                  <span
                    className={[
                      "w-fit rounded-full px-3 py-1 text-xs font-normal",
                      isDefault
                        ? "bg-[var(--joballa-page-tint)] text-[var(--joballa-muted)]"
                        : "bg-[var(--joballa-warning-bg)] text-[var(--joballa-warning-fg)]",
                    ].join(" ")}
                  >
                    {isDefault ? t("permissions.default") : t("permissions.custom")}
                  </span>
                  <button
                    type="button"
                    disabled={disabled}
                    className="flex w-fit items-center gap-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-70"
                    onClick={() => togglePermission(permission.key)}
                  >
                    <span
                      className={[
                        "grid h-5 w-5 place-items-center rounded-[4px] border transition",
                        assigned
                          ? "border-[var(--joballa-primary)] bg-[var(--joballa-primary)] text-[var(--joballa-on-primary)]"
                          : "border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] text-transparent",
                      ].join(" ")}
                    >
                      <Check size={14} strokeWidth={3} />
                    </span>
                    {assigned ? t("permissions.assigned") : t("permissions.unassigned")}
                  </button>
                </article>
              );
            })
          )}
        </div>
      )}

    </section>
  );
}
