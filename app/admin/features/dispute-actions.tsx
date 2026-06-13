"use client";

import { useState } from "react";
import { reportsApi } from "@/lib/api/admin";
import type { ReportListItem } from "@/lib/api/types";
import { EM_DASH } from "@/lib/constants";
import { INPUT_MAX_LENGTH } from "@/lib/constants/input-limits";
import { useAuth } from "@/lib/auth/auth-context";
import { useAdminAction } from "@/lib/hooks/use-admin-action";
import { useMutation } from "@/lib/hooks/use-async";
import { useTranslation } from "@/lib/i18n";
import { MoreMenu } from "../ui";
import { LoadingButton } from "../ui/states";

export function DisputeActionsMenu({
  report,
  onAction,
}: {
  report: ReportListItem;
  onAction: () => void;
}) {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const canResolve = hasPermission("reports:resolve");
  const [resolvingReport, setResolvingReport] = useState<ReportListItem | null>(null);

  if (!canResolve) {
    return <>{EM_DASH}</>;
  }

  return (
    <>
      <MoreMenu
        label={t("disputes.actionsFor", { subject: report.subject })}
        items={[
          {
            label: t("disputes.resolve"),
            onClick: () => setResolvingReport(report),
          },
        ]}
      />
      <ResolveDisputeModal
        report={resolvingReport}
        onClose={() => setResolvingReport(null)}
        onSuccess={onAction}
      />
    </>
  );
}

function ResolveDisputeModal({
  report,
  onClose,
  onSuccess,
}: {
  report: ReportListItem | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const { perform } = useAdminAction();
  const [resolutionText, setResolutionText] = useState("");
  const [resolutionDecision, setResolutionDecision] = useState<"approve_worker" | "approve_employer" | "partial" | "dismiss">("dismiss");

  const { mutate: resolveReport, loading: resolving } = useMutation((id: string, decision: "approve_worker" | "approve_employer" | "partial" | "dismiss", notes: string) =>
    reportsApi.resolve(id, decision, notes)
  );

  if (!report) return null;

  function handleClose() {
    if (resolving) return;
    setResolutionText("");
    setResolutionDecision("dismiss");
    onClose();
  }

  async function handleConfirm() {
    if (!report || !resolutionText.trim()) return;
    await perform(() => resolveReport(report.id, resolutionDecision, resolutionText.trim()), {
      success: t("disputes.resolvedSuccess"),
      onSuccess: () => {
        setResolutionText("");
        setResolutionDecision("dismiss");
        onClose();
        onSuccess();
      },
    });
  }

  return (
    <div
      aria-label={t("disputes.closeResolveDialog")}
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/55 px-4 py-4"
      onClick={handleClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="resolve-dispute-dialog-title"
        className="w-full max-w-lg rounded-[16px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5 text-left shadow-[0_24px_70px_rgba(0,0,0,0.28)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="resolve-dispute-dialog-title" className="text-xl font-bold">
          {t("disputes.resolveTitle")}
        </h3>
        <p className="mt-1 text-sm text-[var(--joballa-muted)]">{report.subject}</p>
        <label className="mt-5 grid gap-2 text-sm font-bold">
          {t("disputes.resolutionDecision")}
          <select
            className="min-h-12 rounded-[12px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 font-normal outline-none"
            value={resolutionDecision}
            onChange={(event) => setResolutionDecision(event.target.value as typeof resolutionDecision)}
          >
            <option value="approve_worker">{t("disputes.approveWorker")}</option>
            <option value="approve_employer">{t("disputes.approveEmployer")}</option>
            <option value="partial">{t("disputes.partialResolution")}</option>
            <option value="dismiss">{t("disputes.dismiss")}</option>
          </select>
        </label>
        <textarea
          className="mt-4 min-h-32 w-full rounded-[12px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] p-3 text-sm outline-none"
          placeholder={t("disputes.resolutionText")}
          value={resolutionText}
          maxLength={INPUT_MAX_LENGTH.note}
          onChange={(event) => setResolutionText(event.target.value)}
        />
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-full border border-[var(--joballa-border)] px-5 py-2.5 text-sm font-bold"
            disabled={resolving}
            onClick={handleClose}
          >
            {t("common.cancel")}
          </button>
          <LoadingButton
            loading={resolving}
            loadingLabel={t("disputes.resolving")}
            disabled={!resolutionText.trim()}
            onClick={() => void handleConfirm()}
          >
            {t("common.confirm")}
          </LoadingButton>
        </div>
      </section>
    </div>
  );
}
