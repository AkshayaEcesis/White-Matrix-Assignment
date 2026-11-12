# Security Review

Scope: the full stack (React SPA, Django REST API, PostgreSQL, Gemini integration, deployment config).
This is a **self-assessment** by the developer. It is not an independent penetration test.

---

## 1. Threat model (what we protect, from whom)

| Asset | Threat | Primary control |
|---|---|---|
| Citizen personal data (name, email, mobile, complaint text) | Other citizens, anonymous visitors, officers of other departments | Role permissions + role-scoped querysets (404 on foreign rows) |
| Workflow integrity (who resolved what) | Officers resolving their own cases; tampering with history | Server-side state machine; CMO-only approval; immutable history |
| Sessions | XSS token theft, CSRF, replayed refresh tokens | Access token in memory, HttpOnly SameSite=Strict refresh cookie, rotation + blacklist |
| Uploaded files | Malware or polyglot upload, path traversal, direct file access | Allow-list + magic bytes + Pillow verify; random names; authorised streaming endpoint |
| AI key and output | Key leakage; prompt injection; hallucinated values | Server-only key; prompt treats text as data; schema and value validation |
| Availability | Brute force, spam, AI quota exhaustion | Scoped rate limits (login, register, AI, contact, track) |

---

## 2. Authentication and session handling

| Control | Implementation | Location |
|---|---|---|
| Password hashing | Django PBKDF2-SHA256 (default hasher) | `accounts/models.py` (`set_password`) |
| Password policy | Django validators (min 8, common, numeric, similarity) + frontend Zod rule (upper/lower/digit/symbol) | `settings.py`, `utils/schemas.js` |
| Account enumeration | Same message for unknown email, wrong password and inactive account | `LoginSerializer` |
| Short-lived access token | 15 min, sent as `Authorization: Bearer`, kept **only in JS memory** | `api/client.js` |
| Refresh token | **HttpOnly**, `SameSite=Strict`, `Secure` in production, `Path=/api/v1/auth/` | `accounts/tokens.py` |
| Rotation and revocation | `ROTATE_REFRESH_TOKENS` + `BLACKLIST_AFTER_ROTATION`; logout blacklists | `settings.SIMPLE_JWT`, `LogoutView` |
| CSRF on cookie endpoints | `SameSite=Strict` **plus** a required `X-Requested-With` header (forces a CORS pre-flight cross-origin) | `_require_ajax_header` |
| Fresh role checks | The JWT `role` claim is informational. The user is reloaded from the DB on every request, so deactivation and role changes apply at once | `JWTAuthentication` |
| Privileged accounts | No self-service creation of CMO or officer accounts; registration forces `CITIZEN` | `RegisterSerializer.create` |

**Why not `localStorage`?** Any XSS can read `localStorage`. With this design, an XSS bug could
make requests while the tab is open, but could not steal a long-lived credential: the refresh token is HttpOnly,
and the access token expires within 15 minutes and is never persisted.

**Why does `SameSite=Strict` work across Vercel and Render?** The browser never talks to Render directly.
`/api/*` is proxied by Vite locally and by Vercel rewrites in production, so the cookie is **first-party**.
This also avoids third-party-cookie blocking in Safari and Firefox.

---

## 3. Authorisation

* **Every** endpoint has an explicit permission class (`IsCitizen`, `IsCMOAdmin`, `IsOfficer`, `IsAuthenticated` or
  `AllowAny` for the public pages). The default is `IsAuthenticated`, so a forgotten endpoint fails closed.
* **Object level:** querysets are scoped per role (`services/selectors.py`), so foreign objects return 404, not 403.
* **Officer isolation** is checked twice: in the queryset (department plus own or pool assignment) and again in
  `workflow._require_officer_access` before any state change.
* **Separation of duties:** only `review_action_report` (CMO) can move a grievance to RESOLVED.
* **Frontend guards are not trusted.** Tests call CMO and officer endpoints with citizen tokens and expect 403.

---

## 4. Input, files and output

| Area | Control |
|---|---|
| Validation | DRF serializers with length limits and choice validation on every input; mirrored by Zod on the client |
| Files | Extension allow-list (jpg/jpeg/png/pdf) · max 4 MB each · max 3 per upload · **magic-byte signature check** · `Pillow.verify()` for images · decompression-bomb pixel limit |
| Storage | Files renamed to `attachments/YYYY/MM/<uuid>.<ext>`, so user filenames never reach the filesystem |
| File access | No public media URLs. `GET /attachments/<id>/download/` checks the role-scoped queryset and returns `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store` |
| Request limits | `DATA_UPLOAD_MAX_NUMBER_FILES=5`; in-memory upload limit 2 MB (larger files stream to temp files) |
| SQL injection | Django ORM only; no raw SQL |
| XSS | React escapes output; no `dangerouslySetInnerHTML`; CSP `script-src 'self'` on Vercel |
| Public tracking | Shows only status, department, category, district and timeline: **no names, contact details, description or remarks** |
| Citizen view | Internal remarks and internal history are excluded; staff appear by role, not by name |

---

## 5. AI-specific safeguards

* The API key is read from the server environment only and never sent to the browser (`settings.GEMINI_API_KEY`).
* **Prompt injection:** the complaint is passed as a JSON-encoded data block, and the system instruction tells the model to ignore instructions inside it.
* **Output validation:** the Pydantic schema plus a check of every value against the DB (an unknown department becomes `null`, an unknown category becomes `OTHER`, an invalid priority becomes `MEDIUM`).
* **Privacy:** citizens never see other citizens' grievance references from duplicate detection. Only the CMO sees the matched reference.
* **Honesty:** failures are never presented as AI output (`source: FALLBACK`, visible amber warning, logged in `AIAnalysisLog`).
* **Rate limiting:** `ai` scope at 10 requests/min per user protects the free-tier quota.

---

## 6. Transport, headers and configuration

* `DEBUG=False` in production: HTTPS redirect, HSTS (30 days), secure cookies, `X-Frame-Options: DENY`, nosniff, `Referrer-Policy: same-origin`.
* Vercel adds CSP, HSTS, `Permissions-Policy`, `X-Frame-Options` and nosniff (`frontend/vercel.json`).
* The app refuses to start without `DJANGO_SECRET_KEY` when `DEBUG=False`, and `DATABASE_URL` is required.
* No secrets in the repository: `.env` files are git-ignored and `.env.example` holds placeholders only.
* CORS is restricted to an explicit allow-list and to `/api/*` only.
* The admin URL can be moved with `DJANGO_ADMIN_URL`.
* `python manage.py check --deploy`: one remaining warning (`SECURE_HSTS_PRELOAD`), intentionally not enabled for a temporary demo domain.

---

## 7. Security test evidence

Automated tests (`python manage.py test apps`, **50 tests, all passing on PostgreSQL**) include:

| Test | Proves |
|---|---|
| `test_cannot_self_register_as_admin` | role escalation via registration is blocked |
| `test_register_creates_citizen_with_hashed_password_and_logs_in` | hashing; refresh token never in the JSON body; HttpOnly cookie |
| `test_login_unknown_user_same_message` | no account enumeration |
| `test_refresh_requires_ajax_header` | CSRF defence on cookie endpoints |
| `test_refresh_rotates_and_blacklists_old_token` | replaying an old refresh token fails |
| `test_logout_blacklists_refresh_and_clears_cookie` | logout really revokes the session |
| `test_citizen_cannot_access_admin_endpoints` | 403 on CMO, officer and enquiry APIs |
| `test_officer_of_other_department_cannot_access` | 404 for other departments, empty list |
| `test_officer_cannot_approve_reports_or_use_cmo_endpoints` | separation of duties |
| `test_citizen_cannot_see_other_citizens_grievance` | object-level isolation |
| `test_attachment_download_is_authorised` | file access follows grievance access |
| `test_rejects_disallowed_file_type`, `test_rejects_spoofed_extension` | upload validation |
| `test_public_tracking_exposes_no_personal_data` | no PII on the public endpoint |
| `test_internal_remarks_hidden_from_citizen` | remark visibility |
| `test_history_records_are_immutable` | audit trail cannot be edited or deleted |
| AI tests | missing key, 429, invalid JSON and network failure produce a labelled fallback; invalid values sanitised |

---

## 8. Residual risks and recommended next steps

| # | Risk | Severity | Recommendation |
|---|---|---|---|
| 1 | Rate-limit counters use per-process memory, so limits are per worker and reset on restart | Medium | Use Redis as the cache backend |
| 2 | Throttle client IP comes from `X-Forwarded-For`, which a client can spoof | Medium | Set `NUM_PROXIES` to match the real proxy chain |
| 3 | Reference numbers are sequential, so the public tracker can be enumerated | Low | Already minimal data + 30/min throttle; could add mobile-number verification for tracking |
| 4 | No MFA for CMO and officer accounts | Medium | Add TOTP for staff roles |
| 5 | No account lockout beyond rate limiting | Low | Lock or slow down after N failures per account |
| 6 | Uploaded files are not virus-scanned | Medium | Add ClamAV or a cloud scanning hook before storage |
| 7 | Demo accounts share a published password | Accepted | Required for evaluation; set a custom `DEMO_PASSWORD`; never reuse in real use |
| 8 | No email or SMS verification of citizen contact details | Low | Add OTP verification |

---

## 9. Security scorecard (self-assessment)

| Category | Score | Notes |
|---|---|---|
| Authentication and session management | 9 / 10 | HttpOnly rotating refresh, in-memory access token, blacklist; no MFA |
| Authorisation (RBAC + object level) | 10 / 10 | Fail-closed defaults, scoped querysets, separation of duties, tested |
| Input validation and file handling | 9 / 10 | Magic bytes, size and count limits, authorised downloads; no AV scan |
| Data protection and privacy | 9 / 10 | Minimal public data, internal/public split, no PII in AI prompt output to citizens |
| Secrets and configuration | 9 / 10 | Env-only secrets, fail-fast settings, deploy check clean except HSTS preload |
| AI safety | 9 / 10 | Server-only key, injection-resistant prompt, validated output, honest fallback |
| Abuse protection | 7 / 10 | Scoped throttles present; in-memory and IP-based limitations |
| Auditability | 10 / 10 | Immutable history with actor and timestamp, AI call log |
| Security testing | 8 / 10 | 50 automated API tests incl. negative and permission tests; no automated frontend/E2E tests |
| **Overall** | **80 / 90 (≈ 89%)** | |

Against the assignment's **"Security and testing – 5 marks"** criterion, the developer's self-estimate is **4.5 / 5**.
The missing half-mark reflects the lack of automated frontend/E2E tests and the in-memory rate limiting.
