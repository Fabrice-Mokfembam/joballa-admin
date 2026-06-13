"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Camera,
  Mail,
  MapPin,
  Phone,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { profilesApi } from "@/lib/api/admin";
import type { AdminProfile } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";
import { useAdminAction } from "@/lib/hooks/use-admin-action";
import { isAsyncRefreshing, isInitialAsyncLoad, useAsyncData, useMutation } from "@/lib/hooks/use-async";
import { INPUT_MAX_LENGTH } from "@/lib/constants/input-limits";
import { useTranslation } from "@/lib/i18n";
import { useTranslatedFormat } from "@/lib/i18n/use-translated-format";
import { FilterSelect, MoreMenu, PaginationBar, StatusFilterPills, UserAvatar } from "../ui";
import { ProfileCardGridSkeleton } from "../ui/skeletons";
import { AccessDeniedState, EmptyState, ErrorState, LoadingButton, SkeletonBar } from "../ui/states";

const PAGE_SIZE = 20;
const ROLE_FILTER_KEYS = ["common.all", "common.worker", "common.employer"] as const;
const ROLE_FILTER_VALUES = ["All", "Worker", "Employer"] as const;
const OWNERSHIP_FILTER_KEYS = ["common.all", "common.mine"] as const;
const OWNERSHIP_FILTER_VALUES = ["All", "Mine"] as const;
const CAMEROON_CITIES: Record<string, string[]> = {
  Adamawa: ["Meiganga", "Ngaoundere", "Tibati"],
  Centre: ["Bafia", "Mbalmayo", "Obala", "Yaounde"],
  East: ["Abong-Mbang", "Batouri", "Bertoua"],
  "Far North": ["Kousseri", "Maroua", "Mokolo"],
  Littoral: ["Douala", "Edea", "Loum", "Nkongsamba"],
  North: ["Garoua", "Guider", "Poli"],
  "North West": ["Bafut", "Bamenda", "Kumbo"],
  South: ["Ebolowa", "Kribi", "Sangmelima"],
  "South West": ["Buea", "Kumba", "Limbe", "Mamfe"],
  West: ["Bafang", "Bafoussam", "Bangangte", "Dschang", "Foumban"],
};

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  role: "worker" as "worker" | "employer",
  companyName: "",
  position: "",
  region: "",
  city: "",
  shortBio: "",
  photoPreview: "",
};

function formatProfileDate(value?: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });
}

function getAccountStatus(profile: AdminProfile): "Active" | "Suspended" {
  if (profile.accountStatus) {
    return profile.accountStatus === "suspended" ? "Suspended" : "Active";
  }
  return ["suspended", "inactive", "disabled"].includes(profile.status.toLowerCase()) ? "Suspended" : "Active";
}

function ProfileDetailSkeleton() {
  return (
    <aside className="rounded-[20px] border border-[var(--joballa-border)] bg-[var(--joballa-page-tint)] p-4">
      <section className="rounded-[16px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5">
        <div className="flex items-center gap-4">
          <SkeletonBar className="h-24 w-24 rounded-full" />
          <div className="flex-1">
            <SkeletonBar className="h-6 w-48" />
            <SkeletonBar className="mt-3 h-4 w-32" />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => <SkeletonBar key={index} className="h-24 rounded-[12px]" />)}
        </div>
      </section>
    </aside>
  );
}

export function ProfilesView() {
  const { t } = useTranslation();
  const { formatRoleLabel } = useTranslatedFormat();
  const { hasPermission, isSuperAdmin, user } = useAuth();
  const { perform } = useAdminAction();
  const canRead = hasPermission("create_profiles");
  const canManageProfiles = hasPermission("create_profiles");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [ownershipFilter, setOwnershipFilter] = useState("All");
  const [creatorFilter, setCreatorFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<AdminProfile | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data, loading, error, reload } = useAsyncData(
    () =>
      profilesApi.list({
        page,
        limit: PAGE_SIZE,
        role: roleFilter === "Worker" ? "worker" : roleFilter === "Employer" ? "employer" : undefined,
        isAdminCreated: "true",
        createdByAdmin:
          ownershipFilter === "Mine"
            ? user?.id
            : isSuperAdmin && creatorFilter !== "All"
              ? creatorFilter
              : undefined,
      }),
    [page, searchQuery, roleFilter, ownershipFilter, creatorFilter, isSuperAdmin, user?.id],
    { cacheKey: `profiles:list:${page}:${roleFilter}:${ownershipFilter}:${creatorFilter}:${user?.id ?? "all"}` }
  );

  const { mutate: createProfile, loading: creating } = useMutation(() =>
    profilesApi.create({
      profileType: form.role,
      fullName: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      locationRegionCity: [form.city.trim(), form.region.trim()].filter(Boolean).join("/"),
      roleOrPosition: form.role === "worker" ? form.position.trim() || undefined : undefined,
      organization: form.role === "employer" ? form.companyName.trim() || undefined : undefined,
      shortBio: form.shortBio.trim() || undefined,
    })
  );
  const { mutate: updateProfile, loading: updating } = useMutation((profile: AdminProfile) =>
    profilesApi.update(profile.id, {
      fullName: profile.name,
      roleOrPosition: profile.role === "worker" ? profile.position ?? undefined : undefined,
      organization: profile.role === "employer" ? profile.companyName ?? undefined : undefined,
      shortBio: profile.shortBio ?? undefined,
    })
  );
  const { mutate: deleteProfile } = useMutation((profileId: string) => profilesApi.delete(profileId));
  const { mutate: suspendProfile } = useMutation((profileId: string) => profilesApi.suspend(profileId));
  const { mutate: activateProfile } = useMutation((profileId: string) => profilesApi.activate(profileId));

  const profiles = data?.items ?? [];
  const creators = Array.from(
    profiles.reduce((map, profile) => {
      if (profile.createdByAdminId && profile.createdBy) {
        map.set(profile.createdByAdminId, profile.createdBy);
      }
      return map;
    }, new Map<string, string>())
  ).map(([id, name]) => ({ id, name }));
  const creatorFilteredProfiles = profiles;
  const visibleProfiles = creatorFilteredProfiles.filter((profile) => {
    const query = searchQuery.trim().toLowerCase();
    return !query || `${profile.name} ${profile.email} ${profile.companyName ?? ""}`.toLowerCase().includes(query);
  });
  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) ?? null;
  const totalPages = data?.totalPages ?? 1;
  const isInitialLoad = isInitialAsyncLoad(loading, data);
  const isRefreshing = isAsyncRefreshing(loading, data);

  useEffect(() => {
    function openCreateProfile() {
      setIsCreateOpen(true);
    }
    window.addEventListener("admin:add-profile", openCreateProfile);
    return () => window.removeEventListener("admin:add-profile", openCreateProfile);
  }, []);

  if (!canRead) {
    return <AccessDeniedState description={t("profiles.accessDenied")} />;
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.region || !form.city) return;
    await perform(createProfile, {
      success: t("profiles.createdSuccess"),
      onSuccess: () => {
        setIsCreateOpen(false);
        setForm(EMPTY_FORM);
        reload();
      },
    });
  }

  async function handleDelete(profileId: string) {
    return perform(() => deleteProfile(profileId), {
      success: t("profiles.deletedSuccess"),
      onSuccess: () => {
        setSelectedProfileId(null);
        reload();
      },
    });
  }

  async function handleSuspend(profile: AdminProfile) {
    return perform(() => suspendProfile(profile.id), {
      success: t("profiles.suspendedSuccess"),
      onSuccess: reload,
    });
  }

  async function handleActivate(profile: AdminProfile) {
    return perform(() => activateProfile(profile.id), {
      success: t("profiles.activatedSuccess"),
      onSuccess: reload,
    });
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingProfile?.name.trim()) return;
    await perform(() => updateProfile(editingProfile), {
      success: t("profiles.updatedSuccess"),
      onSuccess: () => {
        setEditingProfile(null);
        reload();
      },
    });
  }

  function handleImageSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((value) => ({ ...value, photoPreview: String(reader.result ?? "") }));
    reader.readAsDataURL(file);
  }

  function getProfileActions(profile: AdminProfile) {
    const accountStatus = getAccountStatus(profile);
    return [
      ...(canManageProfiles && profile.isAdminCreated !== false
        ? [{ label: t("common.edit"), onClick: () => setEditingProfile(profile) }]
        : []),
      ...(canManageProfiles && profile.isAdminCreated !== false
        ? accountStatus === "Suspended"
          ? [
              {
                label: t("common.activate"),
                onClick: () => handleActivate(profile),
              },
              { label: t("common.delete"), tone: "danger" as const, confirm: true, onClick: () => handleDelete(profile.id) },
            ]
          : [
              {
                label: t("common.suspend"),
                tone: "danger" as const,
                confirm: true,
                confirmationDescription: t("profiles.suspendConfirm"),
                onClick: () => handleSuspend(profile),
              },
              { label: t("common.delete"), tone: "danger" as const, confirm: true, onClick: () => handleDelete(profile.id) },
            ]
        : []),
    ];
  }

  if (isInitialLoad) {
    return <ProfileCardGridSkeleton count={6} />;
  }

  if (error && data === null) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  return (
    <section>
      <div className="mb-5 flex flex-wrap gap-3">
        <div className="flex min-h-12 min-w-0 w-full flex-1 items-center rounded-[14px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-4 sm:min-w-[260px]">
          <input
            aria-label={t("common.search")}
            className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--joballa-muted)]"
            placeholder={t("profiles.searchPlaceholder")}
            value={searchQuery}
            maxLength={INPUT_MAX_LENGTH.search}
            onChange={(event) => { setSearchQuery(event.target.value); setPage(1); }}
          />
          <Search size={18} className="text-[var(--joballa-muted)]" />
        </div>
        <FilterSelect
          label={t("profiles.ownershipFilter")}
          value={t(OWNERSHIP_FILTER_KEYS[OWNERSHIP_FILTER_VALUES.indexOf(ownershipFilter as (typeof OWNERSHIP_FILTER_VALUES)[number])])}
          options={OWNERSHIP_FILTER_KEYS.map((key) => t(key))}
          onChange={(label) => {
            const index = OWNERSHIP_FILTER_KEYS.findIndex((key) => t(key) === label);
            if (index >= 0) {
              setOwnershipFilter(OWNERSHIP_FILTER_VALUES[index]);
              if (OWNERSHIP_FILTER_VALUES[index] === "Mine") setCreatorFilter("All");
            }
            setPage(1);
            setSelectedProfileId(null);
          }}
        />
      </div>

      <StatusFilterPills
        statuses={ROLE_FILTER_KEYS.map((key) => t(key))}
        value={t(ROLE_FILTER_KEYS[ROLE_FILTER_VALUES.indexOf(roleFilter as (typeof ROLE_FILTER_VALUES)[number])])}
        onChange={(label) => {
          const index = ROLE_FILTER_KEYS.findIndex((key) => t(key) === label);
          if (index >= 0) setRoleFilter(ROLE_FILTER_VALUES[index]);
          setPage(1);
          setSelectedProfileId(null);
        }}
      />
      <p className="mb-4 text-sm font-semibold text-[var(--joballa-muted)]">{t("profiles.count", { count: String(data?.total ?? visibleProfiles.length) })}</p>

      {isSuperAdmin && ownershipFilter === "All" && creators.length > 0 ? (
        <div className="mb-5 flex flex-wrap gap-2">
          <button
            type="button"
            className={[
              "rounded-full border px-4 py-2 text-sm font-bold",
              creatorFilter === "All"
                ? "border-[var(--joballa-primary)] bg-[var(--joballa-primary)] text-[var(--joballa-on-primary)]"
                : "border-[var(--joballa-border)] bg-[var(--joballa-card)] text-[var(--joballa-muted)]",
            ].join(" ")}
            onClick={() => { setCreatorFilter("All"); setPage(1); }}
          >
            {t("profiles.allCreators")}
          </button>
          {creators.map((creator) => (
            <button
              key={creator.id}
              type="button"
              className={[
                "rounded-full border px-4 py-2 text-sm font-bold",
                creatorFilter === creator.id
                  ? "border-[var(--joballa-primary)] bg-[var(--joballa-primary)] text-[var(--joballa-on-primary)]"
                  : "border-[var(--joballa-border)] bg-[var(--joballa-card)] text-[var(--joballa-muted)]",
              ].join(" ")}
              onClick={() => { setCreatorFilter(creator.id); setPage(1); }}
            >
              {creator.name}
            </button>
          ))}
        </div>
      ) : null}

      <div className={["grid gap-6", selectedProfile ? "xl:grid-cols-[minmax(320px,500px)_minmax(0,1fr)] xl:items-start" : ""].join(" ")}>
        <div aria-busy={isRefreshing} className={["grid gap-4", selectedProfile ? "xl:max-w-[500px]" : "w-full md:grid-cols-2 xl:grid-cols-3", isRefreshing ? "pointer-events-none opacity-60" : ""].join(" ")}>
          {visibleProfiles.length === 0 && !isRefreshing ? (
            <div className="col-span-full"><EmptyState title={t("profiles.noProfiles")} description={t("profiles.noProfilesDescription")} /></div>
          ) : (
            visibleProfiles.map((profile) => {
              const accountStatus = getAccountStatus(profile);
              const profileActions = getProfileActions(profile);
              return (
                <article
                  key={profile.id}
                  className={[
                    "cursor-pointer rounded-[18px] border bg-[var(--joballa-card)] p-5",
                    selectedProfileId === profile.id ? "border-[var(--joballa-primary)]" : "border-[var(--joballa-border)]",
                  ].join(" ")}
                  onClick={() => setSelectedProfileId(profile.id)}
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-4">
                      <UserAvatar name={profile.name} photoUrl={profile.photoUrl} size="md" />
                      <div className="min-w-0">
                        <h3 className="flex min-w-0 items-center gap-1.5 text-lg font-semibold tracking-tight">
                          <span className="truncate">{profile.name}</span>
                          {profile.isVerified ? <BadgeCheck size={19} className="shrink-0 text-[var(--joballa-primary)]" /> : null}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-sm font-medium leading-5 text-[var(--joballa-muted)]">
                          {profile.shortBio || t("profiles.noBio")}
                        </p>
                      </div>
                    </div>
                    {profileActions.length > 0 ? <MoreMenu label={t("users.actionsFor", { name: profile.name })} items={profileActions} /> : null}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="rounded-full border border-[var(--joballa-border)] bg-[var(--joballa-page-tint)] px-3 py-1.5 text-xs font-bold">{formatRoleLabel(profile.role)}</span>
                    <span className={["rounded-full px-3 py-1.5 text-xs font-bold", accountStatus === "Suspended" ? "bg-[var(--joballa-danger-bg)] text-[var(--joballa-danger-fg)]" : "bg-[var(--joballa-jade-3)] text-[var(--joballa-primary)]"].join(" ")}>
                      {accountStatus === "Suspended" ? t("common.suspended") : t("common.active")}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-2.5 text-sm font-medium text-[var(--joballa-muted)]">
                    {profile.email ? <span className="flex min-w-0 items-center gap-2"><Mail size={15} /><span className="truncate">{profile.email}</span></span> : null}
                    {profile.city || profile.region || profile.country ? <span className="flex min-w-0 items-center gap-2"><MapPin size={15} /><span className="truncate">{[profile.city, profile.region, profile.country].filter(Boolean).join(", ")}</span></span> : null}
                    {formatProfileDate(profile.createdAt) ? <span className="flex items-center gap-2"><CalendarDays size={15} />{t("profiles.created", { date: formatProfileDate(profile.createdAt) ?? "" })}</span> : null}
                  </div>
                </article>
              );
            })
          )}
        </div>

        {selectedProfile ? (
          isRefreshing ? (
            <ProfileDetailSkeleton />
          ) : (
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-0 min-[600px]:px-6 min-[600px]:py-8 xl:static xl:z-auto xl:block xl:bg-transparent xl:p-0" onClick={() => setSelectedProfileId(null)}>
              <aside className="h-full w-full overflow-y-auto rounded-none border border-[var(--joballa-border)] bg-[var(--joballa-page-tint)] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.28)] min-[600px]:h-[min(88vh,900px)] min-[600px]:max-w-[760px] min-[600px]:rounded-[20px] xl:sticky xl:top-5 xl:h-fit xl:max-h-[calc(100dvh-6.5rem)] xl:max-w-none xl:shadow-none" onClick={(event) => event.stopPropagation()}>
                <section className="rounded-[16px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5">
                  <div className="mb-5 flex justify-end gap-2">
                    {getProfileActions(selectedProfile).length > 0 ? <MoreMenu label={t("profiles.detailActions", { name: selectedProfile.name })} items={getProfileActions(selectedProfile)} /> : null}
                    <button type="button" aria-label={t("profiles.closeDetails")} className="grid h-10 w-10 place-items-center rounded-full border border-[var(--joballa-border)] text-[var(--joballa-muted)]" onClick={() => setSelectedProfileId(null)}><X size={18} /></button>
                  </div>
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <UserAvatar name={selectedProfile.name} photoUrl={selectedProfile.photoUrl} size="lg" />
                    <div className="min-w-0">
                      <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">{selectedProfile.name}{selectedProfile.isVerified ? <BadgeCheck size={22} className="text-[var(--joballa-primary)]" /> : null}</h2>
                      <p className="mt-1 text-sm font-semibold text-[var(--joballa-muted)]">{selectedProfile.position || selectedProfile.companyName || formatRoleLabel(selectedProfile.role)}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[var(--joballa-page-tint)] px-3 py-1 text-xs font-bold">{formatRoleLabel(selectedProfile.role)}</span>
                        <span className="rounded-full bg-[var(--joballa-jade-3)] px-3 py-1 text-xs font-bold text-[var(--joballa-primary)]">
                          {t("profiles.verification", { status: formatRoleLabel(selectedProfile.status) })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                      [t("profiles.email"), selectedProfile.email, Mail],
                      [t("profiles.phoneLabel"), selectedProfile.phone, Phone],
                      [t("profiles.role"), formatRoleLabel(selectedProfile.role), UserRound],
                      [t("profiles.dob"), selectedProfile.dateOfBirth, CalendarDays],
                      [t("profiles.position"), selectedProfile.position, BriefcaseBusiness],
                      [t("profiles.organizationLabel"), selectedProfile.companyName, Building2],
                      [t("profiles.location"), [selectedProfile.city, selectedProfile.region, selectedProfile.country].filter(Boolean).join(", "), MapPin],
                      [t("profiles.profileViews"), selectedProfile.profileViews, UserRound],
                      [t("profiles.createdBy"), selectedProfile.createdBy, UserRound],
                      [t("profiles.createdLabel"), formatProfileDate(selectedProfile.createdAt), CalendarDays],
                    ].filter(([, value]) => value !== null && value !== undefined && value !== "").map(([label, value, Icon]) => {
                      const DetailIcon = Icon as typeof Mail;
                      return (
                        <div key={String(label)} className="rounded-[12px] border border-[var(--joballa-border)] p-4">
                          <dt className="flex items-center gap-2 text-xs font-medium text-[var(--joballa-muted)]"><DetailIcon size={14} />{String(label)}</dt>
                          <dd className="mt-2 break-words text-sm font-semibold">{String(value)}</dd>
                        </div>
                      );
                    })}
                  </dl>
                </section>
                {selectedProfile.shortBio ? (
                  <section className="mt-4 rounded-[16px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5">
                    <h3 className="font-bold">{t("profiles.bio")}</h3>
                    <p className="mt-3 text-sm font-medium leading-6 text-[var(--joballa-muted)]">{selectedProfile.shortBio}</p>
                  </section>
                ) : null}
              </aside>
            </div>
          )
        ) : null}
      </div>

      <PaginationBar page={page} totalPages={totalPages} total={data?.total} onPageChange={(nextPage) => { setPage(nextPage); setSelectedProfileId(null); }} />

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/55 px-4 py-4" onClick={() => setIsCreateOpen(false)}>
          <form className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)]" onClick={(event) => event.stopPropagation()} onSubmit={(event) => void handleCreate(event)}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">{t("profiles.createTitle")}</h2>
              <button type="button" aria-label={t("common.close")} className="grid h-9 w-9 place-items-center rounded-[8px] border border-[var(--joballa-border)]" onClick={() => setIsCreateOpen(false)}><X size={18} /></button>
            </div>

            <div className="mt-6 flex justify-center">
              <label className="grid cursor-pointer justify-items-center gap-2 text-sm font-semibold">
                {t("profiles.profileImage")}
                <span className="relative grid h-28 w-28 place-items-center overflow-hidden rounded-full border-2 border-dashed border-[var(--joballa-border)] bg-[var(--joballa-page-tint)] text-[var(--joballa-muted)]">
                  {form.photoPreview ? <Image src={form.photoPreview} alt={t("profiles.profileImage")} fill className="object-cover" unoptimized /> : <Camera size={28} />}
                </span>
                <span className="text-xs font-medium text-[var(--joballa-primary)]">{t("profiles.clickToAddImage")}</span>
                <input className="sr-only" type="file" accept="image/*" onChange={handleImageSelection} />
              </label>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">{t("profiles.fullName")}<input className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 py-2.5 outline-none" value={form.name} maxLength={INPUT_MAX_LENGTH.fullName} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} required /></label>
              <label className="grid gap-2 text-sm font-semibold">{t("profiles.email")}<input type="email" className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 py-2.5 outline-none" value={form.email} maxLength={INPUT_MAX_LENGTH.email} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} required /></label>
              <label className="grid gap-2 text-sm font-semibold">{t("profiles.phone")}<input className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 py-2.5 outline-none" value={form.phone} maxLength={INPUT_MAX_LENGTH.phone} onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))} required /></label>
              <label className="grid gap-2 text-sm font-semibold">{t("profiles.dateOfBirth")}<input type="date" className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 py-2.5 outline-none" value={form.dateOfBirth} onChange={(event) => setForm((value) => ({ ...value, dateOfBirth: event.target.value }))} /></label>
              <label className="grid gap-2 text-sm font-semibold">{t("profiles.type")}<select className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 py-2.5 outline-none" value={form.role} onChange={(event) => setForm((value) => ({ ...value, role: event.target.value as "worker" | "employer" }))}><option value="worker">{t("common.worker")}</option><option value="employer">{t("common.employer")}</option></select></label>
              <label className="grid gap-2 text-sm font-semibold">{form.role === "employer" ? t("profiles.organization") : t("profiles.roleOrPosition")}<input className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 py-2.5 outline-none" value={form.role === "employer" ? form.companyName : form.position} maxLength={form.role === "employer" ? INPUT_MAX_LENGTH.organization : INPUT_MAX_LENGTH.position} onChange={(event) => setForm((value) => form.role === "employer" ? { ...value, companyName: event.target.value } : { ...value, position: event.target.value })} /></label>
              <label className="grid gap-2 text-sm font-semibold">{t("profiles.region")}<select required className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 py-2.5 outline-none" value={form.region} onChange={(event) => setForm((value) => ({ ...value, region: event.target.value, city: "" }))}><option value="">{t("profiles.selectRegion")}</option>{Object.keys(CAMEROON_CITIES).map((region) => <option key={region}>{region}</option>)}</select></label>
              <label className="grid gap-2 text-sm font-semibold">{t("profiles.city")}<select required disabled={!form.region} className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 py-2.5 outline-none disabled:cursor-not-allowed disabled:opacity-50" value={form.city} onChange={(event) => setForm((value) => ({ ...value, city: event.target.value }))}><option value="">{form.region ? t("profiles.selectCity") : t("profiles.selectRegionFirst")}</option>{(CAMEROON_CITIES[form.region] ?? []).map((city) => <option key={city}>{city}</option>)}</select></label>
              <label className="grid gap-2 text-sm font-semibold sm:col-span-2">{t("profiles.bio")}<textarea className="min-h-24 rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 py-2.5 outline-none" value={form.shortBio} maxLength={INPUT_MAX_LENGTH.shortBio} onChange={(event) => setForm((value) => ({ ...value, shortBio: event.target.value }))} /></label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="rounded-full border border-[var(--joballa-border)] px-5 py-2.5 text-sm font-bold" onClick={() => setIsCreateOpen(false)}>{t("common.cancel")}</button>
              <LoadingButton type="submit" loading={creating} loadingLabel={t("common.creating")}>{t("common.create")}</LoadingButton>
            </div>
          </form>
        </div>
      ) : null}

      {editingProfile ? (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/55 px-4 py-4" onClick={() => setEditingProfile(null)}>
          <form className="w-full max-w-xl rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-card)] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)]" onClick={(event) => event.stopPropagation()} onSubmit={(event) => void handleUpdate(event)}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold">{t("profiles.editTitle")}</h2>
              <button type="button" aria-label={t("common.close")} className="grid h-9 w-9 place-items-center rounded-[8px] border border-[var(--joballa-border)]" onClick={() => setEditingProfile(null)}><X size={18} /></button>
            </div>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm font-semibold">{t("profiles.fullName")}<input required className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 py-2.5 outline-none" value={editingProfile.name} maxLength={INPUT_MAX_LENGTH.fullName} onChange={(event) => setEditingProfile({ ...editingProfile, name: event.target.value })} /></label>
              <label className="grid gap-2 text-sm font-semibold">{editingProfile.role === "employer" ? t("profiles.organization") : t("profiles.roleOrPosition")}<input className="rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 py-2.5 outline-none" value={editingProfile.role === "employer" ? editingProfile.companyName ?? "" : editingProfile.position ?? ""} maxLength={editingProfile.role === "employer" ? INPUT_MAX_LENGTH.organization : INPUT_MAX_LENGTH.position} onChange={(event) => setEditingProfile(editingProfile.role === "employer" ? { ...editingProfile, companyName: event.target.value } : { ...editingProfile, position: event.target.value })} /></label>
              <label className="grid gap-2 text-sm font-semibold">{t("profiles.bio")}<textarea className="min-h-28 rounded-[8px] border border-[var(--joballa-border)] bg-[var(--joballa-input-bg)] px-3 py-2.5 outline-none" value={editingProfile.shortBio ?? ""} maxLength={INPUT_MAX_LENGTH.shortBio} onChange={(event) => setEditingProfile({ ...editingProfile, shortBio: event.target.value })} /></label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="rounded-full border border-[var(--joballa-border)] px-5 py-2.5 text-sm font-bold" onClick={() => setEditingProfile(null)}>{t("common.cancel")}</button>
              <LoadingButton type="submit" loading={updating} loadingLabel={t("common.saving")}>{t("profiles.saveChanges")}</LoadingButton>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
