"use client";

import { useState } from "react";
import { documentsApi } from "@/lib/api/admin";
import type { AdminMe, DocumentListItem } from "@/lib/api/types";
import { useAdminAction } from "@/lib/hooks/use-admin-action";
import { useMutation } from "@/lib/hooks/use-async";
import { useTranslation } from "@/lib/i18n";
import { LoadingButton } from "../ui/states";

export const REJECTED_DOCUMENT_STATUS_OPTIONS = [
  { labelKey: "common.approved" as const, value: "approved" },
] as const;

export type RejectedDocumentStatusTarget = (typeof REJECTED_DOCUMENT_STATUS_OPTIONS)[number]["value"];

export function canChangeRejectedDocumentStatus(user: AdminMe | null): boolean {
  if (!user) return false;
  return user.role === "super_admin" || user.role === "admin_manager";
}

export function isRejectedDocumentStatus(status: string): boolean {
  return status.toLowerCase() === "rejected";
}

export function DocumentStatusChangeModal({
  document,
  onClose,
  onSuccess,
}: {
  document: DocumentListItem | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const { perform } = useAdminAction();
  const [targetStatus, setTargetStatus] = useState<RejectedDocumentStatusTarget>("approved");
  const { mutate: approveDocument, loading: approving } = useMutation((id: string) => documentsApi.approve(id));

  if (!document) return null;

  const loading = approving;

  function handleClose() {
    if (loading) return;
    setTargetStatus("approved");
    onClose();
  }

  async function handleConfirm() {
    if (!document) return;
    await perform(() => approveDocument(document.id), {
      success: t("documents.approvedSuccess"),
      onSuccess: () => {
        setTargetStatus("approved");
        onClose();
        onSuccess();
      },
    });
  }

  return (
    <div
      aria-label={t("documents.changeStatusTitle")}
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/55 px-4 py-4"
      onClick={handleClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-document-status-title"
        className="w-full max-w-lg rounded-[16px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5 text-left shadow-[0_24px_70px_rgba(0,0,0,0.28)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="change-document-status-title" className="text-xl font-bold">
          {t("documents.changeStatusTitle")}
        </h3>
        <p className="mt-1 text-sm text-[var(--joballa-muted)]">{document.type}</p>
        <label className="mt-5 grid gap-2 text-sm font-semibold">
          {t("documents.newStatus")}
          <select
            className="min-h-12 rounded-[12px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 outline-none"
            value={targetStatus}
            onChange={(event) => setTargetStatus(event.target.value as RejectedDocumentStatusTarget)}
          >
            {REJECTED_DOCUMENT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </label>
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
            loading={loading}
            loadingLabel={t("common.saving")}
            onClick={() => void handleConfirm()}
          >
            {t("common.confirm")}
          </LoadingButton>
        </div>
      </section>
    </div>
  );
}
