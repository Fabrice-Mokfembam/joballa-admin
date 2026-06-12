"use client";

import { useEffect, useRef } from "react";

export function useClickAway<T extends HTMLElement>(onAway: () => void) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onAway();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [onAway]);

  return ref;
}
