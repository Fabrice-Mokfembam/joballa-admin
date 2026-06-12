"use client";

import { AuthProvider } from "@/lib/auth/auth-context";
import { RouteGuard } from "@/lib/auth/route-guard";
import { DashboardRangeProvider } from "@/lib/dashboard-range-context";
import { LocaleProvider } from "@/lib/i18n";
import { ToastProvider } from "@/lib/toast/toast";
import { AdminShell } from "./shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LocaleProvider>
        <ToastProvider>
          <RouteGuard>
            <DashboardRangeProvider>
              <AdminShell>{children}</AdminShell>
            </DashboardRangeProvider>
          </RouteGuard>
        </ToastProvider>
      </LocaleProvider>
    </AuthProvider>
  );
}
