# Code Review

A self-review of the codebase against the assignment's evaluation criteria. It records what is solid,
what was found and fixed during development, and what remains open.

**Snapshot:** ≈ 7,500 lines of application code (excluding migrations) · 50 backend tests passing on PostgreSQL ·
frontend production build passing · `oxlint`: 0 errors, 9 style warnings.

---

## 1. Review against the evaluation rubric

| Area (marks) | Assessment | Evidence |
|---|---|---|
| Frontend & UI/UX (10) | Strong | Responsive layouts (table → cards on mobile), loading, empty and error states on every data view, toasts, confirmation dialogs, accessible forms (labels, `aria-invalid`, focus rings, skip link), status shown by icon **and** text |
| Backend engineering (20) | Strong | Service layer, row locking, transactions, state machine, role-scoped selectors, no logic in a single `views.py` |
| Database design (10) | Strong | 11 required entities + reference sequence + AI log; FKs with `PROTECT`; partial unique constraints; CHECK constraints; composite indexes |
| API development (15) | Strong | `/api/v1/` prefix, ViewSets with actions, pagination, filtering, search, ordering, 400/401/403/404/409/429 used deliberately |
| AI implementation (15) | Strong | Real Gemini SDK, structured output schema, validation, duplicate detection, labelled fallback, audit log, mocked failure tests |
| Workflow (15) | Strong | Every mandated status and transition enforced server-side, full history, citizen feedback and reopen |
| Documentation (10) | In progress | This review, code explanation and security review are done. The 7 mandated docs, README and diagrams still need writing |
| Security & testing (5) | Strong | See `SECURITY_REVIEW.md` |

---

## 2. Strengths worth pointing out

1. **Single source of truth for rules.** `workflow.py` is the only code that changes grievance state. The seed command
   uses the same functions, so demo data has genuine history rows.
2. **Fail-closed API.** The default permission is `IsAuthenticated`, every view states its own permission class, and other users' rows return 404.
3. **Concurrency-safe.** Reference generation and all workflow actions lock rows inside transactions.
4. **Honest AI.** The UI and the data always record whether a suggestion came from Gemini, the fallback or seed data.
5. **Shared UI.** One dashboard layout, one table, one filter bar and one timeline serve all three roles.
6. **URL-driven filters.** Dashboard cards link to pre-filtered lists, and views survive reloads and can be shared.
7. **Choice lists defined once.** Districts, categories, statuses and priorities come from `/api/v1/meta/choices/`.

---

## 3. Issues found and fixed during development

| # | Issue | Fix |
|---|---|---|
| 1 | The DB password contained `@`, which breaks `DATABASE_URL` parsing | URL-encoded it in `.env`; documented in `.env.example` |
| 2 | Contact view checked the URL path to skip authentication | Replaced with an `action_map` lookup |
| 3 | The silent-refresh interceptor skipped every `/auth/*` URL, so `/auth/officers/` couldn't recover from an expired token | Explicit list of session endpoints only |
| 4 | The CMO detail page could treat a report response as a grievance and replace page data | Only accept responses containing `history`; otherwise reload |
| 5 | The "All" tab on the reports page sent an invalid filter value | Map `ALL` to no filter |
| 6 | Fallback summary was `"."` when the subject was empty | Join only non-empty parts |
| 7 | The test suite took ~290 s because of PBKDF2 hashing in fixtures | MD5 hasher **for tests only**, guarded by `"test" in sys.argv` |
| 8 | Vite `EBUSY` cache rename errors on Windows | `optimizeDeps.include` pre-bundles all libraries |

---

## 4. Open findings and recommendations

| # | Finding | Severity | Recommendation |
|---|---|---|---|
| 1 | No automated frontend or E2E tests | Medium | Add Vitest + React Testing Library for forms; Playwright for the full workflow |
| 2 | `cmo_stats()` runs one `COUNT` per status and priority (≈ 10 small queries) | Low | Fold into one aggregate; add caching if data grows |
| 3 | Duplicate pre-filter uses `difflib` over at most 200 rows in Python | Low | PostgreSQL `pg_trgm` similarity or embeddings at scale |
| 4 | In-app notifications only (polled every 60 s) | Low | Email or SMS integration; server-sent events |
| 5 | No password reset or change flow | Medium | Django's token-based reset with email |
| 6 | Department-pool assignments let any officer of that department act | Design choice | Add an explicit "claim" step if stricter ownership is needed |
| 7 | 9 lint warnings (fast-refresh exports, `setState` inside effects) | Low | Cosmetic; move shared constants to separate files |
| 8 | Rate limiting uses the in-memory cache | Medium | Redis in production (see Security Review §8) |
| 9 | Render free tier sleeps after inactivity (first request ≈ 50 s) | Operational | Mention in README; consider a paid instance for the demo window |
| 10 | Vercel external rewrites have request size and timeout limits | Operational | Uploads capped at 4 MB per file to stay within limits; verify after deploy |

---

## 5. Test coverage summary

| Suite | Tests | Covers |
|---|---|---|
| `accounts/tests/test_auth.py` | 15 | registration validation, role forcing, hashing, login, enumeration, cookie flags, refresh rotation, blacklist, logout |
| `grievances/tests/test_workflow.py` | 21 | creation, reference format and sequence, validation, file checks, isolation, public tracking, full E2E flow, reject path, invalid transitions, officer restrictions, CMO-only approval, escalation and triage, remark visibility, attachment authorisation, immutable history, stats |
| `ai_assistant/tests/test_ai.py` | 10 | auth and role, input validation, successful analysis, sanitising invalid model output, 429 fallback, missing key, rate limit, invalid JSON, network failure |
| `contact/tests/test_contact.py` | 4 | public submit, validation, CMO-only listing, public endpoints |

Run with:
```bash
cd backend
venv\Scripts\python manage.py test apps        # Windows
./venv/bin/python manage.py test apps          # macOS/Linux
```
