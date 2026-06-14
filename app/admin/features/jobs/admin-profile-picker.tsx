"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { AdminProfile } from "@/lib/api/types";
import { useTranslation } from "@/lib/i18n";
import { useTranslatedFormat } from "@/lib/i18n/use-translated-format";
import { UserAvatar } from "../../ui";

export function AdminProfilePicker({
  profiles,
  value,
  onChange,
  disabled,
}: {
  profiles: AdminProfile[];
  value: AdminProfile | null;
  onChange: (profile: AdminProfile | null) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const { formatRoleLabel } = useTranslatedFormat();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return profiles;
    return profiles.filter((profile) => {
      const haystack = [profile.name, profile.email, profile.companyName, profile.position]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [profiles, query]);

  return (
    <div className="relative">
        <span className="grid gap-2 text-sm font-semibold">
        {t("postJob.profileLabel")}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          className={[
            "flex min-h-11 w-full items-center gap-3 rounded-[8px] border bg-[var(--joballa-input-bg)] px-3 py-2.5 text-left",
            value ? "border-[var(--joballa-primary)]" : "border-[var(--joballa-border)]",
            disabled ? "cursor-not-allowed opacity-60" : "",
          ].join(" ")}
        >
          {value ? (
            <>
              <UserAvatar name={value.name} photoUrl={value.photoUrl} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-[var(--joballa-fg)]">{value.name}</span>
                <span className="block truncate text-xs text-[var(--joballa-muted)]">
                  {formatRoleLabel(value.role)} · {value.email}
                </span>
              </span>
            </>
          ) : (
            <span className="text-[var(--joballa-muted)]">{t("postJob.profilePlaceholder")}</span>
          )}
        </button>
      </span>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[70] cursor-default bg-transparent"
            aria-label={t("common.close")}
            onClick={() => setOpen(false)}
          />
          <div className="absolute z-[71] mt-2 w-full overflow-hidden rounded-[12px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] shadow-[0_24px_70px_rgba(0,0,0,0.18)]">
            <div className="border-b border-[var(--joballa-border)] p-3">
              <label className="flex items-center gap-2 rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 py-2">
                <Search size={16} className="shrink-0 text-[var(--joballa-muted)]" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("postJob.profileSearchPlaceholder")}
                  className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none"
                />
              </label>
            </div>
            <ul className="max-h-64 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-[var(--joballa-muted)]">
                  {t("postJob.noProfilesFound")}
                </li>
              ) : (
                filtered.map((profile) => (
                  <li key={profile.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--joballa-page-tint)]"
                      onClick={() => {
                        onChange(profile);
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      <UserAvatar name={profile.name} photoUrl={profile.photoUrl} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-[var(--joballa-fg)]">{profile.name}</span>
                        <span className="block truncate text-xs text-[var(--joballa-muted)]">
                          {formatRoleLabel(profile.role)} · {profile.email}
                        </span>
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}
