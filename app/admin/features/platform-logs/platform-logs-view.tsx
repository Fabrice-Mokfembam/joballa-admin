"use client";

import { useAuth } from "@/lib/auth/auth-context";
import { useTranslation } from "@/lib/i18n";
import { AccessDeniedState } from "../../ui/states";
import { AuditLogsPanel } from "./audit-logs-panel";

export function PlatformLogsView() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  if (!hasPermission("audit_logs:read")) {
    return <AccessDeniedState description={t("logs.accessDenied")} />;
  }
  return <AuditLogsPanel />;
}
