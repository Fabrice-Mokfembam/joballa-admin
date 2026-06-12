"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LayoutDashboard, MoreHorizontal, Table2 } from "lucide-react";
import { LoadingButton } from "./states";

const MENU_MIN_WIDTH = 144;
const VIEWPORT_GUTTER = 8;

export function ViewToggle({
  view,
  setView,
}: {
  view: "cards" | "table";
  setView: (view: "cards" | "table") => void;
}) {
  return (
    <div className="inline-flex w-fit rounded-full border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-1">
      <button
        type="button"
        aria-label="Card view"
        className={[
          "grid h-9 w-9 place-items-center rounded-full",
          view === "cards" ? "bg-[var(--joballa-jade-3)] text-[var(--joballa-primary)]" : "text-[var(--joballa-muted)]",
        ].join(" ")}
        onClick={() => setView("cards")}
      >
        <LayoutDashboard size={17} />
      </button>
      <button
        type="button"
        aria-label="Table view"
        className={[
          "grid h-9 w-9 place-items-center rounded-full",
          view === "table" ? "bg-[var(--joballa-jade-3)] text-[var(--joballa-primary)]" : "text-[var(--joballa-muted)]",
        ].join(" ")}
        onClick={() => setView("table")}
      >
        <Table2 size={17} />
      </button>
    </div>
  );
}

export type MoreMenuItem = {
  label: string;
  tone?: "danger";
  confirm?: boolean;
  confirmationDescription?: string;
  onClick?: () => void | Promise<void | boolean | null>;
};

type MenuPosition = {
  top: number;
  left: number;
};

function getMenuPosition(trigger: HTMLButtonElement, menu?: HTMLDivElement | null): MenuPosition {
  const rect = trigger.getBoundingClientRect();
  const gap = 4;
  const menuWidth = menu?.offsetWidth ?? MENU_MIN_WIDTH;
  const menuHeight = menu?.offsetHeight ?? 0;
  let left = rect.right - menuWidth;
  let top = rect.bottom + gap;

  left = Math.max(VIEWPORT_GUTTER, Math.min(left, window.innerWidth - menuWidth - VIEWPORT_GUTTER));

  if (menuHeight && top + menuHeight > window.innerHeight - VIEWPORT_GUTTER) {
    top = Math.max(VIEWPORT_GUTTER, rect.top - menuHeight - gap);
  }

  return { top, left };
}

export function MoreMenu({ label, items }: { label: string; items: MoreMenuItem[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [confirmingItem, setConfirmingItem] = useState<MoreMenuItem | null>(null);
  const [confirming, setConfirming] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => setIsOpen(false), []);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) {
      setMenuPosition(null);
      return;
    }

    function updatePosition() {
      if (!triggerRef.current) return;
      const next = getMenuPosition(triggerRef.current, menuRef.current);
      setMenuPosition((current) => current?.top === next.top && current.left === next.left ? current : next);
    }

    updatePosition();
    const frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, items.length]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      closeMenu();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, closeMenu]);

  async function handleConfirmAction() {
    if (!confirmingItem?.onClick || confirming) return;
    setConfirming(true);
    try {
      const result = await Promise.resolve(confirmingItem.onClick());
      if (result === false || result === null) return;
      setConfirmingItem(null);
    } finally {
      setConfirming(false);
    }
  }

  function closeConfirmationModal() {
    if (confirming) return;
    setConfirmingItem(null);
  }

  const menuPortal =
    isOpen && menuPosition && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={label}
            className="fixed z-50 min-w-36 max-w-[calc(100vw-16px)] rounded-[10px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-1 shadow-[0_16px_40px_rgba(0,0,0,0.16)]"
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={[
                  "block w-full rounded-[8px] px-3 py-2 text-left text-sm font-semibold",
                  item.tone === "danger"
                    ? "text-[var(--joballa-danger-fg)] hover:bg-[var(--joballa-danger-bg)]"
                    : "text-[var(--joballa-fg)] hover:bg-[var(--joballa-page-tint)]",
                ].join(" ")}
                onClick={(event) => {
                  event.stopPropagation();
                  closeMenu();
                  if (item.confirm || item.label.toLowerCase().includes("delete") || item.label.toLowerCase().includes("suspend")) {
                    setConfirmingItem(item);
                    return;
                  }
                  void item.onClick?.();
                }}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div className="inline-flex">
        <button
          ref={triggerRef}
          type="button"
          aria-label={label}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          className="grid h-9 w-9 place-items-center rounded-full text-[var(--joballa-fg)] hover:bg-[var(--joballa-page-tint)]"
          onClick={(event) => {
            event.stopPropagation();
            setIsOpen((value) => !value);
          }}
        >
          <MoreHorizontal size={20} />
        </button>
      </div>

      {menuPortal}

      {confirmingItem ? (
        <div
          aria-label="Close delete confirmation"
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/55 px-4 py-4"
          onClick={closeConfirmationModal}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="action-confirmation-title"
            className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5 text-left shadow-[0_24px_70px_rgba(0,0,0,0.28)]"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="action-confirmation-title" className="text-xl font-bold">
              Confirm {confirmingItem.label.toLowerCase()}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--joballa-muted)]">
              {confirmingItem.confirmationDescription ??
                `Are you sure you want to ${confirmingItem.label.toLowerCase()}?${
                  confirmingItem.label.toLowerCase().includes("delete") ? " This action cannot be undone." : ""
                }`}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-full border border-[var(--joballa-border)] px-5 py-2.5 text-sm font-bold"
                disabled={confirming}
                onClick={closeConfirmationModal}
              >
                Cancel
              </button>
              <LoadingButton
                variant="danger"
                loading={confirming}
                loadingLabel={`${confirmingItem.label}...`}
                onClick={() => void handleConfirmAction()}
              >
                {confirmingItem.label}
              </LoadingButton>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
