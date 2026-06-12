"use client";

import { useState } from "react";
import Image from "next/image";
import { Calendar, CheckCircle2, ChevronRight, Expand, FileCheck2, FileX2, Inbox, Mail, Phone, X } from "lucide-react";
import { kycApi } from "@/lib/api/admin";
import { formatStatusLabel, formatSubmittedAt, getInitials } from "@/lib/api/format";
import type { KycListItem } from "@/lib/api/types";
import { useAdminRefresh } from "@/lib/admin-refresh";
import { INPUT_MAX_LENGTH } from "@/lib/constants/input-limits";
import { useAuth } from "@/lib/auth/auth-context";
import { useAdminAction } from "@/lib/hooks/use-admin-action";
import { isAsyncRefreshing, isInitialAsyncLoad, useAsyncData, useMutation } from "@/lib/hooks/use-async";
import { useTranslation, type TranslationKey } from "@/lib/i18n";
import { StatusBadge } from "../../ui/data-display";
import { MoreMenu } from "../../ui/menus";
import { DateField, FilterSelect, SearchField, SummaryCards } from "../../ui/workspace";
import { KycCardGridSkeleton } from "../../ui/skeletons";
import { AccessDeniedState, EmptyState, ErrorState, LoadingButton } from "../../ui/states";

const KYC_STATUS_FILTER_KEYS = ["common.all", "common.pending", "common.verified", "common.rejected"] as const;
const KYC_STATUS_FILTER_VALUES = ["All", "Pending", "Verified", "Rejected"] as const;
const KYC_SORT_KEYS = ["common.newestFirst", "common.oldestFirst"] as const;
const KYC_SORT_VALUES = ["Newest first", "Oldest first"] as const;
const KYC_TYPE_FILTER_ALL = "All types";
type KycStatusChangeTarget = "pending" | "verified" | "rejected";

const KYC_STATUS_CHANGE_KEYS: Record<KycStatusChangeTarget, TranslationKey> = {
  pending: "common.pending",
  verified: "common.verified",
  rejected: "common.rejected",
};

function isPendingKycStatus(status: string): boolean {
  const normalized = status.toLowerCase();
  return normalized === "pending" || normalized === "pending_review";
}

function getKycReasonLabel(status: string, t: (key: TranslationKey) => string): string {
  const normalized = status.toLowerCase();
  return normalized === "rejected" ? t("common.reason") : t("common.note");
}

function isApprovedKycStatus(status: string): boolean {
  return ["approved", "verified"].includes(status.toLowerCase());
}

function isRejectedKycStatus(status: string): boolean {
  return status.toLowerCase() === "rejected";
}

function getKycStatusChangeOptions(status: string): KycStatusChangeTarget[] {
  if (isApprovedKycStatus(status)) return ["pending", "rejected"];
  if (isRejectedKycStatus(status)) return ["pending", "verified"];
  return [];
}

function getKycStatusChangeActionLabel(target: KycStatusChangeTarget, t: (key: TranslationKey, vars?: Record<string, string>) => string): string {
  return t("kyc.changeTo", { status: t(KYC_STATUS_CHANGE_KEYS[target]).toLowerCase() });
}

function requiresKycStatusChangeReason(target: KycStatusChangeTarget): boolean {
  return target === "rejected";
}

function formatKycStatusFilter(label: string): string | undefined {
  if (label === "All") return undefined;
  if (label === "Verified") return "verified";
  return label.toLowerCase();
}

function matchesKycStatusFilter(submission: KycListItem, filter: string): boolean {
  if (filter === "All") return true;
  const label = formatStatusLabel(submission.status);
  if (filter === "Pending") {
    return isPendingKycStatus(submission.status) || label === "Pending";
  }
  return label === filter;
}

export function KycCardGrid({
  limit,
  pendingOnly = false,
  unresolvedOnly = false,
  initialItems,
  skeletonOnly = false,
}: {
  limit?: number;
  pendingOnly?: boolean;
  unresolvedOnly?: boolean;
  initialItems?: KycListItem[];
  skeletonOnly?: boolean;
} = {}) {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const { perform } = useAdminAction();
  const canRead = hasPermission("kyc:read");
  const canReview = hasPermission("kyc:review");
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState(KYC_TYPE_FILTER_ALL);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<(typeof KYC_SORT_VALUES)[number]>("Newest first");
  const [resubmittingSubmission, setResubmittingSubmission] = useState<KycListItem | null>(null);
  const [resubmitReason, setResubmitReason] = useState("");
  const [statusChangingSubmission, setStatusChangingSubmission] = useState<KycListItem | null>(null);
  const [statusChangeTarget, setStatusChangeTarget] = useState<KycStatusChangeTarget>("verified");
  const [statusChangeReason, setStatusChangeReason] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  const { data: items, loading, error, reload } = useAsyncData(async () => {
    if (initialItems !== undefined) return initialItems;
    const result = await kycApi.list({
      limit: limit ?? 100,
      status: pendingOnly ? "pending" : formatKycStatusFilter(statusFilter),
      search: searchQuery.trim() || undefined,
    });
    return result.items;
  }, [initialItems, limit, pendingOnly, searchQuery, statusFilter], {
    cacheKey: initialItems === undefined ? `kyc:${statusFilter}:${searchQuery.trim()}:${pendingOnly}` : undefined,
  });

  useAdminRefresh(["kyc"], () => {
    if (initialItems === undefined) reload();
  });

  const { mutate: rejectKyc, loading: resubmitting } = useMutation((id: string, reason: string) =>
    kycApi.reject(id, reason)
  );

  const isInitialLoad = initialItems === undefined && isInitialAsyncLoad(loading, items);
  const isRefreshing = initialItems === undefined && isAsyncRefreshing(loading, items);

  if (skeletonOnly) {
    return <KycCardGridSkeleton count={limit ?? 6} />;
  }

  if (!canRead) {
    return <AccessDeniedState description={t("kyc.accessDenied")} />;
  }

  if (isInitialLoad) {
    return <KycCardGridSkeleton count={limit ?? 6} />;
  }

  if (error && initialItems === undefined && items === null) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  const allItems = items ?? [];
  const baseSubmissions = pendingOnly
    ? allItems.filter((submission) => isPendingKycStatus(submission.status))
    : unresolvedOnly
      ? allItems.filter((submission) => submission.status !== "approved")
      : allItems;
  const visibleSubmissions = baseSubmissions
    .filter((submission) => matchesKycStatusFilter(submission, statusFilter))
    .filter((submission) => typeFilter === KYC_TYPE_FILTER_ALL || submission.type === typeFilter)
    .filter((submission) => !searchQuery.trim() || `${submission.user} ${submission.email} ${submission.type}`.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    .filter((submission) => !dateFilter || submission.submittedAt.slice(0, 10) === dateFilter)
    .sort((left, right) => {
      const comparison = new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime();
      return sortOrder === "Newest first" ? comparison : -comparison;
    });
  const displayedSubmissions = limit ? visibleSubmissions.slice(0, limit) : visibleSubmissions;
  const activeSubmission = allItems.find((submission) => submission.id === activeSubmissionId);
  const activeImages = activeSubmission?.previewUrls?.length ? activeSubmission.previewUrls : [];
  const showWorkspace = limit === undefined && !pendingOnly;
  const kycTypes = [KYC_TYPE_FILTER_ALL, ...Array.from(new Set(allItems.map((submission) => submission.type)))];
  const kycTypeOptions = kycTypes.map((type) => (type === KYC_TYPE_FILTER_ALL ? t("common.allTypes") : type));
  const counts = {
    pending: allItems.filter((item) => isPendingKycStatus(item.status)).length,
    verified: allItems.filter((item) => ["approved", "verified"].includes(item.status.toLowerCase())).length,
    rejected: allItems.filter((item) => item.status.toLowerCase() === "rejected").length,
  };

  async function handleApprove(submissionId: string) {
    setActionId(submissionId);
    try {
      await perform(async () => {
        await kycApi.approve(submissionId);
        return true;
      }, {
        success: t("kyc.approvedSuccess"),
        onSuccess: () => {
          if (initialItems === undefined) reload();
        },
      });
    } finally {
      setActionId(null);
    }
  }

  function closeResubmitModal() {
    if (resubmitting) return;
    setResubmittingSubmission(null);
    setResubmitReason("");
  }

  async function handleResubmitConfirm() {
    if (!resubmittingSubmission || !resubmitReason.trim()) return;
    await perform(() => rejectKyc(resubmittingSubmission.id, resubmitReason.trim()), {
      success: t("kyc.rejectedSuccess"),
      onSuccess: () => {
        setResubmittingSubmission(null);
        setResubmitReason("");
        if (initialItems === undefined) reload();
      },
    });
  }

  function closeStatusChangeModal() {
    if (actionId === statusChangingSubmission?.id) return;
    setStatusChangingSubmission(null);
    setStatusChangeTarget("verified");
    setStatusChangeReason("");
  }

  async function handleStatusChangeConfirm() {
    if (!statusChangingSubmission) return;
    if (requiresKycStatusChangeReason(statusChangeTarget) && !statusChangeReason.trim()) return;

    setActionId(statusChangingSubmission.id);
    try {
      await perform(async () => {
        if (statusChangeTarget === "rejected") {
          await kycApi.reject(statusChangingSubmission.id, statusChangeReason.trim());
        } else if (statusChangeTarget === "pending") {
          await kycApi.updateStatus(statusChangingSubmission.id, "pending");
        } else {
          await kycApi.approve(statusChangingSubmission.id);
        }
        return true;
      }, {
        success: t("kyc.changedSuccess", { status: t(KYC_STATUS_CHANGE_KEYS[statusChangeTarget]).toLowerCase() }),
        onSuccess: () => {
          setStatusChangingSubmission(null);
          setStatusChangeTarget("verified");
          setStatusChangeReason("");
          if (initialItems === undefined) reload();
        },
      });
    } finally {
      setActionId(null);
    }
  }

  return (
    <>
      {showWorkspace ? (
        <>
          <SummaryCards items={[
            { label: t("kyc.pendingReview"), value: counts.pending, note: t("kyc.awaitingVerification"), icon: Inbox, tone: "amber" },
            { label: t("common.verified"), value: counts.verified, note: t("kyc.approvedSubmissions"), icon: CheckCircle2, tone: "blue" },
            { label: t("common.rejected"), value: counts.rejected, note: t("kyc.failedVerification"), icon: FileX2, tone: "red" },
            { label: t("kyc.totalSubmissions"), value: allItems.length, note: t("kyc.allTime"), icon: FileCheck2, tone: "jade" },
          ]} />
          <section className="mb-6 flex flex-wrap gap-3">
            <SearchField value={searchQuery} onChange={setSearchQuery} placeholder={t("kyc.searchPlaceholder")} />
            <FilterSelect
              label={t("kyc.statusFilter")}
              value={t(KYC_STATUS_FILTER_KEYS[KYC_STATUS_FILTER_VALUES.indexOf(statusFilter as (typeof KYC_STATUS_FILTER_VALUES)[number])])}
              options={KYC_STATUS_FILTER_KEYS.map((key) => t(key))}
              onChange={(label) => {
                const index = KYC_STATUS_FILTER_KEYS.findIndex((key) => t(key) === label);
                if (index >= 0) setStatusFilter(KYC_STATUS_FILTER_VALUES[index]);
              }}
            />
            <FilterSelect
              label={t("kyc.typeFilter")}
              value={typeFilter === KYC_TYPE_FILTER_ALL ? t("common.allTypes") : typeFilter}
              options={kycTypeOptions}
              onChange={(label) => {
                if (label === t("common.allTypes")) setTypeFilter(KYC_TYPE_FILTER_ALL);
                else setTypeFilter(label);
              }}
            />
            <DateField value={dateFilter} onChange={setDateFilter} />
            <FilterSelect
              label={t("kyc.sortFilter")}
              value={t(KYC_SORT_KEYS[KYC_SORT_VALUES.indexOf(sortOrder)])}
              options={KYC_SORT_KEYS.map((key) => t(key))}
              onChange={(label) => {
                const index = KYC_SORT_KEYS.findIndex((key) => t(key) === label);
                if (index >= 0) setSortOrder(KYC_SORT_VALUES[index]);
              }}
            />
          </section>
        </>
      ) : null}

      {error && initialItems === undefined ? (
        <p className="mb-4 rounded-[8px] border border-[var(--joballa-danger-border)] bg-[var(--joballa-danger-bg)] px-4 py-3 text-sm font-medium text-[var(--joballa-danger-fg)]">
          {error}
        </p>
      ) : null}

      {displayedSubmissions.length === 0 && !isRefreshing ? (
        <EmptyState title={t("kyc.noSubmissions")} description={t("kyc.noSubmissionsDescription")} />
      ) : (
      <div
        aria-busy={isRefreshing}
        className={[
          "grid gap-5 lg:grid-cols-2 2xl:grid-cols-3",
          isRefreshing ? "pointer-events-none opacity-60 transition-opacity" : "",
        ].join(" ")}
      >
        {displayedSubmissions.map((submission) => {
          const images = submission.previewUrls?.length ? submission.previewUrls : [];
          const previewImage = images[0] ?? "/brand/joballa-panel-mark.png";
          const isPending = isPendingKycStatus(submission.status);
          const statusChangeOptions = getKycStatusChangeOptions(submission.status);

          return (
            <article
              key={submission.id}
              className="overflow-hidden rounded-[12px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] shadow-[0_1px_6px_rgba(15,23,42,0.08)]"
            >
              <div className="p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-[var(--joballa-tag-bg)] px-3 py-1 text-xs font-bold">{submission.type}</span>
                  <div className="flex items-center gap-1">
                    <StatusBadge value={submission.status} />
                    {!isPending && canReview && statusChangeOptions.length > 0 ? (
                      <MoreMenu
                        label={t("kyc.actionsFor", { name: submission.user })}
                        items={statusChangeOptions.map((target) => ({
                          label: getKycStatusChangeActionLabel(target, t),
                          tone: target === "rejected" ? "danger" : undefined,
                          onClick: () => {
                            setStatusChangeTarget(target);
                            setStatusChangeReason("");
                            setStatusChangingSubmission(submission);
                          },
                        }))}
                      />
                    ) : null}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--joballa-avatar-bg)] text-sm font-bold text-[var(--joballa-avatar-fg)]">
                      {getInitials(submission.user)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="admin-card-title truncate">{submission.user}</h3>
                      <p className="admin-card-meta truncate">{submission.email}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid gap-1 text-xs text-[var(--joballa-muted)]">
                  <span className="flex items-center gap-2"><Mail size={13} />{submission.email}</span>
                  {submission.phone ? <span className="flex items-center gap-2"><Phone size={13} />{submission.phone}</span> : null}
                </div>
                <div className="mt-4 flex items-center gap-2 border-t border-[var(--joballa-border)] pt-3 text-xs text-[var(--joballa-muted)]">
                  <Calendar size={14} />
                  <span>{formatSubmittedAt(submission.submittedAt)}</span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {(submission.type.toLowerCase().includes("passport")
                    ? [t("kyc.front"), t("kyc.selfie")]
                    : [t("kyc.front"), t("kyc.back"), t("kyc.selfie")]
                  ).map((label, index) => (
                    <button
                      key={label}
                      type="button"
                      className="group relative aspect-[4/3] overflow-hidden rounded-[6px] border border-[var(--joballa-border)] bg-[var(--joballa-page-tint)]"
                      onClick={() => {
                        if (!images.length) return;
                        setActiveSubmissionId(submission.id);
                        setActiveImageIndex(Math.min(index, images.length - 1));
                      }}
                    >
                      <Image src={images[index] ?? previewImage} alt={`${label} preview`} fill className="object-cover opacity-80 transition group-hover:opacity-100" unoptimized />
                      <Expand size={13} className="absolute right-1 top-1 text-white drop-shadow" />
                    </button>
                  ))}
                </div>

                {isPending && canReview ? (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <LoadingButton
                      loading={actionId === submission.id}
                      loadingLabel={t("kyc.approving")}
                      className="w-full py-2.5 text-xs sm:text-sm"
                      onClick={() => void handleApprove(submission.id)}
                    >
                      {t("kyc.approve")}
                    </LoadingButton>
                    <LoadingButton
                      variant="secondary"
                      loading={resubmitting && resubmittingSubmission?.id === submission.id}
                      loadingLabel={t("kyc.sending")}
                      className="w-full border border-[var(--joballa-danger-fg)] bg-transparent py-2.5 text-xs text-[var(--joballa-danger-fg)] hover:bg-[var(--joballa-danger-bg)] sm:text-sm"
                      onClick={() => {
                        setResubmitReason("");
                        setResubmittingSubmission(submission);
                      }}
                    >
                      {t("kyc.reject")}
                    </LoadingButton>
                  </div>
                ) : null}

                {submission.reason ? (
                  <div className="mt-3 rounded-[8px] border border-[var(--joballa-warning-border)] bg-[var(--joballa-warning-bg)] px-3 py-2 text-xs font-medium text-[var(--joballa-warning-fg)]">
                    {getKycReasonLabel(submission.status, t)}: {submission.reason}
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
      )}

      {activeSubmission && activeImages.length > 0 ? (
        <div
          aria-label={t("kyc.closeViewer")}
          className="fixed inset-0 z-50 grid place-items-center bg-black/75 px-4 py-6"
          onClick={() => setActiveSubmissionId(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="kyc-image-viewer-title"
            className="relative w-full max-w-4xl rounded-[16px] bg-[var(--joballa-card)] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.35)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 id="kyc-image-viewer-title" className="truncate text-lg font-bold">
                  {activeSubmission.user}
                </h3>
                <p className="text-sm text-[var(--joballa-muted)]">
                  {t("kyc.imageOf", { current: String(activeImageIndex + 1), total: String(activeImages.length) })}
                </p>
              </div>
              <button
                type="button"
                aria-label={t("kyc.closeViewer")}
                className="grid h-9 w-9 place-items-center rounded-full border border-[var(--joballa-border)]"
                onClick={() => setActiveSubmissionId(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="relative overflow-hidden rounded-[12px] bg-black">
              <Image
                src={activeImages[activeImageIndex]}
                alt={`${activeSubmission.user} KYC enlarged image`}
                width={1200}
                height={900}
                className="max-h-[70vh] w-full object-contain"
                unoptimized
              />
              <button
                type="button"
                aria-label={t("kyc.previousImage")}
                className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-black"
                onClick={() => setActiveImageIndex((index) => (index + activeImages.length - 1) % activeImages.length)}
              >
                <ChevronRight className="rotate-180" size={20} />
              </button>
              <button
                type="button"
                aria-label={t("kyc.nextImage")}
                className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-black"
                onClick={() => setActiveImageIndex((index) => (index + 1) % activeImages.length)}
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {activeImages.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  aria-label={t("kyc.openImage", { index: String(index + 1) })}
                  className={[
                    "relative h-16 w-20 shrink-0 overflow-hidden rounded-[8px] border-2",
                    activeImageIndex === index ? "border-[var(--joballa-primary)]" : "border-transparent opacity-65",
                  ].join(" ")}
                  onClick={() => setActiveImageIndex(index)}
                >
                  <Image src={image} alt="" fill className="object-cover" unoptimized />
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {resubmittingSubmission ? (
        <div
          aria-label="Close reject KYC dialog"
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/55 px-4 py-4"
          onClick={closeResubmitModal}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="resubmit-kyc-dialog-title"
            className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5 text-left shadow-[0_24px_70px_rgba(0,0,0,0.28)]"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="resubmit-kyc-dialog-title" className="text-xl font-bold">
              {t("kyc.rejectTitle")}
            </h3>
            <p className="mt-1 text-sm text-[var(--joballa-muted)]">{resubmittingSubmission.user}</p>
            <textarea
              className="mt-5 min-h-32 w-full rounded-[12px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] p-3 text-sm outline-none"
              placeholder={t("common.reasonRequired")}
              value={resubmitReason}
              maxLength={INPUT_MAX_LENGTH.rejectionReason}
              onChange={(event) => setResubmitReason(event.target.value)}
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-full border border-[var(--joballa-border)] px-5 py-2.5 text-sm font-bold"
                disabled={resubmitting}
                onClick={closeResubmitModal}
              >
                {t("common.cancel")}
              </button>
              <LoadingButton
                loading={resubmitting}
                loadingLabel={t("kyc.sending")}
                disabled={!resubmitReason.trim()}
                onClick={() => void handleResubmitConfirm()}
              >
                {t("common.confirm")}
              </LoadingButton>
            </div>
          </section>
        </div>
      ) : null}

      {statusChangingSubmission ? (
        <div
          aria-label="Close change KYC status dialog"
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/55 px-4 py-4"
          onClick={closeStatusChangeModal}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-kyc-status-dialog-title"
            className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5 text-left shadow-[0_24px_70px_rgba(0,0,0,0.28)]"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="change-kyc-status-dialog-title" className="text-xl font-bold">
              {t("kyc.changeStatusTitle")}
            </h3>
            <p className="mt-1 text-sm text-[var(--joballa-muted)]">{statusChangingSubmission.user}</p>
            <label className="mt-5 block text-sm font-bold">
              {t("common.status")}
              <select
                className="mt-2 w-full rounded-[12px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 py-3 text-sm outline-none"
                value={statusChangeTarget}
                onChange={(event) => {
                  setStatusChangeTarget(event.target.value as KycStatusChangeTarget);
                  setStatusChangeReason("");
                }}
              >
                {getKycStatusChangeOptions(statusChangingSubmission.status).map((target) => (
                  <option key={target} value={target}>
                    {t(KYC_STATUS_CHANGE_KEYS[target])}
                  </option>
                ))}
              </select>
            </label>
            {requiresKycStatusChangeReason(statusChangeTarget) ? (
              <label className="mt-4 block text-sm font-bold">
                {t("common.reason")}
                <textarea
                  className="mt-2 min-h-32 w-full rounded-[12px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] p-3 text-sm font-normal outline-none"
                  placeholder={t("common.reasonRequired")}
                  value={statusChangeReason}
                  maxLength={INPUT_MAX_LENGTH.note}
                  onChange={(event) => setStatusChangeReason(event.target.value)}
                />
              </label>
            ) : null}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-full border border-[var(--joballa-border)] px-5 py-2.5 text-sm font-bold"
                disabled={actionId === statusChangingSubmission.id}
                onClick={closeStatusChangeModal}
              >
                {t("common.cancel")}
              </button>
              <LoadingButton
                loading={actionId === statusChangingSubmission.id}
                loadingLabel={t("kyc.changing")}
                disabled={requiresKycStatusChangeReason(statusChangeTarget) && !statusChangeReason.trim()}
                onClick={() => void handleStatusChangeConfirm()}
              >
                {t("common.confirm")}
              </LoadingButton>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
