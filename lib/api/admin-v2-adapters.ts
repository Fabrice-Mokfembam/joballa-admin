/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  AdminListItem,
  AdminMe,
  AdminPermission,
  AdminProfile,
  AuditLogListItem,
  DashboardData,
  DepartmentDetail,
  DocumentDetail,
  JobDetail,
  KycListItem,
  PlatformUser,
  ReportDetail,
} from "./types";

type Session = {
  id: string;
  name: string;
  email: string;
  role: AdminMe["role"];
  isActive?: boolean;
  status?: "active" | "suspended";
  departmentId?: string | null;
  permissions: string[];
  departments?: Array<{ id: string; name: string }>;
  lastLoginAt?: string | null;
};

export function mapSession(session: Session): AdminMe {
  return {
    id: session.id,
    name: session.name,
    email: session.email,
    role: session.role,
    status: session.status ?? (session.isActive ? "active" : "suspended"),
    permissions: session.permissions as AdminPermission[],
    departments: session.departments,
    lastLoginAt: session.lastLoginAt,
    departmentId: session.departmentId,
  };
}

export function mapDashboard(raw: Record<string, unknown>): DashboardData {
  if (Array.isArray(raw.stats)) return raw as DashboardData;
  const jobs = raw.jobs as DashboardData["jobs"];
  const users = raw.users as DashboardData["users"];
  const profiles = raw.profiles as DashboardData["profiles"];
  const kyc = raw.kyc as DashboardData["kyc"];
  const documents = raw.documents as DashboardData["documents"];
  const disputes = raw.disputes as DashboardData["disputes"];
  const summaries = [
    { label: "Total Jobs", value: jobs?.totalJobs, change: "" },
    { label: "Total Users", value: users?.totalUsers ?? profiles?.totalProfiles, change: "" },
    {
      label: "Pending Reviews",
      value:
        kyc?.pendingKyc !== undefined || documents?.pendingDocuments !== undefined
          ? (kyc?.pendingKyc ?? 0) + (documents?.pendingDocuments ?? 0)
          : undefined,
      change: "",
    },
    { label: "Open Disputes", value: disputes?.openDisputes, change: "" },
  ].filter((summary): summary is { label: string; value: number; change: string } => summary.value !== undefined);
  const blocks = Object.entries(raw).filter(([key, value]) => key !== "session" && value && typeof value === "object");
  const fallbackStats = blocks.flatMap(([block, value]) =>
    Object.entries(value as Record<string, unknown>)
      .filter(([, metric]) => typeof metric === "number")
      .map(([label, metric]) => ({
        label: `${block} ${label}`.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\b\w/g, (c) => c.toUpperCase()),
        value: metric as number,
        change: "",
      }))
  );
  return { ...raw, stats: [...summaries, ...fallbackStats].slice(0, 4) } as DashboardData;
}

export function mapKyc(raw: any): KycListItem {
  if (raw.user && !raw.worker) return raw as KycListItem;
  return {
    id: raw.id,
    userId: raw.worker.id,
    user: raw.worker.fullName,
    email: raw.worker.email ?? "",
    phone: raw.worker.phone ?? undefined,
    photoUrl: raw.worker.photoUrl ?? null,
    city: raw.worker.city ?? null,
    region: raw.worker.region ?? null,
    isVerified: raw.worker.isVerified,
    submittedAt: raw.submittedAt,
    status: raw.status,
    reason: raw.rejectionReason,
    type: String(raw.kycType).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    previewUrls: [raw.frontUrl, raw.backUrl, raw.selfieUrl].filter(Boolean),
  };
}

export function mapDocument(raw: any): DocumentDetail {
  if (raw.type && !raw.documentName) return raw as DocumentDetail;
  return {
    id: raw.id,
    userId: raw.submitter.id,
    user: {
      id: raw.submitter.id,
      name: raw.submitter.fullName,
      email: raw.submitter.email ?? "",
      role: raw.submitter.role,
      status: "",
    },
    type: raw.documentName,
    departmentId: "",
    department: raw.submitter.role,
    submittedAt: raw.submittedAt,
    status: raw.verificationStatus,
    risk: "low",
    rejectionReason: raw.rejectionReason ?? raw.verificationNotes,
    file: {
      url: raw.documentUrl,
      fileName: raw.documentName,
      mimeType: raw.documentType === "pdf" ? "application/pdf" : "image/jpeg",
      sizeBytes: 0,
    },
  };
}

export function mapJob(raw: any): JobDetail {
  if (raw.departmentId) return raw as JobDetail;
  return {
    id: raw.id,
    title: raw.title,
    departmentId: raw.department.id,
    department: raw.department.name,
    clientId: raw.employer.userId,
    client: raw.employer.companyName,
    pay: `${Number(raw.payAmount).toLocaleString()} XAF`,
    location: [raw.city, raw.country].filter(Boolean).join(", "),
    status: raw.status,
    availability: String(raw.employmentType).replace(/_/g, " "),
    createdAt: raw.createdAt,
    applications: 0,
    rejectionReason: raw.rejectionReason?.reasonText ?? null,
    moderationNotes: raw.adminNotes,
    tierReason: raw.submissionScore?.tier ?? null,
    level: raw.experienceLevel ?? undefined,
    type: String(raw.employmentType).replace(/_/g, " "),
    cadence: raw.jobType,
    startDate: raw.startDate ?? undefined,
    duration: raw.duration ?? undefined,
    about: raw.description,
    requirements: raw.requirements ?? [],
  };
}

export function mapDepartment(raw: any): DepartmentDetail {
  if (raw.category !== undefined) return raw as DepartmentDetail;
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? "",
    category: raw.name,
    jobs: raw.jobPostsCount ?? raw.jobs ?? 0,
    applications: raw.applicationsCount ?? raw.applications ?? 0,
    hires: raw.hiresCount ?? raw.hires ?? 0,
    status: raw.isActive ? "active" : "inactive",
    createdAt: raw.createdAt,
  };
}

export function mapUser(raw: any): PlatformUser {
  if (raw.name && raw.joinedAt) return raw as PlatformUser;
  const profile = raw.profile ?? {};
  return {
    id: raw.id,
    name: profile.fullName ?? profile.companyName ?? raw.email ?? raw.phone ?? "Unknown user",
    role: raw.role,
    email: raw.email ?? "",
    phone: raw.phone ?? undefined,
    status: raw.isActive ? "active" : "suspended",
    joinedAt: raw.createdAt,
    lastActivityAt: raw.createdAt,
  };
}

export function mapProfile(raw: any): AdminProfile {
  if (raw.name && raw.role) return raw as AdminProfile;
  return {
    id: raw.id,
    userId: raw.userId,
    name: raw.fullName ?? raw.organization ?? "Unnamed profile",
    email: raw.email ?? "",
    phone: raw.phone ?? undefined,
    role: raw.profileType,
    status: raw.verificationStatus,
    accountStatus: raw.accountStatus,
    dateOfBirth: raw.dateOfBirth ?? null,
    createdAt: raw.memberSince,
    createdBy: raw.createdByAdmin,
    createdByAdminId: raw.createdByAdminId ?? null,
    companyName: raw.organization ?? null,
    photoUrl: raw.photoUrl,
    position: raw.role ?? null,
    region: raw.region,
    city: raw.city,
      country: raw.country,
      isVerified: raw.isVerified,
      profileViews: raw.profileViews,
      shortBio: raw.shortBio ?? null,
      isAdminCreated: raw.isAdminCreated,
    };
  }

function formatDisputePartyName(party?: {
  fullName?: string | null;
  email?: string | null;
}): string {
  if (!party) return "Unknown";
  return party.fullName?.trim() || party.email?.trim() || "Unknown";
}

function normalizeDisputeStatus(status: string): string {
  return status.toLowerCase() === "in_review" ? "open" : status;
}

export function mapDispute(raw: any): ReportDetail {
  if (raw.reporterParty && raw.reportedParty) return raw as ReportDetail;

  const reporterParty = raw.reporter ?? raw.worker;
  const reportedParty = raw.reported ?? raw.employer;

  if (typeof raw.reporter === "string") {
    return {
      id: raw.id,
      subject: raw.subject,
      reporter: raw.reporter,
      reported: raw.reported ?? raw.company ?? "Unknown",
      status: normalizeDisputeStatus(raw.status),
      createdAt: raw.createdAt,
      lastActivityAt: raw.lastActivityAt ?? raw.resolvedAt ?? raw.createdAt,
      description: raw.description,
      resolution: raw.resolution ?? raw.resolutionNotes ?? null,
      adminNotes: raw.adminNotes,
    };
  }

  return {
    id: raw.id,
    subject: raw.subject,
    reporter: formatDisputePartyName(reporterParty),
    reported: formatDisputePartyName(reportedParty),
    reporterParty,
    reportedParty,
    status: normalizeDisputeStatus(raw.status),
    createdAt: raw.createdAt,
    lastActivityAt: raw.resolvedAt ?? raw.createdAt,
    description: raw.description,
    resolution: raw.resolutionNotes ?? null,
    adminNotes: raw.adminNotes,
  };
}

export function mapAdmin(raw: any): AdminListItem {
  if (raw.status && !raw.isActive) return raw as AdminListItem;
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    role: raw.role,
    status: raw.status,
    permissions: raw.permissions as AdminPermission[],
    createdAt: raw.createdAt,
    lastLoginAt: raw.lastLoginAt,
    departments: raw.departments,
  };
}

export function mapLog(raw: any): AuditLogListItem {
  if (raw.actor) return raw as AuditLogListItem;
  return {
    id: raw.id,
    action: raw.action,
    actorAdminId: raw.adminId,
    actor: raw.adminName,
    actorRole: raw.adminRole ?? raw.role ?? null,
    scope: raw.module,
    entityType: raw.module,
    entityId: raw.id,
    entityLabel: raw.details,
    oldValues: {},
    newValues: {},
    ipAddress: raw.ipAddress,
    userAgent: "",
    createdAt: raw.createdAt,
  };
}

export function mapPage<T, U>(page: { items: T[]; page: number; limit: number; total: number; totalPages: number }, mapper: (item: T) => U) {
  return { ...page, items: page.items.map(mapper) };
}
