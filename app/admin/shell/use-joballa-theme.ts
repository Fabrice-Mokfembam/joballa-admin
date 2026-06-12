"use client";

import { useEffect } from "react";
import { applyJoballaTheme, getSystemTheme } from "./utils";

export function useJoballaTheme() {
  useEffect(() => {
    const saved = window.localStorage.getItem("joballa-theme");
    if (saved === "dark" || saved === "light") {
      applyJoballaTheme(saved);
      return;
    }

    applyJoballaTheme(getSystemTheme());
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (window.localStorage.getItem("joballa-theme")) return;
      applyJoballaTheme(media.matches ? "dark" : "light");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
}
