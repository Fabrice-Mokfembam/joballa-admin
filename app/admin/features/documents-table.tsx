"use client";

import { useState } from "react";
import { CheckCircle2, FileCheck2, FileClock, FileText, FileX2 } from "lucide-react";
import { documentsApi } from "@/lib/api/admin";
import {
  formatDocumentUser,
  formatRelativeDate,
  formatRiskLabel,
  formatStatusFilter,
  getFileKind,
} from "@/lib/api/format";
import type { DocumentListItem } from "@/lib/api/types";
import { useAdminRefresh } from "@/lib/admin-refresh";
import { INPUT_MAX_LENGTH } from "@/lib/constants/input-limits";
import { useAuth } from "@/lib/auth/auth-context";
import { useAdminAction } from "@/lib/hooks/use-admin-action";
import { isAsyncRefreshing, isInitialAsyncLoad, useAsyncData, useMutation } from "@/lib/hooks/use-async";
import { useTranslation } from "@/lib/i18n";
import { DateField, FilterSelect, MoreMenu, PaginationBar, SearchField, StatusBadge, SummaryCards } from "../ui";
import { DocumentsTableSkeleton } from "../ui/skeletons";
import { AccessDeniedState, EmptyState, ErrorState, LoadingButton, SkeletonBar } from "../ui/states";
import {
  DocumentStatusChangeModal,
  canChangeRejectedDocumentStatus,
  isRejectedDocumentStatus,
} from "./document-status-change";

const DOCUMENT_STATUS_FILTER_KEYS = ["common.all", "common.pending", "common.approved", "common.rejected"] as const;
const DOCUMENT_STATUS_FILTER_VALUES = ["All", "Pending", "Approved", "Rejected"] as const;
const PAGE_SIZE = 20;
const DOCUMENT_GRID_COLUMNS =
  "md:min-w-[760px] md:w-full md:grid-cols-[minmax(220px,1.35fr)_minmax(180px,1fr)_140px_120px_52px]";

function isPendingDocumentStatus(status: string): boolean {
  const normalized = status.toLowerCase();
  return normalized === "pending" || normalized === "pending_review";
}

export function DocumentsTable({
  limit,
  unresolvedOnly = false,
  initialItems,
  skeletonOnly = false,
}: {
  limit?: number;
  unresolvedOnly?: boolean;
  initialItems?: DocumentListItem[];
  skeletonOnly?: boolean;
} = {}) {
  const { t } = useTranslation();
  const { hasPermission, user } = useAuth();
  const { perform, toast } = useAdminAction();
  const canRead = hasPermission("documents:read");
  const canReview = hasPermission("documents:review");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);
  const [rejectingDocument, setRejectingDocument] = useState<DocumentListItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; name: string } | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [statusChangeDocument, setStatusChangeDocument] = useState<DocumentListItem | null>(null);
  const canChangeRejectedStatus = canChangeRejectedDocumentStatus(user);

  const { data: listResult, loading, error, reload } = useAsyncData(async () => {
    if (initialItems !== undefined) return { items: initialItems, page: 1, limit: PAGE_SIZE, total: initialItems.length, totalPages: 1 };
    const result = await documentsApi.list({
      page,
      limit: limit ?? PAGE_SIZE,
      status: formatStatusFilter(statusFilter),
    });
    return result;
  }, [initialItems, limit, unresolvedOnly, statusFilter, searchQuery, page], {
    cacheKey: initialItems === undefined ? `documents:${page}:${statusFilter}:${searchQuery.trim()}` : undefined,
  });

  useAdminRefresh(["documents"], () => {
    if (initialItems === undefined) reload();
  });

  const items = listResult?.items;
  const totalPages = listResult?.totalPages ?? 1;

  const { mutate: approveDocument } = useMutation((id: string) => documentsApi.approve(id));
  const { mutate: rejectDocument, loading: rejecting } = useMutation((id: string, reason: string) =>
    documentsApi.reject(id, reason)
  );

  const isInitialLoad = initialItems === undefined && isInitialAsyncLoad(loading, items);
  const isRefreshing = initialItems === undefined && isAsyncRefreshing(loading, items);

  if (skeletonOnly) {
    return <DocumentsTableSkeleton rows={limit ?? 5} />;
  }

  if (!canRead) {
    return <AccessDeniedState description={t("documents.accessDenied")} />;
  }

  if (isInitialLoad) {
    return <DocumentsTableSkeleton rows={limit ?? 5} />;
  }

  if (error && initialItems === undefined && items === null) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  const allDocuments = items ?? [];
  const filteredDocuments = allDocuments
    .filter((document) => {
      const query = searchQuery.trim().toLowerCase();
      return !query || `${document.type} ${formatDocumentUser(document.user)} ${document.status}`.toLowerCase().includes(query);
    })
    .filter((document) => !dateFilter || document.submittedAt.slice(0, 10) === dateFilter);
  const visibleDocuments = limit ? filteredDocuments.slice(0, limit) : filteredDocuments;
  const showWorkspace = limit === undefined;
  const counts = {
    pending: allDocuments.filter((item) => isPendingDocumentStatus(item.status)).length,
    approved: allDocuments.filter((item) => item.status.toLowerCase() === "approved").length,
    rejected: allDocuments.filter((item) => item.status.toLowerCase() === "rejected").length,
  };

  async function handleView(document: DocumentListItem) {
    setViewingId(document.id);
    try {
      const detail = await documentsApi.get(document.id);
      if (detail.file?.url) {
        const isPdf =
          detail.file.mimeType.toLowerCase().includes("pdf") ||
          detail.file.url.toLowerCase().split("?")[0].endsWith(".pdf");
        if (isPdf) {
          setPdfLoading(true);
          setPdfPreview({ url: detail.file.url, name: detail.file.fileName || document.type });
          return;
        }
        window.open(detail.file.url, "_blank", "noopener,noreferrer");
        return;
      }
      window.open(`/admin/documents/${document.id}`, "_blank", "noopener,noreferrer");
    } catch {
      toast.error(t("documents.openError"));
    } finally {
      setViewingId(null);
    }
  }

  async function handleAccept(documentId: string) {
    setActionId(documentId);
    try {
      await perform(() => approveDocument(documentId), {
        success: t("documents.acceptedSuccess"),
        onSuccess: () => {
          if (initialItems === undefined) reload();
        },
      });
    } finally {
      setActionId(null);
    }
  }

  function closeRejectModal() {
    if (rejecting) return;
    setRejectingDocument(null);
    setRejectReason("");
  }

  async function handleRejectConfirm() {
    if (!rejectingDocument || !rejectReason.trim()) return;
    await perform(() => rejectDocument(rejectingDocument.id, rejectReason.trim()), {
      success: t("documents.rejectedSuccess"),
      onSuccess: () => {
        setRejectingDocument(null);
        setRejectReason("");
        if (initialItems === undefined) reload();
      },
    });
  }

  return (
    <>
      {showWorkspace ? (
        <>
          <SummaryCards items={[
            { label: t("documents.pendingReview"), value: counts.pending, note: t("documents.awaitingReview"), icon: FileClock, tone: "amber" },
            { label: t("common.approved"), value: counts.approved, note: t("documents.approvedNote"), icon: CheckCircle2, tone: "blue" },
            { label: t("common.rejected"), value: counts.rejected, note: t("documents.rejectedNote"), icon: FileX2, tone: "red" },
            { label: t("documents.totalDocuments"), value: listResult?.total ?? allDocuments.length, note: t("documents.allSubmissions"), icon: FileCheck2, tone: "jade" },
          ]} />
          <section className="mb-6 flex flex-wrap gap-3">
            <SearchField value={searchQuery} onChange={setSearchQuery} placeholder={t("documents.searchPlaceholder")} />
            <FilterSelect
              label={t("documents.statusFilter")}
              value={t(DOCUMENT_STATUS_FILTER_KEYS[DOCUMENT_STATUS_FILTER_VALUES.indexOf(statusFilter as (typeof DOCUMENT_STATUS_FILTER_VALUES)[number])])}
              options={DOCUMENT_STATUS_FILTER_KEYS.map((key) => t(key))}
              onChange={(label) => {
                const index = DOCUMENT_STATUS_FILTER_KEYS.findIndex((key) => t(key) === label);
                if (index >= 0) setStatusFilter(DOCUMENT_STATUS_FILTER_VALUES[index]);
              }}
            />
            <DateField value={dateFilter} onChange={setDateFilter} />
          </section>
        </>
      ) : null}

      {error && initialItems === undefined ? (
        <p className="mb-4 rounded-[8px] border border-[var(--joballa-danger-border)] bg-[var(--joballa-danger-bg)] px-4 py-3 text-sm font-medium text-[var(--joballa-danger-fg)]">
          {error}
        </p>
      ) : null}

      {isRefreshing ? (
        <DocumentsTableSkeleton rows={limit ?? 5} />
      ) : visibleDocuments.length === 0 ? (
        <EmptyState title={t("documents.noDocuments")} description={t("documents.noDocumentsDescription")} />
      ) : (
      <section
        className="overflow-x-auto rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)]"
      >
        <div className={["hidden border-b border-[var(--joballa-border)] bg-[var(--joballa-page-tint)] px-4 py-3 text-xs font-bold uppercase tracking-[0.08em] text-[var(--joballa-muted)] md:grid md:items-center", DOCUMENT_GRID_COLUMNS].join(" ")}>
          <span>{t("documents.document")}</span>
          <span>{t("documents.user")}</span>
          <span>{t("documents.submitted")}</span>
          <span>{t("common.status")}</span>
          <span className="text-right">{t("common.actions")}</span>
        </div>
        {visibleDocuments.map((document) => {
          const fileKind = getFileKind(undefined, document.type);
          const isPending = isPendingDocumentStatus(document.status);
          const isRejected = isRejectedDocumentStatus(document.status);

          return (
            <article
              key={document.id}
              className={["grid gap-4 border-b border-[var(--joballa-border)] px-4 py-4 last:border-0 md:items-center", DOCUMENT_GRID_COLUMNS].join(" ")}
            >
              <button type="button" className="flex min-w-0 items-center gap-3 text-left" onClick={() => void handleView(document)}>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[6px] bg-[var(--joballa-danger-bg)] text-[var(--joballa-danger-fg)]"><FileText size={20} /></span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[var(--joballa-primary)] hover:underline">{document.type}</p>
                  <p className="mt-1 text-xs font-semibold text-[var(--joballa-muted)]">{fileKind} · {t("documents.risk", { level: formatRiskLabel(document.risk) })}</p>
                </div>
              </button>

              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold">{formatDocumentUser(document.user)}</h3>
                <p className="mt-1 text-xs font-semibold text-[var(--joballa-muted)]">{document.department}</p>
              </div>

              <div className="text-sm font-semibold text-[var(--joballa-muted)]">
                {formatRelativeDate(document.submittedAt)}
              </div>

              <div className="text-sm font-semibold text-[var(--joballa-muted)]">
                <StatusBadge value={document.status} />
              </div>

              <div className="justify-self-start md:justify-self-end">
                <MoreMenu
                  label={t("documents.actionsFor", { type: document.type })}
                  items={[
                    {
                      label: viewingId === document.id ? t("documents.opening") : t("common.view"),
                      onClick: () => void handleView(document),
                    },
                    ...(canReview && isPending
                      ? [
                          {
                            label: actionId === document.id ? t("documents.accepting") : t("documents.accept"),
                            onClick: () => handleAccept(document.id),
                          },
                          {
                            label: t("documents.reject"),
                            onClick: () => {
                              setRejectReason("");
                              setRejectingDocument(document);
                            },
                          },
                        ]
                      : []),
                    ...(canChangeRejectedStatus && isRejected
                      ? [
                          {
                            label: t("documents.changeStatus"),
                            onClick: () => setStatusChangeDocument(document),
                          },
                        ]
                      : []),
                  ]}
                />
              </div>
            </article>
          );
        })}
      </section>
      )}

      {showWorkspace ? (
        <PaginationBar page={page} totalPages={totalPages} total={listResult?.total} onPageChange={setPage} />
      ) : null}

      {pdfPreview ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4" onClick={() => setPdfPreview(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label={pdfPreview.name}
            className="flex h-[calc(100vh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[12px] bg-[var(--joballa-card)] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-[var(--joballa-border)] px-5 py-4">
              <h2 className="truncate text-base font-bold">{pdfPreview.name}</h2>
              <button type="button" className="rounded-full border border-[var(--joballa-border)] px-4 py-2 text-sm font-bold" onClick={() => setPdfPreview(null)}>{t("common.close")}</button>
            </div>
            <div className="relative min-h-0 flex-1 bg-white">
              {pdfLoading ? (
                <div className="absolute inset-0 z-10 grid gap-4 bg-[var(--joballa-card)] p-6">
                  <SkeletonBar className="h-8 w-48" />
                  <SkeletonBar className="h-full min-h-0 w-full rounded-[8px]" />
                </div>
              ) : null}
              <iframe title={pdfPreview.name} src={pdfPreview.url} className="h-full w-full bg-white" onLoad={() => setPdfLoading(false)} />
            </div>
          </section>
        </div>
      ) : null}

      {rejectingDocument ? (
        <div
          aria-label="Close reject document dialog"
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/55 px-4 py-4"
          onClick={closeRejectModal}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-document-dialog-title"
            className="w-full max-w-lg rounded-[16px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5 text-left shadow-[0_24px_70px_rgba(0,0,0,0.28)]"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="reject-document-dialog-title" className="text-xl font-bold">
              {t("documents.rejectTitle")}
            </h3>
            <p className="mt-1 text-sm text-[var(--joballa-muted)]">
              {formatDocumentUser(rejectingDocument.user)} · {rejectingDocument.type}
            </p>
            <textarea
              className="mt-5 min-h-32 w-full rounded-[12px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] p-3 text-sm outline-none"
              placeholder={t("documents.rejectReason")}
              value={rejectReason}
              maxLength={INPUT_MAX_LENGTH.rejectionReason}
              onChange={(event) => setRejectReason(event.target.value)}
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-full border border-[var(--joballa-border)] px-5 py-2.5 text-sm font-bold"
                disabled={rejecting}
                onClick={closeRejectModal}
              >
                {t("common.cancel")}
              </button>
              <LoadingButton
                variant="danger"
                loading={rejecting}
                loadingLabel={t("documents.rejecting")}
                disabled={!rejectReason.trim()}
                onClick={() => void handleRejectConfirm()}
              >
                {t("common.confirm")}
              </LoadingButton>
            </div>
          </section>
        </div>
      ) : null}

      <DocumentStatusChangeModal
        document={statusChangeDocument}
        onClose={() => setStatusChangeDocument(null)}
        onSuccess={() => {
          if (initialItems === undefined) reload();
        }}
      />
    </>
  );
}

