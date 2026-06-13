import Image from "next/image";
import { getInitials } from "@/lib/api/format";

const SIZE_CLASSES = {
  sm: { box: "h-10 w-10 text-sm", px: 40 },
  md: { box: "h-16 w-16 text-base", px: 64 },
  lg: { box: "h-24 w-24 text-2xl", px: 96 },
} as const;

export function UserAvatar({
  name,
  photoUrl,
  size = "sm",
  className = "",
}: {
  name: string;
  photoUrl?: string | null;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  const { box, px } = SIZE_CLASSES[size];
  const label = name.trim() || "?";

  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt={label}
        width={px}
        height={px}
        className={`${box} shrink-0 rounded-full object-cover ${className}`}
        unoptimized
      />
    );
  }

  return (
    <span
      className={`grid ${box} shrink-0 place-items-center rounded-full bg-[var(--joballa-avatar-bg)] font-bold text-[var(--joballa-avatar-fg)] ${className}`}
    >
      {getInitials(label)}
    </span>
  );
}
