import type { AdminUserProfileDetail } from "@/lib/api/types";
import {
  formatCertificationMeta,
  formatEducationMeta,
  formatWorkHistoryMeta,
  isAvailableForHire,
  profileEmploymentTypesLine,
  profileIndustriesLine,
  profileLanguagesLine,
  profileLocationLine,
  profileSkillsLine,
} from "@/lib/profile-display";
import type { UserDetailFields } from "./user-detail-panel";

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });
}

function formatVerificationLabel(
  status: string,
  formatRoleLabel: (role: string) => string,
): string {
  return formatRoleLabel(status.replace(/_/g, " "));
}

export function adminUserDetailToFields(
  detail: AdminUserProfileDetail,
  t: (key: string, vars?: Record<string, string>) => string,
  formatRoleLabel: (role: string) => string,
): UserDetailFields {
  const isWorker = detail.role === "worker";
  const headline = isWorker
    ? detail.professionalTitle?.trim() || null
    : detail.tagline?.trim() || detail.contactPersonName?.trim() || null;

  const badges = [
    {
      label: detail.accountStatus === "suspended" ? t("common.suspended") : t("common.active"),
      className:
        detail.accountStatus === "suspended"
          ? "bg-[var(--joballa-danger-bg)] text-[var(--joballa-danger-fg)]"
          : "bg-[var(--joballa-jade-3)] text-[var(--joballa-primary)]",
    },
    {
      label: t("profiles.verification", {
        status: formatVerificationLabel(detail.verificationStatus, formatRoleLabel),
      }),
    },
  ];

  if (isWorker && isAvailableForHire(detail)) {
    badges.push({
      label: t("userDetail.availableForHire"),
      className: "bg-[var(--joballa-jade-3)] text-[var(--joballa-primary)]",
    });
  }

  const accountMeta = [
    { title: t("userDetail.accountType"), content: formatRoleLabel(detail.role) },
    formatDate(detail.createdAt)
      ? { title: t("users.joined"), content: formatDate(detail.createdAt) ?? "" }
      : null,
    formatDate(detail.updatedAt)
      ? { title: t("users.lastActivity"), content: formatDate(detail.updatedAt) ?? "" }
      : null,
    isWorker && detail.profileViews != null
      ? { title: t("profiles.profileViews"), content: String(detail.profileViews) }
      : null,
    detail.createdByAdmin
      ? { title: t("profiles.createdBy"), content: detail.createdByAdmin }
      : null,
    detail.dateOfBirth
      ? { title: t("profiles.dob"), content: formatDate(detail.dateOfBirth) ?? detail.dateOfBirth }
      : null,
    detail.preferredLanguage
      ? {
          title: t("userDetail.preferredLanguage"),
          content: detail.preferredLanguage === "FRE" ? "Français" : "English",
        }
      : null,
    !isWorker && detail.industry
      ? { title: t("userDetail.industry"), content: detail.industry }
      : null,
    !isWorker && detail.website
      ? { title: t("userDetail.website"), content: detail.website }
      : null,
  ].filter((row): row is { title: string; content: string } => row !== null);

  return {
    id: detail.id,
    name: detail.name,
    email: detail.email,
    role: detail.role,
    phone: detail.phone,
    photoUrl: detail.photoUrl,
    headline,
    location: profileLocationLine(detail) || null,
    languages: profileLanguagesLine(detail) || null,
    isVerified: detail.isVerified,
    badges,
    summary: detail.shortBio,
    industriesLine: profileIndustriesLine(detail) || null,
    employmentTypesLine: profileEmploymentTypesLine(detail) || null,
    skillsLine: profileSkillsLine(detail) || null,
    workHistories: detail.workHistories.map((entry) => ({
      id: entry.id,
      title: entry.jobTitle,
      subtitle: entry.companyName,
      description: entry.description ?? undefined,
      meta: formatWorkHistoryMeta(entry),
    })),
    educations: detail.educations.map((entry) => ({
      id: entry.id,
      title: entry.degree?.trim() || entry.institution,
      subtitle: entry.degree?.trim() ? entry.institution : undefined,
      description: entry.fieldOfStudy?.trim() || entry.description || undefined,
      meta: formatEducationMeta(entry),
    })),
    certifications: detail.certifications.map((entry) => ({
      id: entry.id,
      title: entry.name,
      subtitle: entry.issuer ?? undefined,
      description: entry.description ?? undefined,
      meta: formatCertificationMeta(entry),
      url: entry.credentialUrl,
    })),
    documents: detail.documents.map((entry) => ({
      id: entry.id,
      label: entry.label ?? entry.fileName,
      fileName: entry.fileName,
      url: entry.fileUrl,
      fileType: entry.fileType,
    })),
    paymentMethods: detail.paymentMethods.map((entry) => ({
      id: entry.id,
      provider: entry.provider,
      phoneNumber: entry.phoneNumber,
      isPrimary: entry.isPrimary,
    })),
    accountMeta,
    companyName: !isWorker ? detail.companyName ?? null : null,
  };
}
