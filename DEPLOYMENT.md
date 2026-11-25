# Deploying the College Portal on Netlify

This is the production setup for a **website only** — no mobile app and no email service. Student data stays private behind sign-in; only the landing and sign-in pages are public.

## What you need

| Service | Purpose | Typical cost |
| --- | --- | --- |
| [Netlify](https://www.netlify.com/pricing/) | Website hosting, HTTPS, CDN | Pro $20/month (3,000 credits included) |
| [Neon](https://neon.com/pricing) | PostgreSQL database | ~$15–22/month on Launch |
| [Cloudflare R2](https://developers.cloudflare.com/r2/pricing/) | Logo/background/announcement images | $0 up to 10 GB |
| Domain | `.edu.ph` via [PHNET](https://services.ph.net/payment.html) or any `.com` | ₱2,500/year or ~$10–15/year |

Total: roughly **US$35–42/month (~₱2,000–2,400/month)**, plus VAT. If the school already owns a domain, adding `portal.school.edu.ph` costs nothing extra.

## 1. Create the database (Neon)

1. Sign up at Neon and create a project. Choose a region near the school.
2. Copy the **pooled** connection string (`postgresql://...?sslmode=require`).
3. On your computer, from the repo root:

```bash
# PowerShell
$env:DATABASE_URL = "postgresql://user:password@host/db?sslmode=require"
npm run db:pg-init          # creates all tables
npx prisma generate --schema prisma/schema.postgres.prisma
npx tsx prisma/seed.ts      # optional demo data
npm run build               # restores the local SQLite client for development
```

`npm run db:pg-init` runs `prisma/postgres-init.sql`, which is generated from `prisma/schema.prisma` by `scripts/sync-postgres-schema.mjs`. Run `npm run db:pg-sync` after any schema change, then regenerate the init SQL for a fresh database.

## 2. Create photo storage (Cloudflare R2)

1. Cloudflare dashboard → **R2** → **Create bucket** (e.g. `iscp-portal`).
2. **Manage R2 API tokens** → create a token with **Object Read & Write** for that bucket.
3. Note the Account ID, Access Key ID, Secret Access Key, and bucket name.
4. Keep the bucket **private**. Images are served through the app's `/api/media/...` and `/api/branding/...` routes, so no public bucket URL is needed.

The app automatically uses R2 when all four `R2_*` variables are set; otherwise it keeps using the local `uploads/` folder for development.

## 3. Deploy on Netlify

1. **Add new site → Import an existing project** and choose `rhey-oss/iscp-portal`.
2. Netlify reads `netlify.toml`. Build command: `npm run build:netlify`; publish directory: `.next`.
3. Add these environment variables in **Site configuration → Environment variables**:

```text
DATABASE_URL                    = postgresql://... from Neon
SESSION_TTL_DAYS                = 14
LOGIN_MAX_FAILURES              = 5
LOGIN_WINDOW_MINUTES            = 15
NEXT_PUBLIC_ISCP_NAME         = Bontoc National High School
NEXT_PUBLIC_ISCP_SHORT_NAME   = BNHS
NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS  = false
R2_ACCOUNT_ID                   = ...
R2_ACCESS_KEY_ID                = ...
R2_SECRET_ACCESS_KEY            = ...
R2_BUCKET                       = iscp-portal
```

4. Deploy. Netlify's OpenNext adapter handles App Router, Server Actions, middleware, and route handlers automatically.
5. Add your custom domain in **Domain management** and follow the DNS instructions. HTTPS is issued automatically.

## 4. After the first deploy

- Sign in as the administrator and **change every seeded password** immediately.
- Open **College branding** and re-upload the logo/backgrounds if needed (the images were stored locally in development, so they do not carry over to R2).
- Turn rate-limit and billing alerts on in Netlify; the Pro plan includes 3,000 credits, and overage packs are $10 per 1,500 credits.
- Confirm the audit log shows sign-ins, payments, and profile edits with IP addresses.
- Keep Neon backups enabled. The college is the personal-information controller under the Philippines' Data Privacy Act (RA 10173): publish a privacy notice, obtain consent, and have a breach-response contact.

## Local development after deployment

Keep `.env` pointing at SQLite and leave the `R2_*` variables empty. `npm run dev` and `npm run build` continue to use `prisma/schema.prisma` and the local `uploads/` folder, so development and production are isolated.
