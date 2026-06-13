"use client";

import { useState } from "react";
import Image from "next/image";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { INPUT_MAX_LENGTH } from "@/lib/constants/input-limits";
import { useTranslation } from "@/lib/i18n";
import { useJoballaTheme } from "../shell/use-joballa-theme";
import { ErrorState } from "../ui/states";

const inputWrapClass =
  "flex h-14 items-center gap-3 rounded-[12px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-4 shadow-sm focus-within:border-[var(--joballa-primary)] focus-within:ring-4 focus-within:ring-[var(--joballa-jade-3)]";

export function LoginForm() {
  useJoballaTheme();
  const { t } = useTranslation();
  const { login, error } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    await login(identifier.trim(), password);
    setLoading(false);
  }

  const displayError =
    error === "Session expired. Please sign in again." ? t("login.sessionExpired") : error;

  return (
    <main className="grid min-h-screen bg-[var(--joballa-page)] text-[var(--joballa-fg)] lg:grid-cols-[1fr_492px]">
      <section className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-[576px]">
          <div className="mb-9 text-center">
            <div className="mb-5 flex items-center justify-center gap-3 lg:hidden">
              <Image src="/brand/auth-logo-mark.png" alt="Joballa mark" width={52} height={52} />
              <span className="font-remixa text-3xl font-bold">joballa</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t("login.title")}</h1>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            {displayError ? <ErrorState message={displayError} /> : null}
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--joballa-muted)]">{t("login.email")}</span>
              <span className={inputWrapClass}>
                <Mail size={19} className="text-[var(--joballa-primary)]" />
                <input type="email" required autoComplete="username" value={identifier} maxLength={INPUT_MAX_LENGTH.identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder={t("login.emailPlaceholder")} className="w-full bg-transparent text-base outline-none placeholder:text-[var(--joballa-muted)]" />
              </span>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--joballa-muted)]">{t("login.password")}</span>
              <span className={inputWrapClass}>
                <LockKeyhole size={19} className="text-[var(--joballa-primary)]" />
                <input type={showPassword ? "text" : "password"} required autoComplete="current-password" value={password} maxLength={INPUT_MAX_LENGTH.password} onChange={(event) => setPassword(event.target.value)} placeholder={t("login.passwordPlaceholder")} className="w-full bg-transparent text-base outline-none placeholder:text-[var(--joballa-muted)]" />
                <button type="button" aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")} className="text-[var(--joballa-muted)]" onClick={() => setShowPassword((value) => !value)}>
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </span>
            </label>
            <button type="submit" disabled={loading} className="h-14 w-full rounded-[12px] bg-[var(--joballa-primary)] text-base font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
              {loading ? t("login.signingIn") : t("login.signIn")}
            </button>
          </form>
        </div>
      </section>
      <aside className="hidden bg-[var(--joballa-primary)] px-8 py-10 text-white lg:flex lg:flex-col">
        <div className="flex items-center gap-3">
          <Image src="/brand/auth-logo-mark.png" alt="Joballa mark" width={52} height={52} />
          <span className="font-remixa text-3xl font-bold">joballa</span>
        </div>
        <p className="mt-14 max-w-[340px] font-remixa text-5xl font-bold leading-[1.3] text-[var(--joballa-jade-5)]">{t("login.tagline")}</p>
        <div className="mt-auto text-sm font-semibold leading-7 text-white/90">
          <p>{t("login.supportTitle")}</p>
          <p>{t("login.supportEmail")}</p>
        </div>
      </aside>
    </main>
  );
}
