const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PostJobDraft = {
  title: string;
  department: string;
  jobType: string;
  workMode: string;
  location: string;
  region: string;
  pay: string;
  payPer: string;
  openings: string;
  startDate: string;
  duration: string;
  schedule: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  requiredLevel: string;
  requiredSkillsText: string;
  startNow: boolean;
};

export const EMPTY_POST_JOB_DRAFT: PostJobDraft = {
  title: "",
  department: "",
  jobType: "full_time",
  workMode: "onsite",
  location: "",
  region: "",
  pay: "",
  payPer: "monthly",
  openings: "1",
  startDate: "",
  duration: "",
  schedule: "",
  description: "",
  requirements: [""],
  responsibilities: [""],
  requiredLevel: "mid",
  requiredSkillsText: "",
  startNow: false,
};

export type AdminCreateJobBody = {
  ownerUserId: string;
  title: string;
  departmentId: string;
  workMode: string;
  country: string;
  region?: string;
  city: string;
  description: string;
  requiredSkills: string[];
  experienceLevel: string;
  employmentType: string;
  duration?: string;
  payAmount: number;
  payCurrency: string;
  payStructure: string;
  numberOfOpenings: number;
  startNow: boolean;
  startDate?: string;
  requirements: string[];
  responsibilities: string[];
  paymentManagedByJoballa: boolean;
  asDraft: false;
};

function isDepartmentUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

function toApiStartDate(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
}

function parsePay(raw: string): number {
  const digits = raw.replace(/[^\d]/g, "");
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function parseRequiredSkillsText(raw: string): string[] {
  return raw
    .split(/[,;|]/)
    .map((skill) => skill.trim())
    .filter(Boolean);
}

function normalizeEmploymentType(raw: string): string {
  const value = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["full_time", "part_time", "contract", "casual", "seasonal", "internship"].includes(value)) return value;
  return "full_time";
}

function normalizeWorkMode(raw: string): string {
  const value = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (value === "on_site") return "onsite";
  if (["onsite", "remote", "hybrid"].includes(value)) return value;
  return "onsite";
}

function normalizePayStructure(raw: string): string {
  const value = raw.trim().toLowerCase();
  if (value.startsWith("hour")) return "hourly";
  if (value.startsWith("day")) return "daily";
  if (value.startsWith("week")) return "weekly";
  if (value.startsWith("month")) return "monthly";
  if (value === "fixed") return "fixed";
  return "monthly";
}

function normalizeExperienceLevel(raw: string): string {
  const value = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (["entry", "junior", "mid", "senior", "lead", "tutor", "not_required"].includes(value)) return value;
  return "mid";
}

export function validatePostJobDraft(draft: PostJobDraft): string | null {
  if (!draft.title.trim()) return "TITLE_REQUIRED";
  if (!draft.department.trim() || !isDepartmentUuid(draft.department)) return "INVALID_DEPARTMENT";
  if (!draft.location.trim()) return "LOCATION_REQUIRED";
  if (!draft.pay.trim() || parsePay(draft.pay) <= 0) return "PAY_REQUIRED";
  if (!draft.description.trim()) return "DESCRIPTION_REQUIRED";
  if (!draft.startNow && draft.startDate.trim() && !toApiStartDate(draft.startDate)) return "INVALID_START_DATE";
  if (!draft.startNow && !draft.startDate.trim()) return "START_DATE_REQUIRED";
  return null;
}

export function mapDraftToAdminCreateJobBody(
  draft: PostJobDraft,
  ownerUserId: string,
): AdminCreateJobBody {
  if (!isDepartmentUuid(draft.department)) {
    throw new Error("INVALID_DEPARTMENT");
  }

  const body: AdminCreateJobBody = {
    ownerUserId,
    title: draft.title.trim(),
    departmentId: draft.department.trim(),
    workMode: normalizeWorkMode(draft.workMode),
    country: "Cameroon",
    region: draft.region.trim() || undefined,
    city: draft.location.trim(),
    description: draft.description.trim(),
    requiredSkills: parseRequiredSkillsText(draft.requiredSkillsText),
    experienceLevel: normalizeExperienceLevel(draft.requiredLevel),
    employmentType: normalizeEmploymentType(draft.jobType),
    duration: draft.duration.trim() || undefined,
    payAmount: parsePay(draft.pay) || 1,
    payCurrency: "XAF",
    payStructure: normalizePayStructure(draft.payPer),
    numberOfOpenings: Math.max(1, Number(draft.openings) || 1),
    startNow: draft.startNow,
    requirements: draft.requirements.filter(Boolean),
    responsibilities: draft.responsibilities.filter(Boolean),
    paymentManagedByJoballa: true,
    asDraft: false,
  };

  if (!draft.startNow) {
    const startDate = toApiStartDate(draft.startDate);
    if (startDate) body.startDate = startDate;
  }

  return body;
}

export function formatPayPreview(pay: string, payPer: string): string {
  const amount = parsePay(pay);
  if (!amount) return "—";
  const per =
    payPer === "monthly"
      ? "mo"
      : payPer === "weekly"
        ? "wk"
        : payPer === "daily"
          ? "day"
          : payPer === "hourly"
            ? "hr"
            : "fixed";
  return `${amount.toLocaleString("en-US")} XAF/${per}`;
}
