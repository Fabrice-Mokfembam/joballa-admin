"use client";

import Image from "next/image";
import { useState } from "react";
import { documentsApi } from "@/lib/api/admin";
import {
  formatFileSize,
  formatDocumentUser,
  formatRelativeDate,
  formatRiskLabel,
  getFileKind,
} from "@/lib/api/format";
import { useAdminRefresh } from "@/lib/admin-refresh";
import { INPUT_MAX_LENGTH } from "@/lib/constants/input-limits";
import { useAuth } from "@/lib/auth/auth-context";
import { useTranslation } from "@/lib/i18n";
import { useAdminAction } from "@/lib/hooks/use-admin-action";
import { useAsyncData, useMutation } from "@/lib/hooks/use-async";
import { Metric, PageHeader, StatusBadge } from "../ui";
import { DocumentDetailSkeleton } from "../ui/skeletons";
import { AccessDeniedState, ErrorState, LoadingButton } from "../ui/states";
import {
  DocumentStatusChangeModal,
  canChangeRejectedDocumentStatus,
  isRejectedDocumentStatus,
} from "./document-status-change";

function isPendingDocumentStatus(status: string): boolean {
  const normalized = status.toLowerCase();
  return normalized === "pending" || normalized === "pending_review";
}

export function DocumentDetailView({ documentId }: { documentId: string }) {
  const { t } = useTranslation();
  const { hasPermission, user } = useAuth();
  const canRead = hasPermission("documents:read");
  const canReview = hasPermission("documents:review");
  const canChangeRejectedStatus = canChangeRejectedDocumentStatus(user);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [showStatusChange, setShowStatusChange] = useState(false);
  const { perform } = useAdminAction();

  const { data: document, loading, error, reload } = useAsyncData(
    () => documentsApi.get(documentId),
    [documentId]
  );

  useAdminRefresh(["documents"], reload);

  const { mutate: approve, loading: approving } = useMutation(() => documentsApi.approve(documentId));
  const { mutate: reject, loading: rejecting } = useMutation((reason: string) =>
    documentsApi.reject(documentId, reason)
  );

  if (!canRead) {
    return <AccessDeniedState description={t("documents.detailAccessDenied")} />;
  }

  if (loading) {
    return (
      <>
        <PageHeader title={t("documents.verifyTitle")} description={t("documents.verifyDescription")} />
        <DocumentDetailSkeleton />
      </>
    );
  }

  if (error || !document) {
    return (
      <>
        <PageHeader title={t("documents.verifyTitle")} description={t("documents.verifyDescription")} />
        <ErrorState message={error ?? t("documents.notFound")} onRetry={reload} />
      </>
    );
  }

  const fileKind = getFileKind(document.file?.mimeType, document.file?.fileName ?? document.type);
  const isPending = isPendingDocumentStatus(document.status);
  const isRejected = isRejectedDocumentStatus(document.status);
  const previewUrl = document.file?.url;

  async function handleApprove() {
    await perform(() => approve(), { success: t("documents.approvedSuccess"), onSuccess: reload });
  }

  async function handleReject() {
    if (!rejectReason.trim()) return;
    await perform(() => reject(rejectReason.trim()), {
      success: t("documents.rejectedSuccess"),
      onSuccess: () => {
        setShowReject(false);
        setRejectReason("");
        reload();
      },
    });
  }

  return (
    <>
      <PageHeader title={t("documents.verifyTitle")} description={t("documents.verifyDescription")} />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[var(--joballa-muted)]">
                {document.id}
              </p>
              <h2 className="mt-2 text-2xl font-bold">{document.type}</h2>
              <p className="mt-1 text-sm text-[var(--joballa-muted)]">{t("documents.submittedBy", { user: formatDocumentUser(document.user) })}</p>
            </div>
            <StatusBadge value={document.status} />
          </div>

          <div className="mt-6 grid min-h-[420px] place-items-center overflow-hidden rounded-[8px] border border-dashed border-[var(--joballa-border)] bg-[var(--joballa-page-tint)]">
            {previewUrl ? (
              document.file?.mimeType?.startsWith("image/") ? (
                <Image
                  src={previewUrl}
                  alt={document.file?.fileName ?? document.type}
                  width={800}
                  height={600}
                  className="max-h-[70vh] w-full object-contain"
                  unoptimized
                />
              ) : (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-[8px] bg-[var(--joballa-primary)] px-5 py-3 text-sm font-semibold text-[var(--joballa-on-primary)]"
                >
                  {t("documents.openPreview", { kind: fileKind })}
                </a>
              )
            ) : (
              <div className="text-center">
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-[8px] bg-[var(--joballa-jade-3)] text-2xl font-black text-[var(--joballa-primary)]">
                  {fileKind}
                </div>
                <p className="mt-4 text-lg font-semibold">{t("documents.noPreview")}</p>
                <p className="mt-1 text-sm text-[var(--joballa-muted)]">{t("documents.noPreviewDescription")}</p>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5">
            <h3 className="font-bold">{t("documents.verificationSummary")}</h3>
            <div className="mt-4 grid gap-3">
              <Metric label={t("dashboard.department")} value={document.department} />
              <Metric label={t("documents.submitted")} value={formatRelativeDate(document.submittedAt)} />
              <Metric label={t("documents.riskLabel")} value={formatRiskLabel(document.risk)} />
              {document.file?.sizeBytes ? (
                <Metric label={t("documents.fileSize")} value={formatFileSize(document.file.sizeBytes)} />
              ) : null}
            </div>
          </section>

          {canReview && isPending ? (
            <section className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5">
              <h3 className="font-bold">{t("documents.decision")}</h3>
              <div className="mt-4 grid gap-3">
                <LoadingButton
                  type="button"
                  loading={approving}
                  loadingLabel={t("documents.approving")}
                  className="w-full rounded-[8px]"
                  onClick={() => void handleApprove()}
                >
                  {t("documents.approveDocument")}
                </LoadingButton>
                <button
                  type="button"
                  className="rounded-[8px] bg-[var(--joballa-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--joballa-danger-fg)]"
                  onClick={() => {
                    setShowReject(true);
                  }}
                >
                  {t("documents.rejectDocument")}
                </button>
              </div>

              {showReject ? (
                <div className="mt-4 space-y-3">
                  <textarea
                    className="min-h-24 w-full rounded-[12px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] p-3 text-sm outline-none"
                    placeholder={t("documents.rejectReason")}
                    value={rejectReason}
                    maxLength={INPUT_MAX_LENGTH.rejectionReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                  />
                  <LoadingButton
                    type="button"
                    variant="danger"
                    loading={rejecting}
                    loadingLabel={t("documents.rejecting")}
                    disabled={!rejectReason.trim()}
                    className="w-full"
                    onClick={() => void handleReject()}
                  >
                    {t("documents.confirmRejection")}
                  </LoadingButton>
                </div>
              ) : null}
            </section>
          ) : null}

          {canChangeRejectedStatus && isRejected ? (
            <section className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5">
              <h3 className="font-bold">{t("documents.rejectedDocument")}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--joballa-muted)]">{t("documents.rejectedDocumentHint")}</p>
              <button
                type="button"
                className="mt-4 w-full rounded-[8px] bg-[var(--joballa-primary)] px-4 py-3 text-sm font-semibold text-[var(--joballa-on-primary)]"
                onClick={() => setShowStatusChange(true)}
              >
                {t("documents.changeStatus")}
              </button>
            </section>
          ) : null}
        </aside>
      </div>

      <DocumentStatusChangeModal
        document={showStatusChange ? document : null}
        onClose={() => setShowStatusChange(false)}
        onSuccess={reload}
      />
    </>
  );
}

