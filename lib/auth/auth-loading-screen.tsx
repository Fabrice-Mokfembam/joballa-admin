import Image from "next/image";

export function AuthLoadingScreen() {
  return (
    <div
      aria-label="Verifying authentication"
      className="grid min-h-screen place-items-center bg-[var(--joballa-page)]"
      role="status"
    >
      <div className="grid place-items-center gap-3">
        <div className="relative grid h-16 w-16 place-items-center">
          <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-[var(--joballa-border)] border-t-[var(--joballa-primary)]" />
          <Image
            alt="Joballa"
            className="h-8 w-8 rounded-[7px] object-contain"
            height={32}
            priority
            src="/brand/joballa-panel-mark.png"
            width={32}
          />
        </div>
        <span className="font-remixa text-xl font-bold tracking-tight text-[var(--joballa-fg)]">joballa</span>
      </div>
    </div>
  );
}
