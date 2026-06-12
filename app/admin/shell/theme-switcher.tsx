"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { getSavedTheme } from "./utils";

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<"light" | "dark">(() => getSavedTheme());

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.setAttribute("data-joballa-theme", "dark");
      return;
    }
    document.documentElement.removeAttribute("data-joballa-theme");
  }, [theme]);

  function applyTheme(nextTheme: "light" | "dark") {
    setTheme(nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.setAttribute("data-joballa-theme", "dark");
      window.localStorage.setItem("joballa-theme", "dark");
      return;
    }
    document.documentElement.removeAttribute("data-joballa-theme");
    window.localStorage.setItem("joballa-theme", "light");
  }

  return (
    <section className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-lg font-bold">Theme</h3>
          <p className="mt-1 text-sm text-[var(--joballa-muted)]">
            Switch the admin panel between Joballa light and dark colors.
          </p>
        </div>
        <div className="inline-flex w-fit rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-page-tint)] p-1">
          <button
            className={[
              "inline-flex items-center gap-2 rounded-[7px] px-3 py-2 text-sm font-semibold",
              theme === "light" ? "bg-[var(--joballa-card)] text-[var(--joballa-primary)] shadow-sm" : "text-[var(--joballa-muted)]",
            ].join(" ")}
            onClick={() => applyTheme("light")}
          >
            <Sun size={16} />
            Light
          </button>
          <button
            className={[
              "inline-flex items-center gap-2 rounded-[7px] px-3 py-2 text-sm font-semibold",
              theme === "dark" ? "bg-[var(--joballa-card)] text-[var(--joballa-primary)] shadow-sm" : "text-[var(--joballa-muted)]",
            ].join(" ")}
            onClick={() => applyTheme("dark")}
          >
            <Moon size={16} />
            Dark
          </button>
        </div>
      </div>
    </section>
  );
}
