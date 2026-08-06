# Disaster Recovery & Business Continuity Runbook
**Akuapem Community Bank PLC — Cheque Management System**

_Owner: IT / Operations. Review quarterly. Last updated: 2026-08-06._

## 1. System overview
- **App:** single Node.js serverless function on **Vercel** (project `akuapem-cheque-management-system`). Serves the API and static UI from one function.
- **Database:** **Supabase** Postgres (project ref `sjcnnbdpiqzwsrzmirvi`, region eu-north-1), reached via the transaction pooler (`DATABASE_URL`, port 6543).
- **Data of record:**
  - `app_state` — operational data (one JSONB row, id=1, with a `version` column for optimistic concurrency).
  - `business_audit` — append-only, immutable business audit trail.
  - `customers` — customer/account extract (~47k rows), `credentials`, `config`, `system_log`, `password_reset`.
- **Source of truth for fees/GL:** the core banking application. This system holds a parallel fee record reconciled to the GL **monthly** (Reports ▸ Fees & Income ▸ month filter).

## 2. Targets
| Metric | Target |
|---|---|
| RPO (max data loss) | ≤ 24h from daily backup; ≤ 5 min with Supabase PITR (if enabled) |
| RTO (time to restore) | ≤ 2 hours |

> **Action:** confirm Supabase **Point-In-Time-Recovery** is enabled on the plan; without PITR, RPO is the last daily backup.

## 3. Backups
- **Database:** Supabase automated daily backups (+ PITR if enabled). Verify in Supabase dashboard → Database → Backups.
- **Weekly off-platform export (recommended):** `pg_dump "$DATABASE_URL" > acb-YYYYMMDD.sql` stored in the bank's secure, access-controlled store. This protects against provider-side loss.
- **Code:** GitHub repo `klartey/akuapem-cheque-management-system` (branch `main`); Vercel keeps prior deployments for instant rollback.
- **Monthly customer import files:** retain each monthly CSV extract securely — they can rebuild the `customers` table.

## 4. Restore procedures
### 4a. Application rollback (bad deploy)
1. Vercel dashboard → Deployments → pick the last-good deployment → **Promote to Production** (instant).
2. Or `git revert <sha> && git push` to roll forward a fix.

### 4b. Database restore (data loss/corruption)
1. Put the app in maintenance (Vercel → pause, or set a maintenance flag) to stop writes.
2. Supabase dashboard → Database → Backups → **Restore** the chosen point (PITR timestamp or daily snapshot).
3. If restoring from `pg_dump`: provision/clear the target DB, `psql "$DATABASE_URL" < acb-YYYYMMDD.sql`.
4. Verify `select version from app_state where id=1;` and row counts in `customers`, `business_audit`, `system_log`.
5. Resume the app; run the smoke tests (§6) against production read-only checks.

### 4c. Full rebuild (new Supabase project)
1. Create a new Supabase project; the app auto-creates the schema on first boot (`db.js`).
2. Set env vars (§5) on Vercel pointing to the new DB; redeploy.
3. Re-import the latest monthly customer CSV (Administration ▸ Customer Database).
4. Restore `app_state` / `business_audit` from the latest dump if available.

## 5. Required environment variables (Vercel)
`DATABASE_URL` (Supabase pooler, :6543) · `SESSION_SECRET` · `SECURE_COOKIES=1` · `ADMIN_PASSWORD` (initial seed only).
Missing any DB var → `FUNCTION_INVOCATION_FAILED`.

## 6. Verification after any restore
- `npm test` (smoke suite: auth boundary, four-eyes, session) against a staging copy.
- Manually: sign in, open Dashboard, raise a test requisition in a test branch, confirm the audit event appears in Reports ▸ Audit Trail, then reverse/ignore the test record.

## 7. Known resilience risks (tracked)
- **Single `app_state` row:** operational data is one JSONB document. A corrupt write has a wide blast radius. Optimistic concurrency now prevents silent overwrites; **full table normalisation is the planned next engineering track** to reduce blast radius and enable per-record recovery.
- **Serverless statelessness:** no server-side session store; revocation is via the per-user session epoch (bumped on disable/reset) and the 3-minute idle + 12-hour absolute caps.

## 8. Contacts (fill in)
- IT lead: ____   · Supabase owner: ____   · Vercel owner: ____   · Software maintainer (Gyekestone): ____
