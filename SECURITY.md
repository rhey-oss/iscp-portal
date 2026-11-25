# Security audit & hardening

Scope: full source review of `iscp-portal` on 24 Nov 2026, followed by fixes.
This document is the compact "scan first, then execute" brief used for the work.

## Findings and fixes

| Area | Finding (before) | Fix |
| --- | --- | --- |
| Sign-in | Unlimited password attempts; no lockout | DB-backed `LoginAttempt` throttling (5 failures / 15 min per email, 4× for an IP), old rows pruned. Env-configurable. |
| Sign-in | Account enumeration via response timing | Unknown emails are checked against a fixed dummy bcrypt hash. |
| Passwords | Shared default passwords, `mustChangePassword` never enforced | Password strength policy; random one-time temp passwords from admin flows; forced `/account/password` before any role workspace opens; self-service change page rotates sessions. |
| Sessions | Unlimited concurrent sessions, no cleanup | Expired rows pruned on sign-in, max 5 sessions/account, all revoked on password change/reset/deactivation. |
| Attendance | Any teacher could open/close/mark any class session | `canManageClass` / `findManageableSession` on every mutation; status enum validated; student must belong to the session's class; closed sessions are immutable. PINs no longer audited in plaintext. |
| Check-in | Unassigned students could try any session; same PIN in other class could block valid check-in | Class is required and sessions are queried with `classId`. |
| Grades/tasks | Any teacher could edit any grade/task | `canManageSubject` for grades, `canManageClass` for tasks/assignments; teacher UI no longer falls back to all classes. |
| Announcements | Teachers could re-target their post to another class/school; any teacher could delete another post's photo | Audience/class revalidated on update; ownership checks on archive and media removal; orphan files deleted; audience/status/category enums validated. |
| Media | Any signed-in user could fetch any media ID | Announcement images are visible only from announcements the user can see; other uploads are uploader-only. Student profile photos were removed entirely to reduce stored personal data. `no-store` + `Vary: Cookie`. |
| QR codes | Any signed-in user could mint any badge/session QR | Session QR restricted to staff who manage the class; student QR restricted to staff, the student, or a linked parent. |
| Accounts | Deleting a student left an active login; parent links unvalidated | Linked student account deleted on student delete / email removal; parent links require a real PARENT account. |
| App | Demo admin credentials on public login page | Hidden unless `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS=true`; seeded locally for evaluation only. |
| HTTP | No security headers; searchable portal; no error pages | CSP, HSTS, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP, `poweredByHeader: false`, `robots` disallow, 404/error screens. |
| Uploads | 5 MB images exceeded the default Server Action body limit | `experimental.serverActions.bodySizeLimit = 8mb`; gallery capped per announcement. |

## Cashier controls

Cashiers have a separate login and appear in the Staff directory. They can post, void, and refund payments across the school but cannot delete fee definitions, which remain admin/principal-only. Every payment stores the payment method, official receipt reference, status, and the person who recorded it; reversals keep the original entry as `VOID` or `REFUNDED` rather than deleting it. Collection totals and reports exclude voided and refunded entries. Admin and principal accounts have full cashier access.

## Directory privacy

The school calendar shows only dated announcements the viewer is already allowed to see, and the Help page publishes only school contact details set by the administration. The school directory hides email and phone numbers from students/parents unless the row is their own account. Only the account owner or an administrator/principal may edit a profile. Rank/role assignment is administrator-only, and changing a role or disabling an account immediately revokes that user's sessions.

## Branding images

Images selected on the School Branding page (logo, sign-in background, dashboard background) are served through a dedicated public route so the sign-in page can show them before a user logs in. Only the three media IDs stored in the `Branding` record can be served this way; all other uploads remain behind the authenticated media route. Do not put student photos or private documents in branding images.

## Operational checklist before production

1. Set `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS=false` and remove/reseed demo accounts.
2. Use Postgres (change `prisma/schema.prisma` datasource), run `prisma migrate deploy`.
3. Set `SESSION_TTL_DAYS` to the shortest workable value; terminate TLS at the platform (HSTS header is set).
4. Move `uploads/` to object storage — local disk is ephemeral on serverless hosts.
5. Change the seeded demo passwords and have every account complete the forced password change.
6. Run `npm run verify` (typecheck, lint, build) after each change and commit the result.

## Known limitations

- Local SQLite has no row-level encryption; use a managed DB with encryption at rest for real student data.
- Throttling uses the database and counts failed attempts inside a time window; it is not a CAPTCHA service.
- File uploads accept JPG/PNG/GIF only, with magic-byte checks and a 5 MB per-image cap.
- `npm audit` flags four advisories in Prisma 6's **dev-only CLI** dependency chain (`deepmerge-ts`, `effect`). They are not in the runtime app; fixing them requires the breaking Prisma 7 migration.
