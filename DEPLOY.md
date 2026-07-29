# Deploying to Vercel + Supabase

The app stores all state in Postgres (via `db.js`), serves the client from `public/`, and runs its
API as a single serverless function (`api/[...path].js`). It runs unchanged on a persistent host too
(Render/Railway) — there it uses an embedded PGlite database unless `DATABASE_URL` is set.

## 1. Supabase (the database)

1. Create a project at [supabase.com](https://supabase.com) (region closest to Ghana; strong DB password).
2. **Settings → Database → Connection string → "Connection pooling" → Transaction mode** (port `6543`).
   Copy that URI — this is your `DATABASE_URL`. It looks like:
   `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres`

There is **no SQL to run** — the schema (`app_state`, `credentials`, `config`, `customers`) is created
automatically on first request, and `pg_trgm` is enabled if permitted (search still works without it).

## 2. Vercel (hosting)

1. Import the GitHub repo `klartey/akuapem-cheque-management-system`. Framework preset: **Other**
   (no build step — Vercel serves `public/` statically and runs `api/`). Deploy the branch that
   contains this migration (or merge it to `main` first).
2. Add **Environment Variables**:

   | Variable | Value | Why |
   | --- | --- | --- |
   | `DATABASE_URL` | the Supabase **pooled** URI from step 1 | app's database connection |
   | `SESSION_SECRET` | a long random string (e.g. `openssl rand -hex 32`) | signs session cookies; must be stable across deploys |
   | `SECURE_COOKIES` | `1` | marks the session cookie `Secure` (HTTPS only) |
   | `ADMIN_PASSWORD` | a strong password you choose | initial password for `admin@acb.com` |

3. Deploy. On first load the schema is created and staff accounts are seeded.

## 3. First sign-in & data

- Sign in as **`admin@acb.com`** with the `ADMIN_PASSWORD` you set.
- Create your real staff in **Administration → Users** (each gets a one-time password shown to the
  authorising admin). The four other seeded demo accounts get random passwords printed once to the
  function logs — on serverless those are awkward to retrieve, so prefer creating real users.
- Load the customer base in **Administration → Customer Database** (upload the monthly CSV export).
- Set the SMS gateway in **Administration → SMS Gateway** (Arkesel Sender ID + API key).
- Put your logo file at **`public/logo.png`** to replace the built-in emblem.

## Notes & limits

- **Pooled connection**: always use the transaction-mode pooler URL (port 6543) on serverless.
- **Large initial import**: the ~47k-row first import runs as batched upserts. `maxDuration` is set to
  60s (Vercel **Pro**). On the **Hobby** plan (10s function cap) the first big import may time out —
  either run it once from a Render instance pointed at the same `DATABASE_URL`, split the CSV, or
  upgrade. Monthly delta imports are small and fine on any plan.
- **Persistent host alternative**: the same code deploys to Render/Railway with `DATABASE_URL` set to
  Supabase — no serverless time limits, so the big import always works there.
