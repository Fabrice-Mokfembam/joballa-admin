"use client";

import { useCallback, useMemo } from "react";
import { useTranslation, type TranslationKey } from "./locale-context";

export type TranslateFn = (key: TranslationKey, vars?: Record<string, string>) => string;

function tryTranslate(t: TranslateFn | undefined, key: TranslationKey, fallback: string): string {
  if (!t) return fallback;
  const result = t(key);
  return result === key ? fallback : result;
}

function normalizeStatusKey(status: string): string {
  return status.toLowerCase().replace(/\s+/g, "_");
}

export function formatStatusLabelWithT(status: string, t?: TranslateFn): string {
  const normalized = normalizeStatusKey(status);
  const fallback =
    status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  return tryTranslate(t, `common.statusLabels.${normalized}` as TranslationKey, fallback);
}

export function formatRoleLabelWithT(role: string, t?: TranslateFn): string {
  const normalized = role.toLowerCase();
  const fallback = role.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  return tryTranslate(t, `common.roles.${normalized}` as TranslationKey, fallback);
}

export function formatRelativeDateWithT(iso: string, t?: TranslateFn, locale?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return t ? t("common.time.justNow") : "Just now";
  if (diffMinutes < 60) {
    return t
      ? t("common.time.minutesAgo", { count: String(diffMinutes) })
      : `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return t ? t("common.time.hoursAgo", { count: String(diffHours) }) : `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return t ? t("common.time.daysAgo", { count: String(diffDays) }) : `${diffDays}d ago`;
  }

  return date.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" });
}

export function formatJobStatusLabelWithT(status: string, t?: TranslateFn): string {
  const normalized = normalizeStatusKey(status);
  if (normalized === "published") {
    return t ? t("common.statusLabels.live") : "Live";
  }
  return formatStatusLabelWithT(status, t);
}

export function formatAuditAreaWithT(scope: string, t?: TranslateFn): string {
  const key = scope.toLowerCase();
  const moduleKey = key.includes("kyc")
    ? "logs.modules.kyc"
    : key.includes("document")
      ? "logs.modules.documents"
      : key.includes("job")
        ? "logs.modules.jobs"
        : key.includes("report") || key.includes("dispute")
          ? "logs.modules.reports"
          : key.includes("user")
            ? "logs.modules.users"
            : key.includes("department")
              ? "logs.modules.departments"
              : key.includes("auth") || key.includes("session")
                ? "logs.modules.auth"
                : null;

  if (moduleKey && t) return t(moduleKey as TranslationKey);
  return scope.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function useTranslatedFormat() {
  const { t, locale } = useTranslation();

  const formatStatusLabel = useCallback((status: string) => formatStatusLabelWithT(status, t), [t]);
  const formatRoleLabel = useCallback((role: string) => formatRoleLabelWithT(role, t), [t]);
  const formatRelativeDate = useCallback(
    (iso: string) => formatRelativeDateWithT(iso, t, locale),
    [t, locale]
  );
  const formatJobStatusLabel = useCallback((status: string) => formatJobStatusLabelWithT(status, t), [t]);
  const formatAuditArea = useCallback((scope: string) => formatAuditAreaWithT(scope, t), [t]);
  const formatRiskLabel = useCallback(
    (risk: string) => {
      const normalized = risk.toLowerCase();
      return tryTranslate(t, `common.statusLabels.${normalized}` as TranslationKey, risk.charAt(0).toUpperCase() + risk.slice(1));
    },
    [t]
  );

  return useMemo(
    () => ({
      t,
      formatStatusLabel,
      formatRoleLabel,
      formatRelativeDate,
      formatJobStatusLabel,
      formatAuditArea,
      formatRiskLabel,
    }),
    [t, formatStatusLabel, formatRoleLabel, formatRelativeDate, formatJobStatusLabel, formatAuditArea, formatRiskLabel]
  );
}
