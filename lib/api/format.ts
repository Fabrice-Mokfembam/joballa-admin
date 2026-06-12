import { OTHER_DEPARTMENT_NAME } from "@/lib/constants/departments";
import type { DocumentUserSummary } from "./types";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  resubmission_requested: "Resubmission requested",
  expired: "Expired",
  draft: "Draft",
  pending_review: "Pending",
  published: "Published",
  live: "Live",
  paused: "Paused",
  suspended: "Suspended",
  closed: "Closed",
  open: "Open",
  under_review: "Open",
  in_review: "Open",
  waiting_for_user: "Waiting for user",
  escalated: "Escalated",
  resolved: "Resolved",
  active: "Active",
  inactive: "Inactive",
};

const STATUS_API_VALUES: Record<string, string> = Object.fromEntries(
  Object.entries(STATUS_LABELS).map(([api, label]) => [label.toLowerCase(), api])
);

export function formatStatusLabel(status: string): string {
  const normalized = status.toLowerCase().replace(/\s+/g, "_");
  return STATUS_LABELS[normalized] ?? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatStatusFilter(label: string): string | undefined {
  if (label === "All" || label === "Unverified") return undefined;
  const aliases: Record<string, string> = {
    pending: "pending_review",
    "pending_review": "pending_review",
    "pending review": "pending_review",
    live: "live",
  };
  const key = label.toLowerCase().replace(/\s+/g, "_");
  return aliases[key] ?? STATUS_API_VALUES[key] ?? key;
}

export function formatJobDepartment(department?: string | null): string {
  const value = department?.trim();
  if (!value || value.toLowerCase() === "live") return OTHER_DEPARTMENT_NAME;
  return value;
}

/** Job card / panel status — maps published → Live, hides draft/paused labels when filtered elsewhere. */
export function formatJobStatusLabel(status: string): string {
  const normalized = status.toLowerCase().replace(/\s+/g, "_");
  if (normalized === "published") return "Live";
  return formatStatusLabel(status);
}

export function isHiddenVerifiedJobStatus(status: string): boolean {
  const normalized = status.toLowerCase().replace(/\s+/g, "_");
  return normalized === "draft" || normalized === "paused";
}

/** Product area for audit logs (API field `scope`). */
export function formatAuditArea(scope: string): string {
  const key = scope.toLowerCase();
  if (key.includes("kyc")) return "KYC";
  if (key.includes("document")) return "Documents";
  if (key.includes("job")) return "Jobs";
  if (key.includes("report") || key.includes("dispute")) return "Reports";
  if (key.includes("user")) return "Users";
  if (key.includes("department")) return "Departments";
  if (key.includes("auth") || key.includes("session")) return "Auth";
  return scope.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const AUDIT_LABEL_KEYS = [
  "title",
  "name",
  "userName",
  "user",
  "email",
  "jobTitle",
  "companyName",
  "subject",
  "label",
  "company",
] as const;

function looksLikeUuid(value: string): boolean {
  return UUID_PATTERN.test(value.trim());
}

function pickReadableFromValues(values?: Record<string, unknown>): string | undefined {
  if (!values || typeof values !== "object") return undefined;

  for (const key of AUDIT_LABEL_KEYS) {
    const raw = values[key];
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (trimmed && !looksLikeUuid(trimmed)) return trimmed;
    }
  }

  const nestedUser = values.user;
  if (nestedUser && typeof nestedUser === "object" && "name" in nestedUser) {
    const name = (nestedUser as { name?: unknown }).name;
    if (typeof name === "string") {
      const trimmed = name.trim();
      if (trimmed && !looksLikeUuid(trimmed)) return trimmed;
    }
  }

  return undefined;
}

export function formatAuditEntity(log: {
  entityType: string;
  entityId: string;
  entityLabel?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
}): string {
  const candidates = [
    log.entityLabel,
    pickReadableFromValues(log.newValues),
    pickReadableFromValues(log.oldValues),
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const trimmed = candidate.trim();
    if (trimmed && !looksLikeUuid(trimmed)) return trimmed;
  }

  return formatStatusLabel(log.entityType);
}

export function formatJobPosterName(client: string, department: string): string {
  const normalized = client.trim().toLowerCase();
  if (!client.trim() || normalized === "general" || normalized === "unknown") {
    return department.trim() || client.trim() || "Unknown poster";
  }
  return client.trim();
}

export function formatRiskLabel(risk: string): string {
  return risk.charAt(0).toUpperCase() + risk.slice(1);
}

export function formatRoleLabel(role: string): string {
  if (role === "worker") return "Worker";
  if (role === "employer") return "Employer";
  if (role === "super_admin") return "Super Admin";
  if (role === "admin_manager") return "Admin Manager";
  if (role === "verifier") return "Verifier";
  if (role === "support_agent") return "Support Agent";
  if (role === "admin") return "Admin";
  return role;
}

export function formatSubmittedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const datePart = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);

  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);

  return `Submitted: ${datePart} • ${timePart}`;
}

export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileKind(mimeType?: string, fileName?: string): string {
  const name = fileName?.toLowerCase() ?? "";
  if (mimeType?.includes("pdf") || name.endsWith(".pdf")) return "PDF";
  if (mimeType?.includes("word") || name.endsWith(".docx") || name.endsWith(".doc")) return "DOCX";
  if (mimeType?.startsWith("image/")) return "IMG";
  return "FILE";
}

export function formatCurrency(amount: number, currency = "XAF"): string {
  return `${amount.toLocaleString()} ${currency}`;
}

export function formatDocumentUser(user: string | DocumentUserSummary): string {
  if (typeof user === "string") return user;
  return user.name || user.email;
}

export function formatAuditAction(action: string): string {
  return action
    .split(".")
    .map((part) => formatStatusLabel(part))
    .join(" · ");
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
