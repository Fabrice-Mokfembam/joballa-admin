"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { jobsApi } from "@/lib/api/admin";
import { INPUT_MAX_LENGTH } from "@/lib/constants/input-limits";
import type { JobListItem } from "@/lib/api/types";
import { useAdminAction } from "@/lib/hooks/use-admin-action";
import { useMutation } from "@/lib/hooks/use-async";
import { useTranslation, type TranslationKey } from "@/lib/i18n";
import { LoadingButton } from "../../ui/states";

export type JobActionKind = "publish" | "reject" | "send-to-review" | "unpublish";

export type JobActionRequest = {
  kind: JobActionKind;
  job: JobListItem;
};

type TranslateFn = (key: TranslationKey, vars?: Record<string, string>) => string;

const CONFIRM_COPY_KEYS: Record<
  JobActionKind,
  { title: TranslationKey; description: TranslationKey; confirmLabel: TranslationKey; loadingLabel: TranslationKey; variant?: "danger" | "secondary" }
> = {
  publish: {
    title: "jobs.publishTitle",
    description: "jobs.publishDescription",
    confirmLabel: "jobs.publish",
    loadingLabel: "jobs.publishing",
  },
  reject: {
    title: "jobs.rejectTitle",
    description: "jobs.rejectDescription",
    confirmLabel: "jobs.rejectAction",
    loadingLabel: "common.saving",
    variant: "danger",
  },
  "send-to-review": {
    title: "jobs.sendToReviewTitle",
    description: "jobs.sendToReviewDescription",
    confirmLabel: "jobs.sendToReview",
    loadingLabel: "jobs.sending",
  },
  unpublish: {
    title: "jobs.unpublishTitle",
    description: "jobs.unpublishDescription",
    confirmLabel: "jobs.unpublish",
    loadingLabel: "jobs.unpublishing",
    variant: "secondary",
  },
};

const SUCCESS_KEYS: Record<JobActionKind, TranslationKey> = {
  publish: "jobs.publishedSuccess",
  reject: "jobs.rejectedSuccess",
  "send-to-review": "jobs.sentToReviewSuccess",
  unpublish: "jobs.unpublishedSuccess",
};

export function JobActionModals({
  request,
  onClose,
  onSuccess,
}: {
  request: JobActionRequest | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const { perform } = useAdminAction();
  const [rejectReason, setRejectReason] = useState("");

  const { mutate: publishJob, loading: publishing } = useMutation((id: string) => jobsApi.approve(id));
  const { mutate: rejectJob, loading: rejecting } = useMutation((id: string, reason: string) =>
    jobsApi.reject(id, reason)
  );
  const { mutate: sendToReview, loading: sendingToReview } = useMutation((id: string) =>
    jobsApi.updateStatus(id, "pending")
  );
  const { mutate: unpublishJob, loading: unpublishing } = useMutation((id: string) =>
    jobsApi.updateStatus(id, "pending")
  );

  if (!request) return null;

  const copyKeys = CONFIRM_COPY_KEYS[request.kind];
  const loading = publishing || rejecting || sendingToReview || unpublishing;
  const needsReason = request.kind === "reject";

  function handleClose() {
    if (loading) return;
    setRejectReason("");
    onClose();
  }

  async function handleConfirm() {
    if (!request) return;
    if (needsReason && !rejectReason.trim()) return;

    const jobId = request.job.id;

    const action = async () => {
      switch (request.kind) {
        case "publish":
          return publishJob(jobId);
        case "reject":
          return rejectJob(jobId, rejectReason.trim());
        case "send-to-review":
          return sendToReview(jobId);
        case "unpublish":
          return unpublishJob(jobId);
      }
    };

    await perform(action, {
      success: t(SUCCESS_KEYS[request.kind]),
      onSuccess: () => {
        setRejectReason("");
        onClose();
        onSuccess();
      },
    });
  }

  return (
    <div
      aria-label={t(copyKeys.title)}
      className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-black/55 px-4 py-4"
      onClick={handleClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-action-dialog-title"
        className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5 text-left shadow-[0_24px_70px_rgba(0,0,0,0.28)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="job-action-dialog-title" className="text-xl font-bold">
          {t(copyKeys.title)}
        </h3>
        <p className="mt-1 text-sm font-semibold text-[var(--joballa-fg)]">{request.job.title}</p>
        <p className="mt-2 text-sm leading-6 text-[var(--joballa-muted)]">{t(copyKeys.description)}</p>

        {needsReason ? (
          <textarea
            className="mt-5 min-h-32 w-full rounded-[12px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] p-3 text-sm outline-none"
            placeholder={t("jobs.rejectReason")}
            value={rejectReason}
            maxLength={INPUT_MAX_LENGTH.rejectionReason}
            onChange={(event) => setRejectReason(event.target.value)}
          />
        ) : null}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-full border border-[var(--joballa-border)] px-5 py-2.5 text-sm font-bold"
            disabled={loading}
            onClick={handleClose}
          >
            {t("common.cancel")}
          </button>
          <LoadingButton
            variant={copyKeys.variant ?? "primary"}
            loading={loading}
            loadingLabel={t(copyKeys.loadingLabel)}
            disabled={needsReason && !rejectReason.trim()}
            onClick={() => void handleConfirm()}
          >
            {t(copyKeys.confirmLabel)}
          </LoadingButton>
        </div>
      </section>
    </div>
  );
}

function isPendingStatus(status: string): boolean {
  const normalized = status.toLowerCase().replace(/\s+/g, "_");
  return ["pending", "pending_review", "draft"].includes(normalized);
}

function isRejectedStatus(status: string): boolean {
  return status.toLowerCase().replace(/\s+/g, "_") === "rejected";
}

function isLiveStatus(status: string): boolean {
  const normalized = status.toLowerCase().replace(/\s+/g, "_");
  return normalized === "live" || normalized === "published";
}

export function getJobPanelActions(
  variant: "pending" | "rejected" | "verified",
  job: JobListItem,
  canModerate: boolean,
  openAction: (request: JobActionRequest) => void,
  t: TranslateFn
): ReactNode {
  if (!canModerate) return undefined;

  const status = job.status;

  if (variant === "pending" && isPendingStatus(status)) {
    return (
      <>
        <button
          type="button"
          className="rounded-full border border-[var(--joballa-border)] bg-[var(--joballa-card)] px-5 py-4 text-sm font-semibold"
          onClick={() => openAction({ kind: "reject", job })}
        >
          {t("jobs.rejectAction")}
        </button>
        <button
          type="button"
          className="rounded-full bg-[var(--joballa-primary)] px-5 py-4 text-sm font-bold text-[var(--joballa-on-primary)]"
          onClick={() => openAction({ kind: "publish", job })}
        >
          {t("jobs.publishAction")}
        </button>
      </>
    );
  }

  if (variant === "rejected" && isRejectedStatus(status)) {
    return (
      <>
        <button
          type="button"
          className="rounded-full border border-[var(--joballa-border)] bg-[var(--joballa-card)] px-5 py-4 text-sm font-semibold"
          onClick={() => openAction({ kind: "send-to-review", job })}
        >
          {t("jobs.sendToReviewAction")}
        </button>
        <button
          type="button"
          className="rounded-full bg-[var(--joballa-primary)] px-5 py-4 text-sm font-bold text-[var(--joballa-on-primary)]"
          onClick={() => openAction({ kind: "publish", job })}
        >
          {t("jobs.publishAction")}
        </button>
      </>
    );
  }

  if (variant === "verified" && isLiveStatus(status)) {
    return (
      <>
        <button
          type="button"
          className="rounded-full border border-[var(--joballa-border)] bg-[var(--joballa-card)] px-5 py-4 text-sm font-semibold"
          onClick={() => openAction({ kind: "unpublish", job })}
        >
          {t("jobs.unpublishAction")}
        </button>
        <button
          type="button"
          className="rounded-full border border-[var(--joballa-danger-fg)]/30 bg-[var(--joballa-danger-bg)] px-5 py-4 text-sm font-semibold text-[var(--joballa-danger-fg)]"
          onClick={() => openAction({ kind: "reject", job })}
        >
          {t("jobs.rejectAction")}
        </button>
      </>
    );
  }

  return undefined;
}

export function getJobMenuItems(
  variant: "pending" | "rejected" | "verified",
  job: JobListItem,
  canModerate: boolean,
  openAction: (request: JobActionRequest) => void,
  t: TranslateFn
) {
  if (!canModerate) return [];

  if (variant === "pending" && isPendingStatus(job.status)) {
    return [
      { label: t("jobs.rejectAction"), tone: "danger" as const, onClick: () => openAction({ kind: "reject", job }) },
      { label: t("jobs.publishAction"), onClick: () => openAction({ kind: "publish", job }) },
    ];
  }

  if (variant === "rejected" && isRejectedStatus(job.status)) {
    return [
      { label: t("jobs.publishAction"), onClick: () => openAction({ kind: "publish", job }) },
      { label: t("jobs.sendToReviewAction"), onClick: () => openAction({ kind: "send-to-review", job }) },
    ];
  }

  if (variant === "verified" && isLiveStatus(job.status)) {
    return [
      { label: t("jobs.unpublishAction"), onClick: () => openAction({ kind: "unpublish", job }) },
      { label: t("jobs.rejectAction"), tone: "danger" as const, onClick: () => openAction({ kind: "reject", job }) },
    ];
  }

  return [];
}
