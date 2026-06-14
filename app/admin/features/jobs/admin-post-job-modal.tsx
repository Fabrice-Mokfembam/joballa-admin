"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { departmentsApi, jobsApi, profilesApi } from "@/lib/api/admin";
import type { AdminProfile } from "@/lib/api/types";
import {
  CAMEROON_REGION_IDS,
  DEFAULT_CAMEROON_REGION,
  getCitiesForRegion,
} from "@/lib/cameroon-region-cities";
import { emitAdminRefresh } from "@/lib/admin-refresh";
import { useAdminAction } from "@/lib/hooks/use-admin-action";
import { useAsyncData } from "@/lib/hooks/use-async";
import {
  EMPTY_POST_JOB_DRAFT,
  formatPayPreview,
  mapDraftToAdminCreateJobBody,
  validatePostJobDraft,
  type PostJobDraft,
} from "@/lib/post-job/draft";
import { useTranslation } from "@/lib/i18n";
import { useTranslatedFormat } from "@/lib/i18n/use-translated-format";
import { LoadingButton } from "../../ui/states";
import { AdminProfilePicker } from "./admin-profile-picker";

type Step = "basics" | "details" | "preview";

const STEPS: Step[] = ["basics", "details", "preview"];
const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "casual", "seasonal", "internship"] as const;
const PAY_STRUCTURES = ["hourly", "daily", "weekly", "monthly", "fixed"] as const;
const EXPERIENCE_LEVELS = ["entry", "junior", "mid", "senior", "lead", "tutor", "not_required"] as const;
const DURATION_UNITS = ["months", "weeks", "years"] as const;

function splitDuration(raw: string): { amount: string; unit: (typeof DURATION_UNITS)[number] } {
  const match = raw.trim().match(/^(\d+)\s*(\w+)/i);
  if (!match) return { amount: "", unit: "months" };
  const unitRaw = match[2]!.toLowerCase();
  const unit = unitRaw.startsWith("week") ? "weeks" : unitRaw.startsWith("year") ? "years" : "months";
  return { amount: match[1]!, unit };
}

function mergeDuration(amount: string, unit: string): string {
  const n = amount.trim();
  if (!n) return "";
  return `${n} ${unit}`;
}

function ListComposer({
  items,
  onChange,
  placeholder,
  addLabel,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  addLabel: string;
}) {
  return (
    <div className="grid gap-2">
      {items.map((item, index) => (
        <div key={index} className="flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 py-2 text-sm outline-none"
            value={item}
            placeholder={placeholder}
            onChange={(event) => {
              const next = [...items];
              next[index] = event.target.value;
              onChange(next);
            }}
          />
          {items.length > 1 ? (
            <button
              type="button"
              className="rounded-[8px] border border-[var(--joballa-border)] px-3 text-sm font-semibold"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              ×
            </button>
          ) : null}
        </div>
      ))}
      <button
        type="button"
        className="w-fit rounded-full border border-[var(--joballa-border)] px-4 py-2 text-sm font-semibold"
        onClick={() => onChange([...items, ""])}
      >
        {addLabel}
      </button>
    </div>
  );
}

export function AdminPostJobModal({
  open,
  onClose,
  initialProfileUserId,
}: {
  open: boolean;
  onClose: () => void;
  initialProfileUserId?: string | null;
}) {
  const { t } = useTranslation();
  const { formatRoleLabel } = useTranslatedFormat();
  const { perform } = useAdminAction();
  const [step, setStep] = useState<Step>("basics");
  const [draft, setDraft] = useState<PostJobDraft>(EMPTY_POST_JOB_DRAFT);
  const [selectedProfile, setSelectedProfile] = useState<AdminProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const profilesQuery = useAsyncData(
    () => profilesApi.list({ page: 1, limit: 100, isAdminCreated: "true" }),
    [],
    { cacheKey: "admin:profiles:post-job" },
  );
  const departmentsQuery = useAsyncData(
    () => departmentsApi.list({ page: 1, limit: 100 }),
    [],
    { cacheKey: "admin:departments:post-job" },
  );

  const profiles = profilesQuery.data?.items ?? [];
  const departments = departmentsQuery.data?.items ?? [];
  const durationParts = useMemo(() => splitDuration(draft.duration), [draft.duration]);
  const cityOptions = useMemo(
    () => getCitiesForRegion(draft.region || DEFAULT_CAMEROON_REGION).map((city) => ({ value: city, label: city })),
    [draft.region],
  );

  const reset = useCallback(() => {
    setStep("basics");
    setDraft(EMPTY_POST_JOB_DRAFT);
    setSelectedProfile(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    setStep("basics");
    setDraft(EMPTY_POST_JOB_DRAFT);
    setSelectedProfile(null);
  }, [open]);

  useEffect(() => {
    if (!open || !initialProfileUserId || profiles.length === 0) return;
    const match = profiles.find((profile) => profile.userId === initialProfileUserId);
    if (match) setSelectedProfile(match);
  }, [open, initialProfileUserId, profiles]);

  if (!open) return null;

  function update<K extends keyof PostJobDraft>(key: K, value: PostJobDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateDuration(amount: string, unit: string) {
    update("duration", mergeDuration(amount, unit));
  }

  function validateBasics(): boolean {
    if (!selectedProfile) {
      window.alert(t("postJob.errors.profileRequired"));
      return false;
    }
    if (!draft.title.trim()) {
      window.alert(t("postJob.errors.titleRequired"));
      return false;
    }
    if (!draft.department.trim()) {
      window.alert(t("postJob.errors.departmentRequired"));
      return false;
    }
    if (!draft.location.trim()) {
      window.alert(t("postJob.errors.locationRequired"));
      return false;
    }
    if (!draft.pay.trim()) {
      window.alert(t("postJob.errors.payRequired"));
      return false;
    }
    if (!draft.startNow && !draft.startDate.trim()) {
      window.alert(t("postJob.errors.startDateRequired"));
      return false;
    }
    return true;
  }

  async function submitJob() {
    if (!selectedProfile) return;
    const validation = validatePostJobDraft(draft);
    if (validation) {
      if (validation === "DESCRIPTION_REQUIRED") window.alert(t("postJob.errors.descriptionRequired"));
      else if (validation === "TITLE_REQUIRED") window.alert(t("postJob.errors.titleRequired"));
      else if (validation === "INVALID_DEPARTMENT") window.alert(t("postJob.errors.departmentRequired"));
      else if (validation === "LOCATION_REQUIRED") window.alert(t("postJob.errors.locationRequired"));
      else if (validation === "PAY_REQUIRED") window.alert(t("postJob.errors.payRequired"));
      else if (validation === "START_DATE_REQUIRED" || validation === "INVALID_START_DATE") {
        window.alert(t("postJob.errors.startDateRequired"));
      }
      return;
    }
    setSubmitting(true);
    try {
      const body = mapDraftToAdminCreateJobBody(draft, selectedProfile.userId);
      await perform(() => jobsApi.create(body), {
        success: t("postJob.createdSuccess"),
        onSuccess: () => {
          emitAdminRefresh("jobs");
          onClose();
          reset();
        },
      });
    } finally {
      setSubmitting(false);
    }
  }

  const payPreview = formatPayPreview(draft.pay, draft.payPer);
  const schedulePreview = [draft.jobType.replace(/_/g, " "), draft.schedule.trim()].filter(Boolean).join(" · ");

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/55 p-0 min-[600px]:px-4 min-[600px]:py-6"
      onClick={() => !submitting && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        className="flex h-full w-full max-h-none flex-col overflow-hidden rounded-none border border-[var(--joballa-border)] bg-[var(--joballa-page-tint)] shadow-[0_24px_70px_rgba(0,0,0,0.28)] min-[600px]:h-[min(92vh,920px)] min-[600px]:max-w-3xl min-[600px]:rounded-[20px]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--joballa-border)] bg-[var(--joballa-card)] px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-xl font-bold text-[var(--joballa-fg)]">{t("postJob.title")}</h2>
            <p className="mt-1 text-sm text-[var(--joballa-muted)]">{t("postJob.subtitle")}</p>
          </div>
          <button
            type="button"
            aria-label={t("common.close")}
            className="grid h-10 w-10 place-items-center rounded-full border border-[var(--joballa-border)] text-[var(--joballa-muted)]"
            onClick={() => !submitting && onClose()}
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex shrink-0 gap-2 border-b border-[var(--joballa-border)] bg-[var(--joballa-card)] px-4 py-3 sm:px-6">
          {STEPS.map((item, index) => (
            <span
              key={item}
              className={[
                "rounded-full px-3 py-1.5 text-xs font-bold",
                step === item
                  ? "bg-[var(--joballa-primary)] text-[var(--joballa-on-primary)]"
                  : "bg-[var(--joballa-page-tint)] text-[var(--joballa-muted)]",
              ].join(" ")}
            >
              {index + 1}. {t(`postJob.steps.${item}`)}
            </span>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {step === "basics" ? (
            <div className="mx-auto grid max-w-2xl gap-5">
              <AdminProfilePicker
                profiles={profiles}
                value={selectedProfile}
                onChange={setSelectedProfile}
                disabled={profilesQuery.loading}
              />

              <label className="grid gap-2 text-sm font-semibold">
                {t("postJob.fields.title")}
                <input
                  className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 py-2.5 outline-none"
                  value={draft.title}
                  onChange={(event) => update("title", event.target.value)}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold">
                  {t("postJob.fields.region")}
                  <select
                    className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 py-2.5 outline-none"
                    value={draft.region || DEFAULT_CAMEROON_REGION}
                    onChange={(event) => {
                      update("region", event.target.value);
                      update("location", "");
                    }}
                  >
                    {CAMEROON_REGION_IDS.map((regionId) => (
                      <option key={regionId} value={regionId}>
                        {regionId}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  {t("postJob.fields.city")}
                  <select
                    className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 py-2.5 outline-none"
                    value={draft.location}
                    onChange={(event) => update("location", event.target.value)}
                  >
                    <option value="">{t("postJob.placeholders.city")}</option>
                    {cityOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="grid gap-2 text-sm font-semibold">
                {t("postJob.fields.department")}
                <select
                  className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 py-2.5 outline-none"
                  value={draft.department}
                  onChange={(event) => update("department", event.target.value)}
                >
                  <option value="">{t("postJob.placeholders.department")}</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-semibold">
                {t("postJob.fields.skills")}
                <input
                  className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 py-2.5 outline-none"
                  value={draft.requiredSkillsText}
                  onChange={(event) => update("requiredSkillsText", event.target.value)}
                  placeholder={t("postJob.placeholders.skills")}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold">
                  {t("postJob.fields.jobType")}
                  <select
                    className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 py-2.5 outline-none"
                    value={draft.jobType}
                    onChange={(event) => update("jobType", event.target.value)}
                  >
                    {EMPLOYMENT_TYPES.map((value) => (
                      <option key={value} value={value}>
                        {value.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  {t("postJob.fields.experience")}
                  <select
                    className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 py-2.5 outline-none"
                    value={draft.requiredLevel}
                    onChange={(event) => update("requiredLevel", event.target.value)}
                  >
                    {EXPERIENCE_LEVELS.map((value) => (
                      <option key={value} value={value}>
                        {value.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="grid gap-2 text-sm font-semibold">
                {t("postJob.fields.schedule")}
                <input
                  className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 py-2.5 outline-none"
                  value={draft.schedule}
                  onChange={(event) => update("schedule", event.target.value)}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold">
                  {t("postJob.fields.duration")}
                  <input
                    className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 py-2.5 outline-none"
                    value={durationParts.amount}
                    onChange={(event) => updateDuration(event.target.value, durationParts.unit)}
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  {t("postJob.fields.durationUnit")}
                  <select
                    className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 py-2.5 outline-none"
                    value={durationParts.unit}
                    onChange={(event) => updateDuration(durationParts.amount, event.target.value)}
                  >
                    {DURATION_UNITS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold">
                  {t("postJob.fields.pay")}
                  <input
                    className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 py-2.5 outline-none"
                    value={draft.pay}
                    inputMode="numeric"
                    onChange={(event) => update("pay", event.target.value.replace(/\D/g, ""))}
                  />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  {t("postJob.fields.payPer")}
                  <select
                    className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 py-2.5 outline-none"
                    value={draft.payPer}
                    onChange={(event) => update("payPer", event.target.value)}
                  >
                    {PAY_STRUCTURES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="grid gap-2 text-sm font-semibold">
                {t("postJob.fields.openings")}
                <input
                  className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 py-2.5 outline-none"
                  value={draft.openings}
                  inputMode="numeric"
                  onChange={(event) => update("openings", event.target.value)}
                />
              </label>

              <div className="grid gap-2">
                <label className="grid gap-2 text-sm font-semibold">
                  {t("postJob.fields.startDate")}
                  <input
                    type="date"
                    className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 py-2.5 outline-none"
                    value={draft.startDate}
                    disabled={draft.startNow}
                    onChange={(event) => update("startDate", event.target.value)}
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-[var(--joballa-muted)]">
                  <input
                    type="checkbox"
                    checked={draft.startNow}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setDraft((current) => ({
                        ...current,
                        startNow: checked,
                        startDate: checked ? "" : current.startDate,
                      }));
                    }}
                  />
                  {t("postJob.startNow")}
                </label>
              </div>
            </div>
          ) : null}

          {step === "details" ? (
            <div className="mx-auto grid max-w-2xl gap-5">
              <label className="grid gap-2 text-sm font-semibold">
                {t("postJob.fields.description")}
                <textarea
                  className="min-h-40 rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 py-2.5 outline-none"
                  value={draft.description}
                  onChange={(event) => update("description", event.target.value)}
                />
              </label>
              <div>
                <p className="mb-2 text-sm font-semibold">{t("postJob.fields.requirements")}</p>
                <ListComposer
                  items={draft.requirements}
                  onChange={(items) => update("requirements", items)}
                  placeholder={t("postJob.placeholders.requirement")}
                  addLabel={t("postJob.actions.addRequirement")}
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold">{t("postJob.fields.responsibilities")}</p>
                <ListComposer
                  items={draft.responsibilities}
                  onChange={(items) => update("responsibilities", items)}
                  placeholder={t("postJob.placeholders.responsibility")}
                  addLabel={t("postJob.actions.addResponsibility")}
                />
              </div>
            </div>
          ) : null}

          {step === "preview" ? (
            <div className="mx-auto max-w-2xl rounded-[16px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5">
              <p className="text-2xl font-bold text-[var(--joballa-primary)]">{payPreview}</p>
              {schedulePreview ? <p className="mt-1 text-sm font-semibold text-[var(--joballa-muted)]">{schedulePreview}</p> : null}
              <h3 className="mt-5 text-lg font-bold">{draft.title || "—"}</h3>
              {selectedProfile ? (
                <p className="mt-2 text-sm font-semibold text-[var(--joballa-muted)]">
                  {selectedProfile.name} · {formatRoleLabel(selectedProfile.role)}
                </p>
              ) : null}
              <dl className="mt-6 space-y-3 text-sm">
                {[
                  [t("postJob.fields.city"), draft.location || "—"],
                  [t("postJob.fields.startDate"), draft.startNow ? t("postJob.startNow") : draft.startDate || "—"],
                  [t("postJob.fields.duration"), draft.duration || "—"],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex justify-between gap-4">
                    <dt className="font-semibold">{label}</dt>
                    <dd className="text-right text-[var(--joballa-muted)]">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-6 text-sm leading-6 text-[var(--joballa-muted)]">{draft.description || "—"}</p>
            </div>
          ) : null}
        </div>

        <footer className="flex shrink-0 flex-col gap-3 border-t border-[var(--joballa-border)] bg-[var(--joballa-card)] px-4 py-4 sm:flex-row sm:px-6">
          {step !== "basics" ? (
            <button
              type="button"
              className="rounded-full border border-[var(--joballa-border)] px-5 py-3 text-sm font-bold"
              onClick={() => setStep(step === "preview" ? "details" : "basics")}
            >
              {t("common.back")}
            </button>
          ) : (
            <button
              type="button"
              className="rounded-full border border-[var(--joballa-border)] px-5 py-3 text-sm font-bold"
              onClick={() => !submitting && onClose()}
            >
              {t("common.cancel")}
            </button>
          )}
          <div className="flex flex-1 justify-end gap-3">
            {step === "basics" ? (
              <button
                type="button"
                className="rounded-full bg-[var(--joballa-primary)] px-5 py-3 text-sm font-bold text-[var(--joballa-on-primary)]"
                onClick={() => validateBasics() && setStep("details")}
              >
                {t("postJob.actions.continue")}
              </button>
            ) : null}
            {step === "details" ? (
              <button
                type="button"
                className="rounded-full bg-[var(--joballa-primary)] px-5 py-3 text-sm font-bold text-[var(--joballa-on-primary)]"
                onClick={() => {
                  if (!draft.description.trim()) {
                    window.alert(t("postJob.errors.descriptionRequired"));
                    return;
                  }
                  setStep("preview");
                }}
              >
                {t("postJob.actions.preview")}
              </button>
            ) : null}
            {step === "preview" ? (
              <LoadingButton
                loading={submitting}
                loadingLabel={t("postJob.actions.submitting")}
                onClick={() => void submitJob()}
              >
                {t("postJob.actions.submitReview")}
              </LoadingButton>
            ) : null}
          </div>
        </footer>
      </section>
    </div>
  );
}
