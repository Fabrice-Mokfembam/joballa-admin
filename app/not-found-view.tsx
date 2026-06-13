"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { useJoballaTheme } from "./admin/shell/use-joballa-theme";
import { useTranslation } from "@/lib/i18n";

export function NotFoundView() {
  useJoballaTheme();
  const { t } = useTranslation();

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[var(--joballa-page)] px-5 py-12 text-[var(--joballa-fg)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(13,115,119,0.14),transparent_55%)]"
      />

      <section className="relative w-full max-w-lg rounded-[16px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-8 text-center shadow-[0_24px_70px_rgba(0,0,0,0.08)] sm:p-10">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-[14px] bg-[var(--joballa-jade-3)]">
          <Image
            src="/brand/joballa-panel-mark.png"
            alt="Joballa"
            width={40}
            height={40}
            className="rounded-[8px]"
          />
        </div>

        <p className="mt-8 font-mono text-5xl font-black tracking-tight text-[var(--joballa-primary)] sm:text-6xl">
          404
        </p>
        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">{t("notFound.title")}</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[var(--joballa-muted)]">
          {t("notFound.description")}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/admin"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--joballa-primary)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
          >
            <LayoutDashboard size={18} />
            {t("notFound.goToDashboard")}
          </Link>
          <Link
            href="/admin/login"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--joballa-border)] bg-[var(--joballa-card)] px-5 py-3 text-sm font-bold transition hover:bg-[var(--joballa-page-tint)]"
          >
            <ArrowLeft size={18} />
            {t("login.signIn")}
          </Link>
        </div>
      </section>
    </main>
  );
}
