import {
  apiDelete,
  apiDownload,
  apiGet,
  apiPatch,
  apiPost,
  apiPostForm,
  apiPut,
  apiRequest,
  getRefreshToken,
  tryRefreshSession,
} from "./client";
import { filterStoredDepartments } from "@/lib/constants/departments";
import { ApiError } from "./errors";
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  mapDashboard,
  mapDepartment,
  mapDispute,
  mapDocument,
  mapJob,
  mapKyc,
  mapLog,
  mapPage,
  mapProfile,
  mapSession,
  mapUser,
} from "./admin-v2-adapters";
import type {
  AdminPermission,
  AdminListItem,
  AdminProfile,
  AdminRole,
  DashboardAnalyticsData,
  DashboardAnalyticsRange,
  FinanceRecord,
  FinanceSummary,
  ListParams,
  LoginResponse,
  RefreshResponse,
  Paginated,
} from "./types";

function listParams(params?: ListParams) {
  if (!params) return undefined;
  const { sort, order, createdByAdminId, createdByAdmin, module, action, startDate, endDate, adminId, idType, reviewerId, scope, entityType, departmentId, employmentType, jobType, experienceLevel, priority, provider, isActive, country, city, profileType, isAdminCreated, verifiedOnly, ...documented } = params;
  void sort; void order; void createdByAdminId; void createdByAdmin; void module; void action;
  void startDate; void endDate; void adminId; void idType; void reviewerId; void scope; void entityType;
  void departmentId; void employmentType;
  void jobType; void experienceLevel; void priority; void provider; void isActive; void country;
  void city; void profileType; void isAdminCreated; void verifiedOnly;
  return documented as Record<string, string | number | boolean | undefined>;
}

// Auth
export const authApi = {
  login: async (identifier: string, password: string) => {
    const result = await apiRequest<any>("/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
      skipAuth: true,
    });
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      session: mapSession(result.session),
    } as LoginResponse;
  },
  logout: () => apiPost<{ loggedOut: boolean }>("/admin/auth/logout"),
  refresh: async (): Promise<RefreshResponse> => {
    const accessToken = await tryRefreshSession();
    if (!accessToken) {
      throw new ApiError("Session expired. Please sign in again.", 401);
    }
    return { accessToken, refreshToken: getRefreshToken() ?? "" };
  },
  me: async (options?: { skipSessionExpired?: boolean }) => {
    const result = await apiRequest<any>("/admin/me", {
      method: "GET",
      skipSessionExpired: options?.skipSessionExpired,
    });
    return mapSession(result.session);
  },
  updateMe: async (body: { name?: string; currentPassword?: string; newPassword?: string }) => {
    const result = await apiPatch<any>("/admin/me", body);
    return mapSession(result.session);
  },
};

// Dashboard
export const dashboardApi = {
  get: async () => mapDashboard(await apiGet<Record<string, unknown>>("/admin/dashboard")),
  analytics: (params?: {
    range?: DashboardAnalyticsRange;
    startDate?: string;
    endDate?: string;
  }) =>
    apiGet<DashboardAnalyticsData>("/admin/dashboard/analytics", params),
  exportReport: async (params?: {
    range?: DashboardAnalyticsRange | string;
    startDate?: string;
    endDate?: string;
    format?: "csv";
  }) => {
    const { blob, filename } = await apiDownload("/admin/dashboard/export", {
      ...params,
      format: params?.format ?? "csv",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  },
};

// KYC
export const kycApi = {
  list: async (params?: ListParams) => mapPage(await apiGet<Paginated<any>>("/admin/kyc", params ? {
    page: params.page,
    limit: params.limit,
    sort: params.sort,
    order: params.order,
    search: params.search,
    status: params.status,
    idType: params.idType,
  } : undefined), mapKyc),
  get: async (kycId: string) => mapKyc(await apiGet<any>(`/admin/kyc/${kycId}`)),
  approve: (kycId: string) => apiPatch(`/admin/kyc/${kycId}/approve`),
  reject: (kycId: string, reason: string) => apiPatch(`/admin/kyc/${kycId}/reject`, { reason }),
  updateStatus: (kycId: string, status: "pending" | "verified" | "rejected", reason?: string) =>
    apiPatch(`/admin/kyc/${kycId}/status`, { status, ...(reason ? { reason } : {}) }),
};

// Documents
export const documentsApi = {
  list: async (params?: ListParams) => mapPage(await apiGet<Paginated<any>>("/admin/documents", params ? {
    page: params.page,
    limit: params.limit,
    order: params.order,
    status: params.status,
    reviewerId: params.reviewerId,
  } : undefined), mapDocument),
  get: async (documentId: string) => mapDocument(await apiGet<any>(`/admin/documents/${documentId}`)),
  approve: async (documentId: string) => mapDocument(await apiPatch<any>(`/admin/documents/${documentId}/approve`)),
  reject: async (documentId: string, reason: string) => mapDocument(await apiPatch<any>(`/admin/documents/${documentId}/reject`, { reason })),
};

// Jobs
export const jobsApi = {
  list: async (params?: ListParams) => {
    return mapPage(await apiGet<Paginated<any>>("/admin/jobs", params ? {
      page: params.page,
      limit: params.limit,
      sort: params.sort,
      order: params.order,
      search: params.search,
      status: params.status,
      departmentId: params.departmentId,
      employmentType: params.employmentType,
      jobType: params.jobType,
      experienceLevel: params.experienceLevel,
    } : undefined), mapJob);
  },
  pending: async (params?: ListParams) => mapPage(await apiGet<Paginated<any>>("/admin/jobs/pending", params ? {
    page: params.page,
    limit: params.limit,
    sort: params.sort,
    order: params.order,
    search: params.search,
    departmentId: params.departmentId,
    employmentType: params.employmentType,
    jobType: params.jobType,
    experienceLevel: params.experienceLevel,
  } : undefined), mapJob),
  rejected: async (params?: ListParams) => mapPage(await apiGet<Paginated<any>>("/admin/jobs/rejected", params ? {
    page: params.page,
    limit: params.limit,
    sort: params.sort,
    order: params.order,
    search: params.search,
    departmentId: params.departmentId,
    employmentType: params.employmentType,
    jobType: params.jobType,
    experienceLevel: params.experienceLevel,
  } : undefined), mapJob),
  approve: async (jobId: string) => mapJob(await apiPatch<any>(`/admin/jobs/${jobId}/approve`)),
  reject: async (jobId: string, reason: string) => mapJob(await apiPatch<any>(`/admin/jobs/${jobId}/reject`, { reason })),
  updateStatus: async (jobId: string, status: string) =>
    mapJob(await apiPatch<any>(`/admin/jobs/${jobId}/status`, { status })),
  create: async (body: Record<string, unknown>) => mapJob(await apiPost<any>("/admin/jobs", body)),
};

// Reports
export const reportsApi = {
  list: async (params?: ListParams) => mapPage(await apiGet<Paginated<any>>("/admin/disputes", params ? {
    page: params.page,
    limit: params.limit,
    order: params.order,
    status: params.status,
    priority: params.priority,
    departmentId: params.departmentId,
  } : undefined), mapDispute),
  get: async (reportId: string) => mapDispute(await apiGet<any>(`/admin/disputes/${reportId}`)),
  resolve: async (
    reportId: string,
    resolutionDecision: "approve_worker" | "approve_employer" | "partial" | "dismiss",
    resolutionNotes: string,
    adminNotes?: string
  ) => mapDispute(await apiPatch<any>(`/admin/disputes/${reportId}/resolve`, {
    resolutionDecision,
    resolutionNotes,
    ...(adminNotes ? { adminNotes } : {}),
  })),
};

// Admins (staff accounts — not assigned to departments)
export const adminsApi = {
  list: (params?: ListParams) =>
    apiGet<Paginated<AdminListItem>>("/admin/admins", params ? {
      page: params.page,
      limit: params.limit,
      search: params.search,
      role: params.role,
    } : undefined),
  get: (adminId: string) => apiGet<AdminListItem>(`/admin/admins/${adminId}`),
  create: (body: {
    fullName: string;
    email: string;
    role: Exclude<AdminRole, "super_admin" | "admin">;
    departmentId?: string;
    password?: string;
  }) => apiPost<AdminListItem>("/admin/admins", body),
  update: (adminId: string, body: { fullName?: string; email?: string; role?: Exclude<AdminRole, "super_admin" | "admin">; password?: string }) =>
    apiPatch<AdminListItem>(`/admin/admins/${adminId}`, body),
  delete: (adminId: string) => apiDelete<{ deleted: boolean }>(`/admin/admins/${adminId}`),
  suspend: (adminId: string) => apiPatch<AdminListItem>(`/admin/admins/${adminId}/suspend`),
  reactivate: (adminId: string) => apiPatch<AdminListItem>(`/admin/admins/${adminId}/activate`),
};

export const adminPermissionsApi = {
  list: (params?: ListParams) =>
    apiGet<Paginated<{ adminId: string; name: string; email: string; role: string; permissions: AdminPermission[]; departments: Array<{ id: string; name: string }> }>>("/admin/permissions", listParams(params)),
  get: (adminId: string) =>
    apiGet<{ adminId: string; permissions: AdminPermission[]; departments: Array<{ id: string; name: string }> }>(`/admin/permissions/${adminId}`),
  update: (adminId: string, permissions: AdminPermission[], departmentIds: string[]) =>
    apiPut(`/admin/permissions/${adminId}`, {
      permissions,
      departmentIds,
    }),
  grant: (adminId: string, permission: AdminPermission) =>
    apiPost(`/admin/permissions/${adminId}/grant`, { permission }),
  revoke: (adminId: string, permission: AdminPermission) =>
    apiDelete(`/admin/permissions/${adminId}/revoke/${encodeURIComponent(permission)}`),
  assignDepartment: (adminId: string, departmentId: string) =>
    apiPost(`/admin/permissions/${adminId}/departments`, { departmentId }),
  removeDepartment: (adminId: string, departmentId: string) =>
    apiDelete(`/admin/permissions/${adminId}/departments/${departmentId}`),
};

// Departments
export const departmentsApi = {
  list: async (params?: ListParams) => {
    const page = mapPage(
      await apiGet<Paginated<any>>(
        "/admin/departments",
        params
          ? {
              page: params.page,
              limit: params.limit,
              order: params.order,
              search: params.search,
              status: params.status,
            }
          : undefined
      ),
      mapDepartment
    );
    return { ...page, items: filterStoredDepartments(page.items) };
  },
  get: async (departmentId: string) => mapDepartment(await apiGet<any>(`/admin/departments/${departmentId}`)),
  create: (body: {
    name: string;
    description: string;
  }) => apiPost<any>("/admin/departments", body).then(mapDepartment),
  update: (
    departmentId: string,
    body: { name?: string; description?: string }
  ) => apiPatch<any>(`/admin/departments/${departmentId}`, body).then(mapDepartment),
  delete: (departmentId: string) => apiDelete<{ deleted: boolean }>(`/admin/departments/${departmentId}`),
};

// Users
export const usersApi = {
  list: async (params?: ListParams) => mapPage(await apiGet<Paginated<any>>("/admin/users", params ? {
    page: params.page,
    limit: params.limit,
    order: params.order,
    search: params.search,
    role: params.role,
    isActive: params.isActive,
    country: params.country,
    city: params.city,
  } : undefined), mapUser),
  get: async (userId: string) => mapUser(await apiGet<any>(`/admin/users/${userId}`)),
  suspend: (userId: string) => apiPatch(`/admin/users/${userId}/suspend`),
  reactivate: (userId: string) => apiPatch(`/admin/users/${userId}/activate`),
  delete: (userId: string) => apiDelete(`/admin/users/${userId}`),
};

// Profiles created from the admin panel
export const profilesApi = {
  list: async (params?: ListParams): Promise<Paginated<AdminProfile>> =>
    mapPage(
      await apiGet<Paginated<any>>("/admin/profiles", params ? {
        page: params.page,
        limit: params.limit,
        order: params.order,
        role: params.role,
        profileType: params.profileType,
        isAdminCreated: params.isAdminCreated,
        createdByAdmin: params.createdByAdmin,
      } : undefined),
      mapProfile
    ),
  get: async (profileId: string): Promise<AdminProfile> =>
    mapProfile(await apiGet<any>(`/admin/profiles/${profileId}`)),
  create: async (body: {
    profileType: "worker" | "employer";
    fullName: string;
    email: string;
    phone: string;
    locationRegionCity: string;
    roleOrPosition?: string;
    organization?: string;
    shortBio?: string;
    profilePhoto?: File | null;
  }): Promise<AdminProfile> => {
    const { profilePhoto, ...fields } = body;
    if (profilePhoto) {
      const formData = new FormData();
      formData.append("profilePhoto", profilePhoto);
      for (const [key, value] of Object.entries(fields)) {
        if (value != null && value !== "") formData.append(key, String(value));
      }
      return mapProfile(await apiPostForm<any>("/admin/profiles", formData));
    }
    return mapProfile(await apiPost<any>("/admin/profiles", fields));
  },
  update: async (profileId: string, body: {
    fullName?: string;
    roleOrPosition?: string;
    organization?: string;
    shortBio?: string;
  }): Promise<AdminProfile> => mapProfile(await apiPatch<any>(`/admin/profiles/${profileId}`, body)),
  delete: (profileId: string): Promise<{ deleted: boolean }> =>
    apiDelete(`/admin/profiles/${profileId}`),
  suspend: async (profileId: string): Promise<AdminProfile> =>
    mapProfile(await apiPatch<any>(`/admin/profiles/${profileId}/suspend`)),
  activate: async (profileId: string): Promise<AdminProfile> =>
    mapProfile(await apiPatch<any>(`/admin/profiles/${profileId}/activate`)),
};

// Audit logs
export const auditLogsApi = {
  list: async (params?: ListParams) => mapPage(await apiGet<Paginated<any>>("/admin/logs", params ? {
    page: params.page,
    limit: params.limit,
    sort: params.sort,
    order: params.order,
    search: params.search,
    module: params.module,
    action: params.action,
    startDate: params.startDate,
    endDate: params.endDate,
    adminId: params.adminId,
  } : undefined), mapLog),
};

export const financeApi = {
  list: (params?: ListParams): Promise<Paginated<FinanceRecord>> =>
    apiGet("/admin/finance/records", params ? {
      page: params.page,
      limit: params.limit,
      order: params.order,
      status: params.status,
      provider: params.provider,
      search: params.search,
    } : undefined),
  get: (recordId: string): Promise<FinanceRecord> =>
    apiGet(`/admin/finance/records/${recordId}`),
  summary: (): Promise<FinanceSummary> => apiGet("/admin/finance/summary"),
};
