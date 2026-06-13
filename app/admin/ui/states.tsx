"use client";

import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export function SkeletonBar({ className = "" }: { className?: string }) {
  return (
    <span
      className={["block animate-pulse rounded-[6px] bg-[var(--joballa-border)]", className].join(" ")}
      aria-hidden
    />
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="grid place-items-center rounded-[12px] border border-dashed border-[var(--joballa-border)] bg-[var(--joballa-card)] px-6 py-16 text-center">
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-[var(--joballa-page-tint)] text-[var(--joballa-muted)]">
        <Inbox size={28} />
      </span>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--joballa-muted)]">{description}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="rounded-[12px] border border-[var(--joballa-danger-fg)]/25 bg-[var(--joballa-danger-bg)] px-5 py-8 text-center">
      <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[var(--joballa-danger-bg)] text-[var(--joballa-danger-fg)] ring-1 ring-[var(--joballa-danger-fg)]/20">
        <AlertCircle size={22} />
      </span>
      <p className="text-sm font-semibold text-[var(--joballa-danger-fg)]">{message}</p>
      {onRetry ? (
        <button
          type="button"
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--joballa-danger-fg)]/30 bg-[var(--joballa-card)] px-4 py-2 text-sm font-bold text-[var(--joballa-danger-fg)] transition hover:bg-[var(--joballa-page-tint)]"
          onClick={onRetry}
        >
          <RefreshCw size={16} />
          {t("common.tryAgain")}
        </button>
      ) : null}
    </div>
  );
}

export function AccessDeniedState({
  title,
  description,
}: {
  title?: string;
  description?: string;
}) {
  const { t } = useTranslation();

  return (
    <div className="rounded-[12px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-8 text-center">
      <h2 className="text-xl font-bold">{title ?? t("common.accessDenied")}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--joballa-muted)]">
        {description ?? t("common.accessDeniedDescription")}
      </p>
    </div>
  );
}

export function LoadingButton({
  loading,
  loadingLabel,
  children,
  className = "",
  disabled,
  onClick,
  type = "button",
  variant = "primary",
}: {
  loading: boolean;
  loadingLabel: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "danger";
}) {
  const variantClass =
    variant === "primary"
      ? "bg-[var(--joballa-primary)] text-[var(--joballa-on-primary)]"
      : variant === "danger"
        ? "bg-[var(--joballa-danger-fg)] text-[var(--joballa-on-primary)]"
        : "border border-[var(--joballa-border)] bg-[var(--joballa-card)]";

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={[
        "rounded-full px-5 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
        variantClass,
        className,
      ].join(" ")}
    >
      {loading ? loadingLabel : children}
    </button>
  );
}
