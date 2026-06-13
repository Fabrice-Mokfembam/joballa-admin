"use client";

import type { DisputeParty } from "@/lib/api/types";
import { useTranslation } from "@/lib/i18n";
import { useTranslatedFormat } from "@/lib/i18n/use-translated-format";

function getPartyName(party: DisputeParty | undefined, fallback: string, unknownLabel: string): string {
  if (!party) return fallback.split(" (")[0]?.trim() || fallback;
  return party.fullName?.trim() || party.email?.trim() || fallback.split(" (")[0]?.trim() || unknownLabel;
}

export function DisputePartyCell({
  party,
  fallback,
}: {
  party?: DisputeParty;
  fallback: string;
}) {
  const { t } = useTranslation();
  const { formatRoleLabel } = useTranslatedFormat();
  const name = getPartyName(party, fallback, t("disputes.unknownParty"));
  const role = party?.role?.trim();

  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-semibold">{name}</span>
      {role ? (
        <span className="w-fit rounded-full bg-[var(--joballa-page-tint)] px-2.5 py-0.5 text-xs font-semibold text-[var(--joballa-muted)]">
          {formatRoleLabel(role)}
        </span>
      ) : null}
    </div>
  );
}
