"use client";

import { useCallback } from "react";
import {
  ALL_ADMIN_REFRESH_SCOPES,
  emitAdminRefresh,
  type AdminRefreshScope,
} from "@/lib/admin-refresh";
import { useToast } from "@/lib/toast/toast";
import { formatApiError } from "@/lib/api/errors";

type PerformOptions = {
  success: string;
  error?: string;
  onSuccess?: () => void;
  /** Scopes to invalidate after success. `false` skips global refresh. Default: all scopes. */
  refresh?: false | AdminRefreshScope[];
};

export function useAdminAction() {
  const toast = useToast();

  const perform = useCallback(
    async <T,>(action: () => Promise<T | null>, options: PerformOptions): Promise<boolean> => {
      try {
        const result = await action();
        if (result !== null) {
          toast.success(options.success);
          if (options.refresh !== false) {
            const scopes =
              options.refresh === undefined ? ALL_ADMIN_REFRESH_SCOPES : options.refresh;
            emitAdminRefresh(...scopes);
          }
          options.onSuccess?.();
          return true;
        }
        toast.error(options.error ?? "Action failed. Please try again.");
        return false;
      } catch (error) {
        toast.error(formatApiError(error));
        return false;
      }
    },
    [toast]
  );

  return { perform, toast };
}
