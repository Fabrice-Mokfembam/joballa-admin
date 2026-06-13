"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

type ToastTone = "success" | "error";

type ToastItem = {
  id: string;
  tone: ToastTone;
  message: string;
};

type ToastContextValue = {
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function ToastViewport({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: string) => void }) {
  const { t } = useTranslation();

  if (items.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-full max-w-sm flex-col gap-3 px-4 sm:px-0"
    >
      {items.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={[
            "pointer-events-auto flex items-start gap-3 rounded-[12px] border px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.16)]",
            toast.tone === "success"
              ? "border-[var(--joballa-success-border)] bg-[var(--joballa-success-bg)] text-[var(--joballa-success-fg)]"
              : "border-[var(--joballa-danger-border)] bg-[var(--joballa-danger-bg)] text-[var(--joballa-danger-fg)]",
          ].join(" ")}
        >
          <span className="mt-0.5 shrink-0">
            {toast.tone === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          </span>
          <p className="min-w-0 flex-1 text-sm font-semibold leading-5">{toast.message}</p>
          <button
            type="button"
            aria-label={t("common.dismissNotification")}
            className="shrink-0 rounded-full p-1 opacity-70 transition hover:opacity-100"
            onClick={() => onDismiss(toast.id)}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
    setItems((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setItems((current) => [...current, { id, tone, message }]);
      const timeout = setTimeout(() => dismiss(id), 4500);
      timeoutsRef.current.set(id, timeout);
    },
    [dismiss]
  );

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
      timeouts.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
