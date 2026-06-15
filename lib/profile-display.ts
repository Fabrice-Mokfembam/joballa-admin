import type {
  AdminUserCertification,
  AdminUserEducation,
  AdminUserProfileDetail,
  AdminUserWorkHistory,
} from "@/lib/api/types";

export function profileInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
  }
  return parts[0]!.charAt(0).toUpperCase();
}

export function profileLocationLine(detail: AdminUserProfileDetail): string {
  return [detail.city, detail.region, detail.country].filter(Boolean).join(", ");
}

export function profileLanguagesLine(detail: AdminUserProfileDetail): string {
  return detail.languages.length > 0 ? detail.languages.join(", ") : "";
}

export function profileSkillsLine(detail: AdminUserProfileDetail): string {
  return detail.skills.length > 0 ? detail.skills.join(", ") : "";
}

export function profileIndustriesLine(detail: AdminUserProfileDetail): string {
  return detail.industries.length > 0 ? detail.industries.join(", ") : "";
}

export function profileEmploymentTypesLine(detail: AdminUserProfileDetail): string {
  if (detail.preferredJobTypes.length === 0) return "";
  return detail.preferredJobTypes
    .map((entry) =>
      entry.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase()),
    )
    .join(", ");
}

function formatMonthYear(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

function formatDateRange(
  startDate?: string,
  endDate?: string | null,
  isCurrent?: boolean,
): string {
  const start = startDate ? formatMonthYear(startDate) : "";
  const end =
    isCurrent || (startDate && !endDate)
      ? "Present"
      : endDate
        ? formatMonthYear(endDate)
        : "";
  if (start && end) return `${start} – ${end}`;
  return start || end;
}

export function formatWorkHistoryMeta(entry: AdminUserWorkHistory): string {
  const range = formatDateRange(entry.startDate, entry.endDate, entry.isCurrent);
  return [range, entry.location].filter(Boolean).join(" • ");
}

export function formatEducationMeta(entry: AdminUserEducation): string {
  return formatDateRange(entry.startDate, entry.endDate, entry.isCurrent);
}

export function formatCertificationMeta(entry: AdminUserCertification): string {
  const parts: string[] = [];
  if (entry.issuer?.trim()) parts.push(entry.issuer.trim());
  if (entry.issueDate) parts.push(formatMonthYear(entry.issueDate));
  if (entry.expiryDate) parts.push(`Expires ${formatMonthYear(entry.expiryDate)}`);
  return parts.join(" • ");
}

export function documentExtension(fileName: string, fileType?: string): string {
  const fromName = fileName.split(".").pop()?.trim().toUpperCase();
  if (fromName && fromName.length <= 4) return fromName;
  if (fileType?.toUpperCase() === "PDF") return "PDF";
  return "DOC";
}

export function isAvailableForHire(detail: AdminUserProfileDetail): boolean {
  const status = detail.availabilityStatus?.trim().toLowerCase();
  return status === "available" || status === "available_for_hire";
}
