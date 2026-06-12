# Joballa Admin — Backend Requirements

Outstanding API and database work for the current admin UI. Everything else from the June 2026 route baseline is assumed shipped.

*Last updated: June 2026*

---

## 1. Applications source

Add a `source` field on the **applications** table/entity.


| Value        | Notes                                  |
| ------------ | -------------------------------------- |
| `web`        | Default when `source` is null or empty |
| `mobile_app` | Mobile applications                    |


`GET /admin/dashboard/analytics` → `applicationsBySource` must return both buckets, e.g.:

```json
[
  { "source": "web", "applications": 1842 },
  { "source": "mobile_app", "applications": 1234 }
]
```

`range=7d|30d|90d|1y` must filter `**applicationsOverTime**` and `applicationsBySource` (the dashboard date dropdown only refreshes these two series). So when applicants apply they should send the source

---

## 2. Departments

### Remove suspend (API + DB)

- Delete routes: `POST /admin/departments/:id/activate`, `suspend`, `reactivate`
- Stop returning / using department `status` / `isActive` for suspension
- Departments are categories until deleted; block delete when active jobs exist (`409`)

### List metrics

`GET /admin/departments` — each item needs:


| Field               | Alias          |
| ------------------- | -------------- |
| `jobPostsCount`     | `jobs`         |
| `applicationsCount` | `applications` |
| `hiresCount`        | `hires`        |


### Virtual “Other” (not in DB)

- Never store a department named `"Other"` — reject on create (`400`)
- Jobs with no department: `departmentId: null`, `department: null`
- `GET /admin/dashboard` → `jobs.totalJobs` required so the UI can compute unassigned jobs:  
`totalJobs − sum(department job counts)`

Optional on departments list:

```json
{ "summary": { "jobsWithoutDepartment": 42 } }
```

---

## 3. Jobs

- Allow `departmentId: null` / `department: null` on list and detail
- Return `**rejectionReason**` (or map from reject `reason`) so rejected jobs show `Reason: …` in the admin UI

---

## 4. Authentication

Suspended **platform users** and **admin accounts** must not log in or refresh tokens or be able to perform any actions.

```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_SUSPENDED",
    "message": "Account suspended. Contact support."
  }
}
```

---

## 5. Audit logs — `GET /admin/logs`

Write and return **human-readable** text — no raw UUIDs in user-facing fields.


| Field                                                | Example                        |
| ---------------------------------------------------- | ------------------------------ |
| `details` / `entityLabel`                            | `Deleted user John Ngu`        |
| `recentActivity[].description` (dashboard analytics) | `KYC approved for Alice Choua` |


Resolve IDs to names when logging (full name → email → job title → department name).

Add `**adminRole`** on each log row: `super_admin` | `admin_manager` | `verifier` | `support_agent`.

---

## 6. Disputes — `GET /admin/disputes`

### Reporter / reported (replace flat strings)

```json
{
  "reporter": {
    "userId": "uuid",
    "fullName": "Fabricé Mokfembam",
    "email": "fabricemokfembam@gmail.com",
    "phone": null,
    "role": "worker"
  },
  "reported": {
    "userId": "uuid",
    "fullName": "kongnyuy98765",
    "email": "kongnyuy98765@gmail.com",
    "phone": null,
    "role": "employer"
  }
}
```

`fullName` must be set when available. UI shows e.g. `John Ngu (Worker)`.

### Status

- `in_review` and `open` are the same — migrate `in_review` → `open`, drop `in_review` from the enum
- Filters: `open`, `resolved`, `closed`, `all`

---

## 7. Profiles

`GET /admin/profiles?createdByAdmin={adminId}` — filter profiles created by that admin (powers the **Mine** filter on the profiles page).

---

## 8. Documents (analytics only)

`documentsByStatus.pending` in dashboard analytics must count both `pending` and `pending_review` submissions.

---

## 9. Dashboard read access (all admins)

Every authenticated admin must be able to **read** the full dashboard — same stats as a super admin:

- `GET /admin/dashboard`
- `GET /admin/dashboard/analytics` (including `range` query)

Do **not** require `view_platform_analytics` (or any other permission) for these read endpoints. Permission checks stay on **actions** elsewhere (KYC approve, job publish, manage admins, etc.) and on export if applicable.

---

## Checklist


| #   | Item                                                                       |
| --- | -------------------------------------------------------------------------- |
| 1   | Applications `source` column; `web` default; analytics by source           |
| 2   | `range` filters `applicationsOverTime` + `applicationsBySource`            |
| 3   | Remove department suspend routes and DB usage                              |
| 4   | Department list: jobs / applications / hires counts                        |
| 5   | No `"Other"` department row; jobs may have `departmentId: null`            |
| 6   | `dashboard.jobs.totalJobs` for unassigned job count                        |
| 7   | Job `rejectionReason` on list/detail                                       |
| 8   | Block login + refresh for suspended users and admins                       |
| 9   | Audit logs: human-readable details; `adminRole` on rows                    |
| 10  | Disputes: `reporter` + `reported` objects with `role`                      |
| 11  | Disputes: merge `in_review` into `open, so we should have just one status` |
| 12  | Profiles: `createdByAdmin` query param                                     |
| 13  | Analytics: pending documents include `pending_review`                      |
| 14  | Dashboard + analytics readable by all authenticated admins (no extra perm) |


