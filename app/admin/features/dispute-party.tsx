import { formatRoleLabel } from "@/lib/api/format";
import type { DisputeParty } from "@/lib/api/types";

function getPartyName(party: DisputeParty | undefined, fallback: string): string {
  if (!party) return fallback.split(" (")[0]?.trim() || fallback;
  return party.fullName?.trim() || party.email?.trim() || fallback.split(" (")[0]?.trim() || "Unknown";
}

export function DisputePartyCell({
  party,
  fallback,
}: {
  party?: DisputeParty;
  fallback: string;
}) {
  const name = getPartyName(party, fallback);
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
