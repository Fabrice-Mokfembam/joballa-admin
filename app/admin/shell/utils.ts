export function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getSavedTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem("joballa-theme");
  if (saved === "dark" || saved === "light") return saved;
  return getSystemTheme();
}

export function applyJoballaTheme(theme: "light" | "dark") {
  if (typeof document === "undefined") return;
  if (theme === "dark") {
    document.documentElement.setAttribute("data-joballa-theme", "dark");
    return;
  }
  document.documentElement.removeAttribute("data-joballa-theme");
}

export function getPageTitle(pathname: string) {
  if (pathname === "/admin") return "Dashboard";
  if (pathname.startsWith("/admin/kyc")) return "KYC Verification";
  if (pathname.startsWith("/admin/documents")) return "Documents";
  if (pathname.startsWith("/admin/jobs")) return "Pending Jobs";
  if (pathname.startsWith("/admin/rejected-jobs")) return "Rejected Jobs";
  if (pathname.startsWith("/admin/departments")) return "Departments";
  if (pathname.startsWith("/admin/admins")) return "Admins";
  if (pathname.startsWith("/admin/permissions")) return "Permissions";
  if (pathname.startsWith("/admin/users")) return "Users";
  if (pathname.startsWith("/admin/profiles")) return "Profiles";
  if (pathname.startsWith("/admin/financial-records")) return "Financial Records";
  if (pathname.startsWith("/admin/disputes") || pathname.startsWith("/admin/reports")) return "Reports";
  if (pathname.startsWith("/admin/platform-logs")) return "Logs";
  if (pathname.startsWith("/admin/verified-jobs")) return "Verified jobs";
  return "joballa Admin";
}
