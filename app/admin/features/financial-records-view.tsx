"use client";

import { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, CircleDollarSign, ReceiptText, X } from "lucide-react";
import { financeApi } from "@/lib/api/admin";
import { formatStatusLabel } from "@/lib/api/format";
import type { FinanceRecord } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";
import { isInitialAsyncLoad, useAsyncData } from "@/lib/hooks/use-async";
import { useTranslation } from "@/lib/i18n";
import { DataTable, FilterSelect, MoreMenu, PaginationBar, StatusBadge, SummaryCards } from "../ui";
import { DataTableSkeleton } from "../ui/skeletons";
import { AccessDeniedState, EmptyState, ErrorState } from "../ui/states";

const PAGE_SIZE = 20;
const STATUS_FILTER_KEYS = ["finance.allStatuses", "finance.completed", "common.pending", "finance.failed"] as const;
const STATUS_FILTER_VALUES = ["All statuses", "Completed", "Pending", "Failed"] as const;
const PROVIDER_FILTER_ALL = "All providers";

function formatMoney(value: number, currency = "XAF") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export function FinancialRecordsView() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<(typeof STATUS_FILTER_VALUES)[number]>("All statuses");
  const [provider, setProvider] = useState(PROVIDER_FILTER_ALL);
  const [selectedRecord, setSelectedRecord] = useState<FinanceRecord | null>(null);
  const [openingRecordId, setOpeningRecordId] = useState<string | null>(null);
  const { data: summary, loading: summaryLoading, error: summaryError, reload: reloadSummary } = useAsyncData(() => financeApi.summary(), []);
  const { data, loading, error, reload } = useAsyncData(
    () => financeApi.list({
      page,
      limit: PAGE_SIZE,
      status: status === "All statuses" ? undefined : status,
      provider: provider === PROVIDER_FILTER_ALL ? undefined : provider,
    }),
    [page, status, provider]
  );

  function formatRecordDetail(value: unknown): string {
    if (value === null || value === "") return t("finance.notRecorded");
    if (value && typeof value === "object") {
      return Object.entries(value)
        .filter(([, item]) => item !== null && item !== "")
        .map(([key, item]) => `${formatStatusLabel(key)}: ${String(item)}`)
        .join(" · ");
    }
    return String(value);
  }

  const tableColumns = [t("finance.reference"), t("finance.provider"), t("finance.type"), t("finance.amount"), t("common.status"), t("common.actions")] as const;

  if (!hasPermission("finance:read")) return <AccessDeniedState description={t("finance.accessDenied")} />;
  if (isInitialAsyncLoad(loading || summaryLoading, data)) return <DataTableSkeleton columns={[...tableColumns]} rows={6} />;
  if ((error && data === null) || (summaryError && summary === null)) return <ErrorState message={error ?? summaryError ?? t("finance.loadError")} onRetry={() => { reload(); reloadSummary(); }} />;

  const records = data?.items ?? [];
  const providers = Array.from(new Set(records.map((record) => record.provider).filter(Boolean)));
  const providerOptions = [t("finance.allProviders"), ...providers];

  async function openRecord(record: FinanceRecord) {
    setOpeningRecordId(record.id);
    try {
      setSelectedRecord(await financeApi.get(record.id));
    } finally {
      setOpeningRecordId(null);
    }
  }

  return (
    <section>
      <SummaryCards items={[
        { label: t("finance.totalTransactions"), value: summary?.totalTransactions.toLocaleString() ?? "0", icon: ReceiptText, tone: "blue" },
        { label: t("finance.amountIn"), value: formatMoney(summary?.totalAmountIn ?? 0), icon: ArrowDownToLine, tone: "jade" },
        { label: t("finance.amountOut"), value: formatMoney(summary?.totalAmountOut ?? 0), icon: ArrowUpFromLine, tone: "amber" },
        { label: t("finance.netBalance"), value: formatMoney(summary?.netBalance ?? 0), icon: CircleDollarSign, tone: "violet" },
      ]} />

      <div className="mb-5 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap">
        <FilterSelect
          label={t("finance.statusFilter")}
          value={t(STATUS_FILTER_KEYS[STATUS_FILTER_VALUES.indexOf(status)])}
          options={STATUS_FILTER_KEYS.map((key) => t(key))}
          onChange={(label) => {
            const index = STATUS_FILTER_KEYS.findIndex((key) => t(key) === label);
            if (index >= 0) {
              setStatus(STATUS_FILTER_VALUES[index]);
              setPage(1);
            }
          }}
        />
        <FilterSelect
          label={t("finance.providerFilter")}
          value={provider === PROVIDER_FILTER_ALL ? t("finance.allProviders") : provider}
          options={providerOptions}
          onChange={(label) => {
            setProvider(label === t("finance.allProviders") ? PROVIDER_FILTER_ALL : label);
            setPage(1);
          }}
        />
      </div>

      {records.length === 0 ? (
        <EmptyState title={t("finance.noRecords")} description={t("finance.noRecordsDescription")} />
      ) : (
        <DataTable columns={[...tableColumns]} rows={records.map((record) => [
          record.fapshiTransactionId ?? record.receiptNumber ?? record.id,
          formatStatusLabel(record.provider),
          formatStatusLabel(record.type),
          formatMoney(record.amount, record.currency),
          <StatusBadge key="status" value={record.status} />,
          <MoreMenu key="actions" label={`${record.fapshiTransactionId ?? record.id} actions`} items={[{ label: openingRecordId === record.id ? t("finance.opening") : t("finance.viewDetails"), onClick: () => openRecord(record) }]} />,
        ])} />
      )}
      <PaginationBar page={page} totalPages={data?.totalPages ?? 1} total={data?.total} onPageChange={setPage} />

      {selectedRecord ? (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/55 px-4 py-4" onClick={() => setSelectedRecord(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="finance-record-title" className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <h2 id="finance-record-title" className="text-xl font-bold">{t("finance.transactionDetails")}</h2>
              <button type="button" aria-label={t("finance.closeDetails")} className="grid h-9 w-9 place-items-center rounded-[8px] border border-[var(--joballa-border)]" onClick={() => setSelectedRecord(null)}><X size={18} /></button>
            </div>
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              {Object.entries(selectedRecord).map(([key, value]) => (
                <div key={key} className="min-w-0 border-b border-[var(--joballa-border)] pb-3">
                  <dt className="text-xs font-bold uppercase text-[var(--joballa-muted)]">{formatStatusLabel(key)}</dt>
                  <dd className="mt-1 break-words font-semibold">{formatRecordDetail(value)}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      ) : null}
    </section>
  );
}
