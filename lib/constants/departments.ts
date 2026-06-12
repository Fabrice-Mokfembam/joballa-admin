import type { DepartmentListItem } from "@/lib/api/types";

/** UI-only sentinel — not persisted in the database. */
export const OTHER_DEPARTMENT_ID = "__other__";

export const OTHER_DEPARTMENT_NAME = "Other";

export function isOtherDepartmentName(name: string): boolean {
  return name.trim().toLowerCase() === OTHER_DEPARTMENT_NAME.toLowerCase();
}

export function isVirtualOtherDepartment(department: Pick<DepartmentListItem, "id">): boolean {
  return department.id === OTHER_DEPARTMENT_ID;
}

/** Exclude a mistaken DB row named "Other" — the real Other bucket is virtual only. */
export function isStoredDepartment(department: DepartmentListItem): boolean {
  return !isVirtualOtherDepartment(department) && !isOtherDepartmentName(department.name);
}

export function filterStoredDepartments(departments: DepartmentListItem[]): DepartmentListItem[] {
  return departments.filter(isStoredDepartment);
}

export function createVirtualOtherDepartment(
  jobs: number,
  description: string,
  name = OTHER_DEPARTMENT_NAME
): DepartmentListItem {
  return {
    id: OTHER_DEPARTMENT_ID,
    name,
    description,
    category: "other",
    jobs,
    applications: 0,
    hires: 0,
    status: "active",
  };
}
