"use client";

import { useTranslation } from "@/lib/i18n";

export function PaginationBar({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total?: number;
  onPageChange: (page: number) => void;
}) {
  const { t } = useTranslation();

  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <button
        type="button"
        disabled={page <= 1}
        className="rounded-full border border-[var(--joballa-border)] px-4 py-2 text-sm font-bold disabled:opacity-40"
        onClick={() => onPageChange(Math.max(1, page - 1))}
      >
        {t("common.previous")}
      </button>
      <span className="text-sm font-semibold text-[var(--joballa-muted)]">
        {t("common.pageOf", { page: String(page), totalPages: String(totalPages) })}
        {total !== undefined ? ` · ${t("common.totalCount", { total: String(total) })}` : ""}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        className="rounded-full border border-[var(--joballa-border)] px-4 py-2 text-sm font-bold disabled:opacity-40"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
      >
        {t("common.next")}
      </button>
    </div>
  );
}
