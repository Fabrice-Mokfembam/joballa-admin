"use client";

import { USER_DETAIL_PANEL_ASIDE_CLASS } from "../features/user-detail-panel-layout";
import { SkeletonBar } from "./states";

export function StatGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 xl:grid-cols-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <section
          key={index}
          className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-4 sm:p-5"
        >
          <SkeletonBar className="h-4 w-28" />
          <SkeletonBar className="mt-3 h-8 w-20" />
          <SkeletonBar className="mt-2 h-4 w-24" />
        </section>
      ))}
    </div>
  );
}

export function KycCardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <article
          key={index}
          className="overflow-hidden rounded-[12px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] shadow-[0_1px_6px_rgba(15,23,42,0.08)]"
        >
          <div className="p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <SkeletonBar className="h-6 w-24 rounded-full" />
              <SkeletonBar className="h-7 w-20 rounded-full" />
            </div>
            <div className="flex items-center gap-3">
              <SkeletonBar className="h-10 w-10 rounded-full" />
              <div>
                <SkeletonBar className="h-4 w-32" />
                <SkeletonBar className="mt-2 h-3 w-40" />
              </div>
            </div>
            <div className="mt-3 grid gap-2">
              <SkeletonBar className="h-3 w-44" />
              <SkeletonBar className="h-3 w-32" />
            </div>
            <div className="mt-4 border-t border-[var(--joballa-border)] pt-3">
              <SkeletonBar className="h-3 w-28" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <SkeletonBar className="aspect-[4/3] w-full rounded-[6px]" />
              <SkeletonBar className="aspect-[4/3] w-full rounded-[6px]" />
              <SkeletonBar className="aspect-[4/3] w-full rounded-[6px]" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <SkeletonBar className="h-10 rounded-[8px]" />
              <SkeletonBar className="h-10 rounded-[8px]" />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function DocumentsTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <section className="overflow-x-auto rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)]">
      <div className="hidden border-b border-[var(--joballa-border)] bg-[var(--joballa-page-tint)] px-4 py-3 md:grid md:min-w-[760px] md:w-full md:grid-cols-[minmax(220px,1.35fr)_minmax(180px,1fr)_140px_120px_52px] md:items-center md:gap-4">
        {["Document", "User", "Submitted", "Status", "Actions"].map((label) => (
          <SkeletonBar key={label} className="h-3 w-16" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, index) => (
        <article
          key={index}
          className="grid gap-4 border-b border-[var(--joballa-border)] px-4 py-4 last:border-0 md:min-w-[760px] md:w-full md:grid-cols-[minmax(220px,1.35fr)_minmax(180px,1fr)_140px_120px_52px] md:items-center"
        >
          <div className="flex items-center gap-3">
            <SkeletonBar className="h-11 w-11 rounded-[6px]" />
            <div className="flex-1">
              <SkeletonBar className="h-4 w-40" />
              <SkeletonBar className="mt-2 h-4 w-28" />
            </div>
          </div>
          <div>
            <SkeletonBar className="h-4 w-36" />
            <SkeletonBar className="mt-2 h-3 w-24" />
          </div>
          <SkeletonBar className="h-4 w-16" />
          <SkeletonBar className="h-7 w-20 rounded-full" />
          <SkeletonBar className="h-9 w-9 rounded-full justify-self-end" />
        </article>
      ))}
    </section>
  );
}

export function DataTableSkeleton({
  columns,
  rows = 5,
}: {
  columns: string[];
  rows?: number;
}) {
  return (
    <div className="overflow-hidden rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)]">
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--joballa-border)] bg-[var(--joballa-page-tint)]">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-5 py-4">
                  <SkeletonBar className="h-3 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-b border-[var(--joballa-border)] last:border-0">
                {columns.map((column) => (
                  <td key={column} className="px-5 py-4">
                    <SkeletonBar className="h-4 w-24" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 p-3 md:hidden">
        {Array.from({ length: rows }).map((_, index) => (
          <article key={index} className="rounded-[8px] border border-[var(--joballa-border)] p-4">
            {columns.map((column) => (
              <div key={column} className="flex justify-between gap-4 py-2">
                <SkeletonBar className="h-3 w-16" />
                <SkeletonBar className="h-4 w-24" />
              </div>
            ))}
          </article>
        ))}
      </div>
    </div>
  );
}

export function JobCardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid w-full gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <article
          key={index}
          className="w-full min-w-0 rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5"
        >
          <div className="flex justify-between">
            <SkeletonBar className="h-4 w-16" />
            <SkeletonBar className="h-9 w-9 rounded-full" />
          </div>
          <SkeletonBar className="mt-10 h-8 w-48" />
          <SkeletonBar className="mt-2 h-5 w-40" />
          <div className="mt-4 flex gap-3">
            <SkeletonBar className="h-8 w-24 rounded-full" />
            <SkeletonBar className="h-8 w-28 rounded-full" />
          </div>
          <div className="mt-12 flex items-center gap-3">
            <SkeletonBar className="h-9 w-9 rounded-full" />
            <SkeletonBar className="h-4 w-32" />
          </div>
        </article>
      ))}
    </div>
  );
}

export function DepartmentCardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <section
          key={index}
          className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] px-5 py-7"
        >
          <div className="flex justify-between gap-4">
            <div className="flex-1">
              <SkeletonBar className="h-6 w-40" />
              <SkeletonBar className="mt-3 h-4 w-full" />
              <SkeletonBar className="mt-2 h-4 w-32" />
            </div>
            <SkeletonBar className="h-9 w-9 rounded-full" />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-[var(--joballa-border)] pt-4">
            {Array.from({ length: 3 }).map((__, statIndex) => (
              <div key={statIndex} className="grid justify-items-center gap-2">
                <SkeletonBar className="h-3 w-10" />
                <SkeletonBar className="h-6 w-12" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function DashboardPanelSkeleton({ className = "", children }: { className?: string; children?: React.ReactNode }) {
  return (
    <section className={`h-fit w-full self-start rounded-[16px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5 ${className}`}>
      {children}
    </section>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-1 gap-4 min-[440px]:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <DashboardPanelSkeleton key={index} className="min-h-32">
            <SkeletonBar className="h-3 w-24" />
            <div className="mt-10 flex items-end gap-3">
              <SkeletonBar className="h-8 w-20" />
              <SkeletonBar className="h-4 w-24" />
            </div>
          </DashboardPanelSkeleton>
        ))}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.54fr)]">
        <section className="grid content-start gap-5">
          <DashboardPanelSkeleton>
            <div className="flex items-start justify-between gap-4">
              <div><SkeletonBar className="h-6 w-48" /><SkeletonBar className="mt-3 h-4 w-40" /></div>
              <SkeletonBar className="h-12 w-32 rounded-[12px]" />
            </div>
            <div className="mt-8 grid gap-8">
              {Array.from({ length: 4 }).map((_, index) => <SkeletonBar key={index} className="h-px w-full" />)}
              <SkeletonBar className="h-20 w-full rounded-[12px]" />
            </div>
          </DashboardPanelSkeleton>

        <div className="grid items-start gap-5 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <DashboardPanelSkeleton key={index}>
              <SkeletonBar className="h-6 w-44" />
              <div className="mt-5 flex items-center justify-center gap-6">
                <SkeletonBar className="h-36 w-36 rounded-full" />
                <div className="grid gap-3"><SkeletonBar className="h-4 w-28" /><SkeletonBar className="h-4 w-32" /><SkeletonBar className="h-4 w-24" /></div>
              </div>
            </DashboardPanelSkeleton>
          ))}
        </div>

        <div className="grid items-start gap-5 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <DashboardPanelSkeleton key={index}>
              <SkeletonBar className="h-6 w-44" />
              <div className="mt-5 grid gap-5"><SkeletonBar className="h-12 w-full" /><SkeletonBar className="h-12 w-full" /></div>
            </DashboardPanelSkeleton>
          ))}
        </div>

          <DashboardPanelSkeleton>
            <SkeletonBar className="h-6 w-56" />
            <div className="mt-8 grid gap-5">
              <SkeletonBar className="h-5 w-full" />
              {Array.from({ length: 5 }).map((_, index) => <SkeletonBar key={index} className="h-10 w-full" />)}
            </div>
          </DashboardPanelSkeleton>
        </section>

        <aside className="grid content-start gap-5">
          <DashboardPanelSkeleton>
            <SkeletonBar className="h-6 w-36" />
            <div className="mt-8 flex items-center justify-center gap-6"><SkeletonBar className="h-36 w-36 rounded-full" /><SkeletonBar className="h-28 w-28" /></div>
          </DashboardPanelSkeleton>
          <DashboardPanelSkeleton>
            <SkeletonBar className="h-5 w-28" />
            <div className="mt-4 grid gap-3">{Array.from({ length: 5 }).map((_, index) => <SkeletonBar key={index} className="h-16 w-full rounded-[12px]" />)}</div>
          </DashboardPanelSkeleton>
          <DashboardPanelSkeleton>
            <SkeletonBar className="h-6 w-36" />
            <div className="mt-6 grid gap-6">{Array.from({ length: 5 }).map((_, index) => <SkeletonBar key={index} className="h-10 w-full" />)}</div>
          </DashboardPanelSkeleton>
        </aside>
      </div>
    </div>
  );
}

export function AdminCardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <article key={index} className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <SkeletonBar className="h-3 w-24" />
              <SkeletonBar className="mt-3 h-6 w-40" />
              <SkeletonBar className="mt-2 h-4 w-48" />
            </div>
            <SkeletonBar className="h-7 w-20 rounded-full" />
          </div>
          <div className="mt-6 flex items-end justify-between border-t border-[var(--joballa-border)] pt-4">
            <div>
              <SkeletonBar className="h-3 w-16" />
              <SkeletonBar className="mt-2 h-5 w-24" />
            </div>
            <SkeletonBar className="h-9 w-9 rounded-full" />
          </div>
        </article>
      ))}
    </div>
  );
}

export function JobDetailPanelSkeleton() {
  return (
    <aside className="rounded-[20px] border border-[var(--joballa-border)] bg-[var(--joballa-page-tint)] p-4">
      <section className="rounded-[16px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5">
        <div className="mb-4 flex justify-end">
          <SkeletonBar className="h-10 w-10 rounded-full" />
        </div>
        <SkeletonBar className="h-9 w-36" />
        <SkeletonBar className="mt-2 h-4 w-32" />
        <SkeletonBar className="mt-8 h-8 w-4/5" />
        <div className="mt-3 flex items-center gap-2">
          <SkeletonBar className="h-7 w-7 rounded-full" />
          <SkeletonBar className="h-4 w-40" />
        </div>
        <SkeletonBar className="mt-3 h-7 w-24 rounded-full" />
        <div className="mt-6 grid grid-cols-2 gap-3">
          <SkeletonBar className="h-12 rounded-full" />
          <SkeletonBar className="h-12 rounded-full" />
        </div>
        <div className="mt-6 space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex justify-between gap-6">
              <SkeletonBar className="h-4 w-24" />
              <SkeletonBar className="h-4 w-28" />
            </div>
          ))}
        </div>
      </section>
      <section className="mt-4 rounded-[16px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5">
        <SkeletonBar className="h-5 w-32" />
        <SkeletonBar className="mt-4 h-3 w-full" />
        <SkeletonBar className="mt-2 h-3 w-full" />
        <SkeletonBar className="mt-2 h-3 w-4/5" />
      </section>
    </aside>
  );
}

export function ProfileDetailPanelSkeleton() {
  return (
    <aside className={USER_DETAIL_PANEL_ASIDE_CLASS}>
      <section className="rounded-[14px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] px-5 py-6">
        <div className="mb-5 flex justify-end gap-2">
          <SkeletonBar className="h-10 w-10 rounded-full" />
          <SkeletonBar className="h-10 w-10 rounded-full" />
        </div>
        <div className="flex flex-col gap-4 border-b border-[var(--joballa-border)] pb-5">
          <div className="flex min-w-0 items-start gap-4">
            <SkeletonBar className="h-20 w-20 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <SkeletonBar className="h-6 w-40" />
              <SkeletonBar className="mt-2 h-3 w-28" />
              <div className="mt-2 flex gap-1.5">
                <SkeletonBar className="h-6 w-16 rounded-full" />
                <SkeletonBar className="h-6 w-28 rounded-full" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <SkeletonBar className="h-3 w-36" />
            <SkeletonBar className="h-3 w-28" />
            <SkeletonBar className="h-3 w-44" />
          </div>
        </div>
        {[
          "Summary",
          "Skills",
          "Work",
          "Education",
          "Certs",
          "Docs",
          "Account",
        ].map((section) => (
          <div key={section} className="grid gap-2.5 border-b border-[var(--joballa-border)] py-5 last:border-b-0">
            <SkeletonBar className="h-3 w-24" />
            <SkeletonBar className="h-4 w-full" />
            <SkeletonBar className="h-4 w-5/6" />
          </div>
        ))}
      </section>
    </aside>
  );
}

export function UserDetailPanelSkeleton() {
  return <ProfileDetailPanelSkeleton />;
}

export function ProfileCardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <article key={index} className="rounded-[18px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-4">
              <SkeletonBar className="h-16 w-16 shrink-0 rounded-full" />
              <div>
                <SkeletonBar className="h-5 w-36" />
                <SkeletonBar className="mt-2 h-3 w-44" />
                <SkeletonBar className="mt-2 h-3 w-32" />
              </div>
            </div>
            <SkeletonBar className="h-9 w-9 rounded-full" />
          </div>
          <div className="mt-5 flex gap-2">
            <SkeletonBar className="h-7 w-20 rounded-full" />
            <SkeletonBar className="h-7 w-20 rounded-full" />
          </div>
          <div className="mt-6 grid gap-3">
            <SkeletonBar className="h-4 w-48" />
            <SkeletonBar className="h-4 w-40" />
            <SkeletonBar className="h-4 w-44" />
          </div>
        </article>
      ))}
    </div>
  );
}

export function ReportCardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <article
          key={index}
          className="rounded-[12px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5"
        >
          <div className="flex justify-between">
            <SkeletonBar className="h-6 w-48" />
            <SkeletonBar className="h-9 w-9 rounded-full" />
          </div>
          <SkeletonBar className="mt-4 h-4 w-40" />
          <SkeletonBar className="mt-2 h-4 w-32" />
        </article>
      ))}
    </div>
  );
}

export function DocumentDetailSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5">
        <SkeletonBar className="h-4 w-24" />
        <SkeletonBar className="mt-2 h-8 w-56" />
        <SkeletonBar className="mt-1 h-4 w-40" />
        <SkeletonBar className="mt-6 h-[420px] w-full rounded-[8px]" />
      </section>
      <aside className="space-y-4">
        <section className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5">
          <SkeletonBar className="h-5 w-40" />
          <div className="mt-4 grid gap-3">
            <SkeletonBar className="h-10 w-full" />
            <SkeletonBar className="h-10 w-full" />
            <SkeletonBar className="h-10 w-full" />
          </div>
        </section>
        <section className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5">
          <SkeletonBar className="h-5 w-24" />
          <div className="mt-4 grid gap-3">
            <SkeletonBar className="h-12 w-full rounded-[8px]" />
            <SkeletonBar className="h-12 w-full rounded-[8px]" />
            <SkeletonBar className="h-12 w-full rounded-[8px]" />
          </div>
        </section>
      </aside>
    </div>
  );
}
