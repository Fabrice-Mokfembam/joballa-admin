"use client";

import { BadgeCheck, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useTranslatedFormat } from "@/lib/i18n/use-translated-format";
import { MoreMenu, UserAvatar } from "../ui";
import { ProfileDetailPanelSkeleton } from "../ui/skeletons";

type DetailMenuItem = { label: string; tone?: "danger"; onClick: () => void | Promise<boolean | null> };

export type UserDetailFields = {
  id: string;
  name: string;
  email: string;
  role: "worker" | "employer";
  status: string;
  phone?: string | null;
  photoUrl?: string | null;
  headline?: string | null;
  location?: string | null;
  isVerified?: boolean;
  badges?: Array<{ label: string; className?: string }>;
  sections: Array<{ title: string; content: string }>;
  bio?: string | null;
};

function ProfileSectionRow({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--joballa-border)] py-8 last:border-b-0 sm:flex-row sm:items-start sm:gap-16">
      <div className="w-full shrink-0 text-sm font-bold text-[var(--joballa-fg)] sm:w-[160px]">{label}</div>
      <div className="min-w-0 flex-1 text-sm leading-6 text-[var(--joballa-muted)]">{children}</div>
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
  const { formatRoleLabel } = useTranslatedFormat();

  if (loading) {
    return (
      <div
        className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-0 min-[600px]:px-6 min-[600px]:py-8 xl:static xl:z-auto xl:block xl:bg-transparent xl:p-0"
        onClick={onClose}
      >
        <div onClick={(event) => event.stopPropagation()}>
          <ProfileDetailPanelSkeleton />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const resolvedCloseLabel = closeLabel ?? t("common.close");
  const resolvedMenuLabel = menuLabel ?? t("users.actionsFor", { name: user.name });

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-0 min-[600px]:px-6 min-[600px]:py-8 xl:static xl:z-auto xl:block xl:bg-transparent xl:p-0"
      onClick={onClose}
    >
      <aside
        className="h-full w-full overflow-y-auto rounded-none border border-[var(--joballa-border)] bg-[var(--joballa-page-tint)] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.28)] min-[600px]:h-[min(88vh,900px)] min-[600px]:max-w-[760px] min-[600px]:rounded-[20px] xl:sticky xl:top-5 xl:h-fit xl:max-h-[calc(100dvh-6.5rem)] xl:max-w-none xl:shadow-none"
        onClick={(event) => event.stopPropagation()}
      >
        <section className="rounded-[16px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5">
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

          <div className="flex flex-col gap-5 border-b border-[var(--joballa-border)] pb-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-6">
              <UserAvatar name={user.name} photoUrl={user.photoUrl} size="lg" />
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-2xl font-bold leading-8 text-[var(--joballa-fg)]">
                  {user.name}
                  {user.isVerified ? <BadgeCheck size={22} className="text-[var(--joballa-primary)]" /> : null}
                </h2>
                <p className="mt-1 text-xs leading-4 text-[var(--joballa-muted)]">
                  {user.headline || formatRoleLabel(user.role)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[var(--joballa-page-tint)] px-3 py-1 text-xs font-bold">
                    {formatRoleLabel(user.role)}
                  </span>
                  {(user.badges ?? []).map((badge) => (
                    <span
                      key={badge.label}
                      className={[
                        "rounded-full px-3 py-1 text-xs font-bold",
                        badge.className ?? "bg-[var(--joballa-jade-3)] text-[var(--joballa-primary)]",
                      ].join(" ")}
                    >
                      {badge.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <dl className="w-full shrink-0 space-y-0.5 text-sm leading-5 text-[var(--joballa-muted)] sm:w-[180px] sm:text-right">
              {user.location ? <dd>{user.location}</dd> : null}
              {user.phone ? <dd>{user.phone}</dd> : null}
              <dd>{user.email}</dd>
            </dl>
          </div>

          {user.sections.map((section) => (
            <ProfileSectionRow key={section.title} label={section.title}>
              {section.content}
            </ProfileSectionRow>
          ))}

          {user.bio ? (
            <ProfileSectionRow label={t("profiles.bio")}>{user.bio}</ProfileSectionRow>
          ) : null}
        </section>
      </aside>
    </div>
  );
}
