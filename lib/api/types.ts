export type AdminRole = "super_admin" | "admin" | "admin_manager" | "verifier" | "support_agent";

export type AdminPermission =
  | "auth:session"
  | "dashboard:read"
  | "kyc:read"
  | "kyc:review"
  | "documents:read"
  | "documents:review"
  | "jobs:read"
  | "jobs:moderate"
  | "jobs:manage"
  | "jobs:verify"
  | "reports:read"
  | "reports:resolve"
  | "departments:read"
  | "departments:manage"
  | "admins:manage"
  | "users:read"
  | "users:manage"
  | "profiles:read"
  | "profiles:create"
  | "profiles:manage"
  | "finance:read"
  | "analytics:read"
  | "settings:manage"
  | "audit_logs:read"
  | "view_platform_logs"
  | "view_platform_analytics"
  | "manage_admins"
  | "manage_jobs"
  | "manage_platform_users"
  | "verify_jobs"
  | "manage_departments"
  | "resolve_disputes"
  | "verify_documents"
  | "verify_kyc"
  | "view_financial_records"
  | "create_profiles";

export type ApiSuccess<T> = {
  success: true;
  data: T;
  message?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ApiErrorBody = {
  statusCode?: number;
  error: string | { code: string; message: string };
  message?: string | string[];
  path?: string;
  timestamp?: string;
};

export type AdminMe = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  /** @deprecated Backend no longer scopes admins to departments. */
  departmentId?: string | null;
  permissions: AdminPermission[];
  status: "active" | "suspended";
  departments?: Array<{ id: string; name: string }>;
  lastLoginAt?: string | null;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  session: AdminMe;
};

export type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
};

export type DashboardStat = { label: string; value: string | number; change: string };

export type DashboardData = {
  stats: DashboardStat[];
  jobs?: { totalJobs: number; pendingJobs: number; approvedJobs: number; rejectedJobs: number; jobsThisMonth: number };
  profiles?: { totalProfiles: number; workers: number; employers: number; verifiedProfiles: number; unverifiedProfiles: number };
  users?: { totalUsers: number; activeUsers: number };
  kyc?: { pendingKyc: number; verifiedKyc: number; rejectedKyc: number };
  documents?: { pendingDocuments: number; approvedDocuments: number; rejectedDocuments: number };
  disputes?: { totalDisputes: number; openDisputes: number; resolvedDisputes: number; closedDisputes: number };
  finance?: { totalTransactions: number; totalAmountIn: number; totalAmountOut: number; netBalance: number };
  departments?: { totalDepartments: number; activeDepartments: number; inactiveDepartments: number };
};

export type DashboardAnalyticsRange = "7d" | "30d" | "90d" | "1y";

export type DashboardAnalyticsData = {
  range: { start: string; end: string };
  kpis: {
    totalJobs: number;
    jobsCreatedThisMonth: number;
    totalApplications: number;
    applicationsThisMonth: number;
    activeUsers: number;
    activeUsersThisMonth: number;
    kycSubmissions: number;
    kycSubmissionPercentChange: number;
    verifiedUsers: number;
    verifiedUsersThisMonth: number;
  };
  applicationsOverTime: Array<{ date: string; applications: number }>;
  jobsByStatus: {
    active: number;
    draft: number;
    paused: number;
    closed: number;
  };
  documentsByStatus: {
    approved: number;
    pending: number;
    rejected: number;
  };
  kycFunnel: {
    submitted: number;
    underReview: number;
    verified: number;
    rejected: number;
  };
  applicationsBySource: Array<{ source: string; applications: number }>;
  topDepartments: Array<{
    departmentId: string;
    departmentName: string;
    jobs: number;
    applications: number;
    hires: number;
    conversionRate: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    createdAt: string;
  }>;
};

export type FinanceRecord = {
  id: string;
  fapshiTransactionId: string | null;
  type: string;
  mode: string;
  status: string;
  provider: string;
  amount: number;
  currency: string;
  from: { id: string; name: string; email: string | null; type: "employer" };
  to: { id: string; name: string; email: string | null; type: "worker" };
  engagementId: string;
  payPeriod: string | null;
  receiptNumber: string | null;
  failureReason: string | null;
  initiatedAt: string;
  completedAt: string | null;
};

export type FinanceSummary = {
  totalTransactions: number;
  totalAmountIn: number;
  totalAmountOut: number;
  netBalance: number;
};

export type KycListItem = {
  id: string;
  userId: string;
  user: string;
  email: string;
  submittedAt: string;
  status: string;
  reason: string | null;
  type: string;
  previewUrls: string[];
  phone?: string;
  photoUrl?: string | null;
  city?: string | null;
  region?: string | null;
  isVerified?: boolean;
};

export type DocumentUserSummary = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
};

export type DocumentListItem = {
  id: string;
  userId: string;
  user: string | DocumentUserSummary;
  type: string;
  departmentId: string;
  department: string;
  submittedAt: string;
  status: string;
  risk: "low" | "medium" | "high";
};

export type DocumentDetail = DocumentListItem & {
  file?: { url: string; fileName: string; mimeType: string; sizeBytes: number };
  rejectionReason?: string | null;
  reviewHistory?: ReviewHistory;
};

export type JobListItem = {
  id: string;
  title: string;
  departmentId: string;
  department: string;
  clientId: string;
  client: string;
  pay: string;
  location: string;
  status: string;
  availability: string;
  createdAt: string;
  applications: number;
  createdByAdmin?: boolean;
  posterPhotoUrl?: string | null;
  postedByType?: "worker" | "company" | null;
  rejectionReason?: string | null;
  moderationNotes?: string | null;
  issueReason?: string | null;
  tierReason?: string | null;
};

export type JobDetail = JobListItem & {
  level?: string;
  type?: string;
  cadence?: string;
  startDate?: string;
  duration?: string;
  about?: string;
  requirements?: string[];
  moderationNotes?: string;
  rejectionReason?: string | null;
  reviewHistory?: ReviewHistory;
};

export type DisputeParty = {
  userId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: string;
};

export type ReportListItem = {
  id: string;
  subject: string;
  reporter: string;
  reported: string;
  reporterParty?: DisputeParty;
  reportedParty?: DisputeParty;
  status: string;
  createdAt: string;
  lastActivityAt: string;
};

export type ReportDetail = ReportListItem & {
  description?: string;
  resolution?: string | null;
  adminNotes?: string | null;
  reviewHistory?: ReviewHistory;
};

export type DepartmentListItem = {
  id: string;
  name: string;
  /** Department contact email. Legacy API may mirror this as `admin`. */
  email?: string;
  admin?: string;
  slug?: string;
  category: string;
  jobs: number;
  applications?: number;
  hires?: number;
  pending?: number;
  disputes?: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  employerProfileId?: string;
  description?: string;
};

export type AdminListItem = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  status: string;
  permissions?: AdminPermission[];
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
  departments?: Array<{ id: string; name: string }>;
};

export type AdminProfile = {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  role: "worker" | "employer";
  status: string;
  accountStatus?: "active" | "suspended";
  dateOfBirth?: string | null;
  createdAt: string;
  createdByAdminId?: string | null;
  createdBy?: string | null;
  companyName?: string | null;
  photoUrl?: string | null;
  position?: string | null;
  region?: string | null;
  city?: string | null;
  country?: string | null;
  isVerified?: boolean;
  profileViews?: number;
  shortBio?: string | null;
  isAdminCreated?: boolean;
};

export type DepartmentDetail = DepartmentListItem & {
  adminUserId?: string;
  description?: string;
  createdAt: string;
};

export type PlatformUser = {
  id: string;
  name: string;
  role: "worker" | "employer";
  email: string;
  status: string;
  phone?: string;
  photoUrl?: string | null;
  joinedAt: string;
  lastActivityAt: string;
};

export type AdminUserWorkHistory = {
  id: string;
  jobTitle: string;
  companyName: string;
  location?: string | null;
  startDate: string;
  endDate?: string | null;
  isCurrent: boolean;
  description?: string | null;
};

export type AdminUserEducation = {
  id: string;
  degree?: string | null;
  institution: string;
  fieldOfStudy?: string | null;
  startDate: string;
  endDate?: string | null;
  isCurrent: boolean;
  description?: string | null;
};

export type AdminUserCertification = {
  id: string;
  name: string;
  issuer?: string | null;
  credentialUrl?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  description?: string | null;
};

export type AdminUserDocument = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  label?: string | null;
};

export type AdminUserPaymentMethod = {
  id: string;
  provider: string;
  phoneNumber: string;
  isPrimary: boolean;
};

export type AdminUserProfileDetail = {
  id: string;
  profileId?: string | null;
  name: string;
  role: "worker" | "employer";
  email: string;
  phone?: string | null;
  photoUrl?: string | null;
  isVerified?: boolean;
  isActive: boolean;
  accountStatus: "active" | "suspended";
  country?: string | null;
  city?: string | null;
  region?: string | null;
  preferredLanguage?: string;
  createdByAdmin?: string | null;
  createdAt: string;
  updatedAt: string;
  professionalTitle?: string | null;
  shortBio?: string | null;
  tagline?: string | null;
  companyName?: string | null;
  industry?: string | null;
  website?: string | null;
  contactPersonName?: string | null;
  dateOfBirth?: string | null;
  skills: string[];
  languages: string[];
  industries: string[];
  preferredJobTypes: string[];
  profileViews: number;
  verificationStatus: string;
  availabilityStatus?: string | null;
  workHistories: AdminUserWorkHistory[];
  educations: AdminUserEducation[];
  certifications: AdminUserCertification[];
  documents: AdminUserDocument[];
  paymentMethods: AdminUserPaymentMethod[];
  latestKycStatus?: string | null;
};

export type AnalyticsOverview = {
  totals: Array<{ label: string; value: string | number; note: string }>;
  departments: Array<{
    name: string;
    department: string;
    jobs: number;
    pending: number;
    disputes: number;
  }>;
};

export type AnalyticsEarnings = {
  from: string;
  to: string;
  rows: Array<{ status: string; totalAmount: number; count: number }>;
};

export type AnalyticsData = AnalyticsOverview & {
  earnings: AnalyticsEarnings;
};

export type SettingSummary = {
  key: string;
  name: string;
  purpose: string;
  access: string;
  status: string;
};

export type ReviewHistory = {
  actions: AuditAction[];
  notes: AuditNote[];
};

export type AuditAction = {
  id: string;
  action: string;
  actor?: string;
  createdAt: string;
};

export type AuditNote = {
  id: string;
  note: string;
  actor?: string;
  createdAt: string;
};

export type AuditLogListItem = {
  id: string;
  action: string;
  actorAdminId: string;
  actor: string;
  actorRole?: string | null;
  /** Module or product area (e.g. kyc, jobs). Not a database scope id. */
  scope: string;
  entityType: string;
  entityId: string;
  /** Human-readable target label from API (e.g. job title, user name). */
  entityLabel?: string;
  oldValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  notes?: AuditNote[];
  metadata?: Record<string, unknown>;
};

export type ListParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  sort?: string;
  order?: "asc" | "desc";
  unresolved?: boolean;
  moderationQueue?: boolean;
  verifiedOnly?: boolean;
  departmentId?: string;
  role?: "worker" | "employer" | "admin" | "super_admin";
  createdByAdminId?: string;
  from?: string;
  to?: string;
  scope?: string;
  entityType?: string;
  idType?: string;
  reviewerId?: string;
  employmentType?: string;
  jobType?: string;
  experienceLevel?: string;
  priority?: string;
  provider?: string;
  isActive?: string;
  country?: string;
  city?: string;
  profileType?: "worker" | "employer";
  isAdminCreated?: string;
  createdByAdmin?: string;
  module?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  adminId?: string;
};
