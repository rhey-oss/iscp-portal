# ISCP Portal

A tongue-in-cheek college management portal built with Next.js for the **International State College of the Philippines** (ISCP) — the satirical "most prestigious college in the universe" and home of the Blue Aspins. Instructors take attendance with a QR code or PIN, record grades, and assign tasks; students and parents see the results; the dean and administrator get university-wide visibility.

> Motto: *Filipinos Stultus Es Satura* · Hymn: "Sun and Moon" by Anees · Mascot: the Blue Aspins

**Status:** Feature-complete for core college operations — every role has working, writable screens.

## Features

- **Six roles:** admin, dean, instructor, cashier, student, parent — each with its own dashboard, navigation, and server-enforced permissions.
- **Courses catalogue:** the official ISCP course offerings at `/courses`, grouped by campus (Main, Moon, Sun, Atlantis, Galactic, Birmingham, Minecraft, ROBLOX) — including BS in Pokemon Science (Major in Pokemon Training), BS in Tech Support (Major in Sarcasm), BA in Streaming (Major in Barking), BS in Pyrotechnics, BA in Manga, and many more.
- **Secure auth:** bcrypt password hashing, revocable database-backed sessions, HttpOnly cookies, role guards on every layout, and an optimistic `proxy.ts` gate.
- **Attendance:** instructors start PIN/QR sessions, display a scannable QR, scan student ID badges with the device camera (with manual fallback), mark the roster, mark all present/absentees, and close sessions. Students check in by PIN or QR at `/check-in`. Parents are notified on arrival, lateness, or absence.
- **Grades:** instructor grade book with per-student scores, remarks, and published/draft control; students see published grades and general average.
- **Tasks:** instructors create tasks for a class, set per-student statuses (pending, submitted, graded, missing, needed), scores, and notes; students mark their work submitted.
- **Announcements:** composer with cover image, photo gallery, audience targeting (college/class/role), scheduling, expiry, priority, pinning, and read acknowledgements.
- **Tuition:** semester fees posted only by the administrator/dean; advisers and instructors post other payments for their own classes or students; students and parents see assessed amounts, paid amounts, balances, and payment references. Staff record or reverse payments from each student's ledger.
- **Cashier desk:** a dedicated cashier role with its own login and directory entry. Cashiers record cash/check/bank/GCash payments, keep official receipt numbers, view all collections and balances, void or refund entries, and run daily/monthly collection reports by method and cashier. Admin and dean also have full cashier access.
- **Directory:** a searchable college directory for every role, with Instructor/Student/Staff/Parent tabs, section and year-level filters, and role-aware profile editing (individuals edit themselves; administrators/deans manage ranks and college details).
- **College branding:** administrators and the dean can edit the college name, short name, tagline, logo, sign-in background, dashboard background, and contact details from one page; changes appear across the whole website immediately.
- **Academic calendar & help:** dated announcements appear on a calendar for every role, and a Help & FAQ page explains attendance, grades, tuition, privacy, and how to contact the college.
- **Staff directory:** the admin can add staff accounts with employee numbers and departments, then manage ranks and college details from the Directory profile pages.
- **Admin:** create/edit/delete students, classes, subjects, and accounts; link parents to children; reset passwords; disable accounts; edit settings; review the audit log.
- **CSV upload:** bulk-import students with a downloadable template and a per-row error report.
- **Media:** announcement images and college branding photos are validated and served through dedicated routes; student profile photos are not used, keeping storage minimal.
- **Notifications inbox:** mark one/all as read, delete, and jump to related records.
- **Responsive UI:** light/dark theme toggle, six colour themes, accessible labels, mobile navigation, and action buttons throughout.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| UI | Tailwind CSS v4, lucide-react |
| Database | SQLite locally via Prisma 6 (Postgres-ready) |
| Auth | Custom database sessions (`bcryptjs`) |
| Validation | Zod |

## Getting started

Requirements: Node.js 20.9+ and npm.

```bash
npm install
cp .env.example .env          # Windows: Copy-Item .env.example .env
npm run db:migrate            # create prisma/dev.db and apply migrations
npm run db:seed               # load demo college data
npm run dev                   # http://localhost:3000
```

### Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@iscp.edu.ph` | `Admin@12345` |
| Dean | `dean@iscp.edu.ph` | `Dean@12345` |
| Instructor | `instructor@iscp.edu.ph` | `Instructor@12345` |
| Cashier | `cashier@iscp.edu.ph` | `Cashier@12345` |
| Student | `student@iscp.edu.ph` | `Student@12345` |
| Parent | `parent@iscp.edu.ph` | `Parent@12345` |

The credentials panel is hidden by default in production. It is shown locally only when `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS="true"`. All seeded accounts can sign in with the passwords above; newly created/reset accounts must choose a new password at first sign-in.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Generate Prisma client and build for production |
| `npm start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run verify` | Typecheck + lint + production build |
| `npm run db:migrate` | Create/apply a migration in development |
| `npm run db:seed` | Load demo data |
| `npm run db:reset` | Drop, migrate, and re-seed |
| `npm run db:studio` | Open Prisma Studio |

## Project structure

```
prisma/
  schema.prisma        # full data model (users, students, attendance, grades, tasks, announcements, media, audit)
  seed.ts              # idempotent demo college
src/
  app/
    (public) /         # landing page
    login/             # sign-in
    admin/ principal/ teacher/ cashier/ student/ parent/   # role dashboards
    courses/           # ISCP course catalogue by campus (meme-specific)
    announcements/     # audience-filtered announcements
  components/          # app shell, nav, UI primitives
  lib/                 # auth, prisma client, validators, helpers
  proxy.ts             # request gate for protected routes
```

## Security notes

See [SECURITY.md](./SECURITY.md) for the full audit and hardening details.

- Passwords are hashed with bcrypt (cost 12) and must meet a strength policy; session tokens are random 32-byte values stored **hashed** (SHA-256), capped at five devices per account, and revoked on password change.
- Sign-in failures are throttled per email and per IP (configurable in `.env`); unknown and inactive emails take the same time as real ones.
- `proxy.ts` provides a fast cookie check, but **every layout re-verifies the session and role on the server**, and every mutation checks class/subject ownership (`src/lib/access.ts`).
- Student/parent data scoping is enforced in queries and media/QR routes (students see only themselves; parents only linked children).
- Tuition writes are role-gated: tuition fees are admin/principal-only, other payments and payment records require class/subject scope, and students/parents have read-only views.
- Security headers, CSP, `noindex`, and an audit trail with IP addresses are enabled. Session PINs are deliberately **not** written to the audit log.

## Roadmap

1. Email/SMS/push notification channels, quiet hours, and a daily digest.
2. Weighted grading, report-card PDFs, and principal approval of published grades.
3. File submissions for tasks and teacher feedback attachments.
4. Automated absence alerts at the configured cutoff time (currently triggered by the teacher's session actions).
5. Printable student ID badges with QR codes.
6. Scheduled database backups, PWA install support, and an English/Filipino language toggle.

## Deploying

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the Netlify + Neon + Cloudflare R2 production setup and cost breakdown.

Local development uses SQLite. For deployment, move the datasource to a free Postgres instance (Neon or Supabase), set `DATABASE_URL`, run `prisma migrate deploy`, and host on Vercel. Announcement and branding images should move to object storage (Cloudflare R2 or similar) rather than local disk, which is ephemeral on serverless hosts. Student profile photos are intentionally not stored.

## Notes

- Prisma 6 is pinned intentionally for stable SQLite migrations.
- `npm audit` reports advisories in Prisma's dev-only CLI dependencies; they do not affect the runtime application.
