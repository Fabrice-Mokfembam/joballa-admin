"use client";

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
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <button
        type="button"
        disabled={page <= 1}
        className="rounded-full border border-[var(--joballa-border)] px-4 py-2 text-sm font-bold disabled:opacity-40"
        onClick={() => onPageChange(Math.max(1, page - 1))}
      >
        Previous
      </button>
      <span className="text-sm font-semibold text-[var(--joballa-muted)]">
        Page {page} of {totalPages}
        {total !== undefined ? ` · ${total} total` : ""}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        className="rounded-full border border-[var(--joballa-border)] px-4 py-2 text-sm font-bold disabled:opacity-40"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
      >
        Next
      </button>
    </div>
  );
}
