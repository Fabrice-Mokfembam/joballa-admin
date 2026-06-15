"use client";

import { BadgeCheck, Globe, Mail, MapPin, Phone, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { documentExtension } from "@/lib/profile-display";
import { MoreMenu, UserAvatar } from "../ui";
import { ProfileDetailPanelSkeleton } from "../ui/skeletons";
import {
  USER_DETAIL_PANEL_ASIDE_CLASS,
  USER_DETAIL_PANEL_SHELL_CLASS,
} from "./user-detail-panel-layout";

type DetailMenuItem = { label: string; tone?: "danger"; onClick: () => void | Promise<boolean | null> };

export type UserDetailListEntry = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  meta?: string;
  url?: string | null;
};

export type UserDetailDocumentEntry = {
  id: string;
  label: string;
  fileName: string;
  url?: string | null;
  fileType?: string;
};

export type UserDetailPaymentEntry = {
  id: string;
  provider: string;
  phoneNumber: string;
  isPrimary: boolean;
};

export type UserDetailFields = {
  id: string;
  name: string;
  email: string;
  role: "worker" | "employer";
  phone?: string | null;
  photoUrl?: string | null;
  headline?: string | null;
  location?: string | null;
  languages?: string | null;
  isVerified?: boolean;
  badges: Array<{ label: string; className?: string }>;
  summary?: string | null;
  industriesLine?: string | null;
  employmentTypesLine?: string | null;
  skillsLine?: string | null;
  workHistories: UserDetailListEntry[];
  educations: UserDetailListEntry[];
  certifications: UserDetailListEntry[];
  documents: UserDetailDocumentEntry[];
  paymentMethods: UserDetailPaymentEntry[];
  accountMeta: Array<{ title: string; content: string }>;
  companyName?: string | null;
};

function ProfileSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-2.5 border-b border-[var(--joballa-border)] py-5 last:border-b-0">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--joballa-muted)]">{label}</p>
      <div className="min-w-0 text-sm leading-6 text-[var(--joballa-fg)]">{children}</div>
    </section>
  );
}

function EmptySectionText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-6 text-[var(--joballa-muted)]">{children}</p>;
}

function ListEntries({ entries }: { entries: UserDetailListEntry[] }) {
  return (
    <div className="space-y-5">
      {entries.map((entry) => (
        <div key={entry.id}>
          {entry.title ? <p className="text-sm font-bold leading-6 text-[var(--joballa-fg)]">{entry.title}</p> : null}
          {entry.subtitle ? <p className="mt-1 text-sm leading-6 text-[var(--joballa-fg)]">{entry.subtitle}</p> : null}
          {entry.description ? (
            <p className="mt-1.5 text-sm leading-6 text-[var(--joballa-muted)]">{entry.description}</p>
          ) : null}
          {entry.meta ? <p className="mt-1.5 text-sm leading-6 text-[var(--joballa-muted)]">{entry.meta}</p> : null}
          {entry.url ? (
            <a
              href={entry.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-sm font-semibold text-[var(--joballa-primary)] hover:underline"
            >
              {entry.url}
            </a>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function UserDetailPanel({
  user,
  loading = false,
  onClose,
  menuItems = [],
  menuLabel,
  closeLabel,
}: {
  user: UserDetailFields | null;
  loading?: boolean;
  onClose: () => void;
  menuItems?: DetailMenuItem[];
  menuLabel?: string;
  closeLabel?: string;
}) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className={USER_DETAIL_PANEL_SHELL_CLASS} onClick={onClose}>
        <div className="w-full min-w-0" onClick={(event) => event.stopPropagation()}>
          <ProfileDetailPanelSkeleton />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const resolvedCloseLabel = closeLabel ?? t("common.close");
  const resolvedMenuLabel = menuLabel ?? t("users.actionsFor", { name: user.name });
  const summaryMeta = [user.industriesLine, user.employmentTypesLine].filter(Boolean).join(" · ");

  return (
    <div className={USER_DETAIL_PANEL_SHELL_CLASS} onClick={onClose}>
      <aside
        className={USER_DETAIL_PANEL_ASIDE_CLASS}
        onClick={(event) => event.stopPropagation()}
      >
        <section className="rounded-[14px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] px-5 py-6 shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
          <div className="mb-5 flex justify-end gap-2">
            {menuItems.length > 0 ? <MoreMenu label={resolvedMenuLabel} items={menuItems} /> : null}
            <button
              type="button"
              aria-label={resolvedCloseLabel}
              className="grid h-10 w-10 place-items-center rounded-full border border-[var(--joballa-border)] text-[var(--joballa-muted)] hover:text-[var(--joballa-fg)]"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-col gap-4 border-b border-[var(--joballa-border)] pb-5">
            <div className="flex min-w-0 items-start gap-4">
              <UserAvatar name={user.name} photoUrl={user.photoUrl} size="lg" />
              <div className="min-w-0 flex-1">
                <h2 className="flex items-center gap-2 text-xl font-bold leading-7 tracking-tight text-[var(--joballa-fg)]">
                  {user.name}
                  {user.isVerified ? <BadgeCheck size={20} className="text-[var(--joballa-primary)]" /> : null}
                </h2>
                {user.headline ? (
                  <p className="mt-1 text-xs font-medium leading-5 text-[var(--joballa-muted)]">{user.headline}</p>
                ) : null}
                {!user.headline && user.companyName ? (
                  <p className="mt-1 text-xs font-medium leading-5 text-[var(--joballa-muted)]">{user.companyName}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {user.badges.map((badge) => (
                    <span
                      key={badge.label}
                      className={[
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold leading-4",
                        badge.className ?? "bg-[var(--joballa-jade-3)] text-[var(--joballa-primary)]",
                      ].join(" ")}
                    >
                      {badge.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs leading-5 text-[var(--joballa-muted)]">
              {user.location ? (
                <p className="flex items-center gap-2">
                  <MapPin size={14} className="shrink-0" />
                  {user.location}
                </p>
              ) : null}
              {user.phone ? (
                <p className="flex items-center gap-2">
                  <Phone size={14} className="shrink-0" />
                  {user.phone}
                </p>
              ) : null}
              <p className="flex min-w-0 items-center gap-2">
                <Mail size={14} className="shrink-0" />
                <span className="truncate">{user.email}</span>
              </p>
              {user.languages ? (
                <p className="flex items-center gap-2">
                  <Globe size={14} className="shrink-0" />
                  {user.languages}
                </p>
              ) : null}
            </div>
          </div>

          <ProfileSection label={t("userDetail.summary")}>
            {user.summary?.trim() ? (
              <p className="text-[var(--joballa-muted)]">{user.summary}</p>
            ) : (
              <EmptySectionText>{t("userDetail.emptySummary")}</EmptySectionText>
            )}
            {summaryMeta ? <p className="mt-1.5 text-[var(--joballa-muted)]">{summaryMeta}</p> : null}
          </ProfileSection>

          {user.role === "worker" ? (
            <>
              <ProfileSection label={t("userDetail.skills")}>
                {user.skillsLine ? (
                  <p className="text-sm font-bold leading-6 text-[var(--joballa-fg)]">{user.skillsLine}</p>
                ) : (
                  <EmptySectionText>{t("userDetail.emptySkills")}</EmptySectionText>
                )}
              </ProfileSection>

              <ProfileSection label={t("userDetail.workHistory")}>
                {user.workHistories.length > 0 ? (
                  <ListEntries entries={user.workHistories} />
                ) : (
                  <EmptySectionText>{t("userDetail.emptyWork")}</EmptySectionText>
                )}
              </ProfileSection>

              <ProfileSection label={t("userDetail.education")}>
                {user.educations.length > 0 ? (
                  <ListEntries entries={user.educations} />
                ) : (
                  <EmptySectionText>{t("userDetail.emptyEducation")}</EmptySectionText>
                )}
              </ProfileSection>

              <ProfileSection label={t("userDetail.certifications")}>
                {user.certifications.length > 0 ? (
                  <ListEntries entries={user.certifications} />
                ) : (
                  <EmptySectionText>{t("userDetail.emptyCertifications")}</EmptySectionText>
                )}
              </ProfileSection>

              <ProfileSection label={t("userDetail.documents")}>
                {user.documents.length > 0 ? (
                  <div className="space-y-3">
                    {user.documents.map((doc) => (
                      <div key={doc.id} className="flex min-w-0 items-center gap-3">
                        <div className="flex w-10 shrink-0 flex-col overflow-hidden rounded-[8px] bg-[#e5e5e5]">
                          <span className="flex h-8 items-center justify-center text-[10px] font-bold text-[var(--joballa-muted)]">
                            {documentExtension(doc.fileName, doc.fileType)}
                          </span>
                          <span className="flex h-4 items-center justify-center bg-[#d42ba3] text-[8px] font-bold uppercase tracking-wide text-white">
                            {documentExtension(doc.fileName, doc.fileType).slice(0, 3)}
                          </span>
                        </div>
                        {doc.url ? (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noreferrer"
                            className="min-w-0 truncate text-sm font-bold text-[var(--joballa-fg)] hover:underline"
                          >
                            {doc.label}
                          </a>
                        ) : (
                          <span className="min-w-0 truncate text-sm font-bold text-[var(--joballa-fg)]">{doc.label}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptySectionText>{t("userDetail.emptyDocuments")}</EmptySectionText>
                )}
              </ProfileSection>

              {user.paymentMethods.length > 0 ? (
                <ProfileSection label={t("userDetail.paymentDetails")}>
                  <div className="space-y-3">
                    {user.paymentMethods.map((method) => (
                      <div key={method.id} className="text-sm leading-6 text-[var(--joballa-fg)]">
                        <p className="font-bold">
                          {method.provider}
                          {method.isPrimary ? (
                            <span className="ml-2 text-xs font-semibold text-[var(--joballa-primary)]">
                              {t("userDetail.primary")}
                            </span>
                          ) : null}
                        </p>
                        <p className="text-[var(--joballa-muted)]">{method.phoneNumber}</p>
                      </div>
                    ))}
                  </div>
                </ProfileSection>
              ) : null}
            </>
          ) : null}

          <ProfileSection label={t("userDetail.accountDetails")}>
            <div className="space-y-4">
              {user.accountMeta.map((row) => (
                <div key={row.title}>
                  <p className="text-sm font-bold leading-6 text-[var(--joballa-fg)]">{row.title}</p>
                  <p className="mt-0.5 break-words text-sm leading-6 text-[var(--joballa-muted)]">{row.content}</p>
                </div>
              ))}
            </div>
          </ProfileSection>
        </section>
      </aside>
    </div>
  );
}
