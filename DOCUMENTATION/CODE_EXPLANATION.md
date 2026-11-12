# Code Explanation

How the CM Kerala Grievance Portal prototype is built, and why it is built that way.
Every path below is relative to the repository root.

---

## 1. The big picture

```
Browser (React SPA)
   │  same-origin /api/v1/*   (Vite proxy locally, Vercel rewrite in production)
   ▼
Django REST Framework  ──►  Workflow service  ──►  PostgreSQL
   │                              │
   │                              └──► Notifications (in-app)
   └──► AI assistant  ──►  Google Gemini API (server-side only)
```

* **Frontend** – React 19 + Vite + Tailwind CSS v4. Talks only to `/api/v1/...` on its own origin.
* **Backend** – Django 6 + Django REST Framework, JWT auth (Simple JWT), PostgreSQL via `DATABASE_URL`.
* **AI** – Google Gemini through the official `google-genai` SDK, called **only from the server**.

The most important design decision: **all business rules live in one backend module**
(`backend/apps/grievances/services/workflow.py`). Views only validate input and call it, and
the UI only shows the buttons the rules allow. Even if someone bypasses the UI and
calls the API directly, the backend still enforces every rule.

---

## 2. Backend structure

```
backend/
├── config/                 settings.py (env-driven), urls.py (/api/v1 routing)
└── apps/
    ├── core/               shared: choices, permissions, validators, pagination, seed command
    ├── accounts/           custom User (email login, roles), JWT cookie auth views
    ├── departments/        Department model + public read-only API
    ├── grievances/         the domain: models, workflow engine, selectors, stats, views per role
    │   ├── services/       reference.py · workflow.py · selectors.py · stats.py
    │   ├── serializers/    common.py · citizen.py · staff.py
    │   └── views/          citizen.py · cmo.py · officer.py · attachments.py
    ├── ai_assistant/       Gemini client, labelled fallback, analysis orchestration, audit log
    ├── contact/            Contact-us enquiries
    └── notifications/      In-app notifications
```

No app keeps all its logic in one `views.py`. Each layer has one job:

| Layer | Job | Example |
|---|---|---|
| **Models** | Data, constraints, indexes | `Grievance`, `GrievanceHistory` |
| **Selectors** | *Which rows may this user see?* | `officer_grievances(user)` |
| **Services** | *What is allowed to happen?* (state changes) | `workflow.assign(...)` |
| **Serializers** | Input validation, output shape per role | `CitizenGrievanceDetailSerializer` |
| **Views** | HTTP glue + permission class | `CMOGrievanceViewSet.assign` |

### 2.1 Users and roles — `apps/accounts/models.py`
* `User` extends `AbstractUser`, logs in with **email** (no username), and has a `role`:
  `CITIZEN`, `CMO_ADMIN` or `OFFICER`.
* Officers have a `department` foreign key. A **database CHECK constraint**
  (`officer_requires_department`) makes it impossible to save an officer without one.
* Citizens self-register. CMO admins and officers are created through Django admin or the seed command.
  The registration serializer **always forces `role=CITIZEN`**, so sending `"role": "CMO_ADMIN"` has no effect (there is a test for this).

### 2.2 Grievance data model — `apps/grievances/models.py`

| Model | Purpose | Key integrity rules |
|---|---|---|
| `Grievance` | The complaint | unique `reference_number`; indexes on status, district, department; `due_at` from priority SLA |
| `ReferenceSequence` | Per-year counter | row-locked to generate `CMK-YYYY-NNNNN` without duplicates |
| `GrievanceHistory` | Audit trail | `save()`/`delete()` raise on existing rows, so it is **immutable**; `PROTECT` FK |
| `DepartmentAssignment` | Every routing decision | partial unique constraint: **one active assignment per grievance** |
| `ActionTakenReport` | Officer's report | partial unique constraint: **one pending report per grievance** |
| `Attachment` | Uploaded files | stored under random UUID names; linked to grievance (and report) |
| `GrievanceRemark` | Internal or public remarks | `visibility` = INTERNAL (staff) / PUBLIC (citizen) |
| `Feedback` | Citizen rating | CHECK 1–5; unique per (grievance, resolution cycle) |
| `Notification` | In-app updates | index on (user, is_read) |
| `ContactEnquiry` | Contact form | — |
| `AIAnalysisLog` | Every AI call | source (GEMINI/FALLBACK), success, latency, error reason |

Grievance child tables use `on_delete=PROTECT`, so a grievance with history can never be deleted by accident.

### 2.3 Reference numbers — `services/reference.py`
```python
seq = ReferenceSequence.objects.select_for_update().get_or_create(year=year)
seq.last_number += 1
return f"CMK-{year}-{seq.last_number:05d}"
```
`SELECT … FOR UPDATE` locks the year's counter row. Two simultaneous submissions queue on the lock
instead of both reading the same number. Because the counter runs inside the grievance-creation transaction,
a failed submission rolls the counter back too, so numbers have no gaps.

### 2.4 The workflow engine — `services/workflow.py`
A small state machine:

```
SUBMITTED ──► UNDER_REVIEW ──► IN_PROGRESS ──► RESOLVED ──► REOPENED
                   ▲                ▲                             │
                   └────────────────┴─────────────────────────────┘
```

| Function | Who | Effect |
|---|---|---|
| `create_grievance` | Citizen | reference no. + attachments + `CREATED` history + notify CMO |
| `start_review` | CMO | SUBMITTED/REOPENED → UNDER_REVIEW |
| `assign` | CMO | (auto-review) + deactivate old assignment + new assignment + notify officer |
| `start_investigation` | Officer | UNDER_REVIEW/REOPENED → IN_PROGRESS |
| `add_progress_update` | Officer | history entry (citizen sees it) |
| `submit_action_report` | Officer | creates a PENDING report — **status does not change** |
| `review_action_report` | **CMO only** | approve → RESOLVED, or reject → stays IN_PROGRESS |
| `escalate` / `update_triage` | CMO | flag + priority High / override AI priority or category |
| `reopen` | Citizen (≤ 30 days) or CMO | RESOLVED → REOPENED, new due date |
| `submit_feedback` | Citizen | once per resolution cycle |

Every function:
1. opens `transaction.atomic()`,
2. **locks the grievance row** (`select_for_update`) so two people can't act on it at once,
3. checks the transition against `ALLOWED_TRANSITIONS`, and checks the actor's role and department,
4. writes a `GrievanceHistory` row (previous status, new status, user, remarks, timestamp),
5. creates notifications.

Officers **cannot resolve** a grievance. They can only submit a report, and only the CMO's
`review_action_report` can move a grievance to RESOLVED.

### 2.5 Object-level access — `services/selectors.py`
Instead of checking permissions after loading a row, each role gets a **pre-filtered queryset**:

* citizen → `Grievance.objects.filter(citizen=user)`
* officer → `filter(department=user.department) & (assigned_officer=user | assigned_officer is null)`
* CMO → everything

ViewSets use these in `get_queryset()`, so another user's grievance returns **404**: the server doesn't even confirm it exists.
The attachment download view uses the same selector, so files follow the same rules.

### 2.6 Statistics — `services/stats.py`
All dashboard numbers come from database aggregation (`Count(..., filter=Q(...))`, `TruncMonth`),
not hard-coded values. *Overdue* means `due_at < now` and the grievance isn't resolved. `due_at` is set from the SLA: 7, 15 or 30 days for High, Medium or Low priority.

### 2.7 Authentication flow — `apps/accounts/views.py`, `tokens.py`
```
POST /auth/login/    → JSON {access, user}  +  Set-Cookie: cmk_refresh (HttpOnly, SameSite=Strict, Path=/api/v1/auth/)
API calls            → Authorization: Bearer <access>          (access lives in JS memory only)
POST /auth/refresh/  → cookie in, new access out, cookie ROTATED, old refresh BLACKLISTED
POST /auth/logout/   → refresh blacklisted, cookie deleted
```
See `SECURITY_REVIEW.md` for why tokens are stored this way.

### 2.8 AI assistant — `apps/ai_assistant/`
1. `services/analysis.py` finds **duplicate candidates**: open grievances in the same district from the last 90 days, ranked by text similarity.
2. It builds a prompt with the **allowed department and category lists**, the candidates, and the complaint as **JSON data**.
3. `services/gemini.py` calls Gemini with `response_schema=GeminiAnalysis` (Pydantic), so it returns **structured JSON**.
4. The answer is **validated**: the department must exist in the DB, the category must be a valid code, the priority must be LOW/MEDIUM/HIGH, and the duplicate reference must be one of the candidates. Anything invalid is replaced with a safe default.
5. Errors (no key, HTTP 429 rate limit, 5xx, timeout, invalid JSON) become `AIServiceError`. The system then returns a
   **labelled rule-based fallback** (`source: "FALLBACK"`, `ai_available: false`, a "NOT AI" notice).
6. Every call is stored in `AIAnalysisLog`.

The result is **advisory only**. The citizen chooses the category. The AI priority is stored as
`priority_source = AI_SUGGESTED` until the CMO confirms or overrides it. Department assignment is always the CMO's decision.
When a citizen analyses text and then submits it unchanged, the backend **reuses** that logged analysis (matched by user and text hash)
instead of calling Gemini twice.

---

## 3. Frontend structure

```
frontend/src/
├── api/           client.js (axios + token handling) · endpoints.js (every API call)
├── context/       AuthContext · ToastContext · MetaContext (choices + departments)
├── hooks/         useApi (loading/error/race-safe) · useAction (mutations + toasts) · useListParams (URL filters)
├── components/
│   ├── ui/        Button, Form fields, Card/StatCard, Badges, Modal/Confirm/Reason dialogs, Pagination, Feedback states
│   ├── grievance/ GrievanceTable, GrievanceFilters, HistoryTimeline, AttachmentList, RemarksPanel, AIAnalysisPanel, ActionReportCard
│   ├── charts/    Recharts wrappers with a colour-blind-safe palette
│   └── layout/    PublicLayout, DashboardLayout (sidebar items configured per role)
├── pages/         public · auth · citizen · cmo · officer · shared
├── routes/        AppRoutes (lazy-loaded dashboards) · guards (ProtectedRoute, GuestRoute)
└── utils/         schemas (Zod) · errors · format
```

### Reuse instead of duplication
* **One** `DashboardLayout` serves all three roles. Its menu comes from a `NAV[role]` config object.
* **One** `GrievanceTable` serves all three roles. Each page passes a `columns` list.
* `GrievanceFilters`, `HistoryTimeline`, `RemarksPanel`, `AttachmentList`, `ActionReportCard` and `AIAnalysisPanel`
  are shared between the citizen, CMO and officer detail pages.

### Data flow
* `useApi(fetcher, deps)` returns `{data, loading, error, reload}`. Every page renders
  loading, error and empty states through `AsyncBoundary`.
* `useAction()` wraps mutations: shows a pending spinner, a success toast or a readable error toast.
* Filters and page numbers live in the **URL** (`useListParams`). A dashboard card like *Overdue* links
  straight to `/cmo/grievances?overdue=true`, and filtered views survive a refresh.
* Forms use **React Hook Form + Zod**. The Zod schemas copy the backend rules for instant feedback,
  and backend field errors are mapped back onto the matching inputs (`applyFieldErrors`).

### Route guards
`ProtectedRoute roles={[...]}` only improves the experience by redirecting users who can't open a page.
**Security comes from the backend.** A citizen who forces the URL `/cmo` still gets `403` from every CMO API.

---

## 4. Walkthrough: one grievance end to end

| Step | Frontend | Backend |
|---|---|---|
| Citizen analyses text | `SubmitGrievancePage` → `aiApi.analyse` | `AnalyseGrievanceView` → `analyse_grievance` → Gemini |
| Citizen submits | multipart `citizenApi.create` | `CitizenGrievanceViewSet.create` → `validate_upload_list` → `workflow.create_grievance` |
| CMO assigns | `CMOGrievanceDetail` → `AssignForm` | `CMOGrievanceViewSet.assign` → `workflow.assign` |
| Officer starts | `OfficerGrievanceDetail` | `workflow.start_investigation` (department check + transition) |
| Officer reports | `ActionReportForm` | `workflow.submit_action_report` |
| CMO approves | `ReasonDialog` → `cmoApi.reviewReport` | `workflow.review_action_report` → RESOLVED |
| Citizen sees result | `CitizenGrievanceDetail` (resolution card, feedback, reopen) | `CitizenGrievanceDetailSerializer` (public data only) |

`FullWorkflowTests.test_end_to_end_resolution_flow` in `backend/apps/grievances/tests/test_workflow.py`
runs exactly this sequence against the real API.

---

## 5. Likely interview questions

* **Why a service layer?** One place to enforce rules, used by API views, the seed command and tests alike.
* **How do you stop duplicate reference numbers?** A row lock on the per-year counter inside a transaction.
* **How do you stop officers seeing other departments' grievances?** Role-scoped querysets, so the row is never fetched (404). The workflow functions check the department again.
* **What if Gemini is down?** A typed error, a clearly labelled fallback, a logged failure, and the grievance is still accepted.
* **Why can't the AI decide?** The citizen picks the category, the CMO picks the department, and AI priority stays `AI_SUGGESTED` until the CMO confirms it.
* **Why keep the access token in memory?** See `SECURITY_REVIEW.md` §2.
