# Akuapem Cheque Management System

A local demonstration application for managing cheque books across Nsawam, Koforidua, Aburi, Adukrom, Mamfe and Madina branches.

## Run locally

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000). The server creates `data/records.json` the first time it runs, which holds the demo transactions and audit events.

## Deploy

This is a stateful, long-running Node process with a file-backed store and in-process sessions. It must run on a host that keeps **one persistent process** so state (sessions, maker-checker queues, admin approvals) is shared across users — deploy it to Render, Railway, or Fly.io, **not** a serverless platform.

**Render (blueprint included):** New + → Blueprint → connect this repo. Render reads `render.yaml` and runs `node server.js`.

**Railway / Fly / Heroku-style:** the included `Procfile` (`web: node server.js`) and the `start` script are enough; point the platform at this repo.

The server honours these environment variables:

| Var | Purpose |
| --- | --- |
| `PORT` | Port to listen on (set automatically by the host). |
| `SECURE_COOKIES` | Set to `1` in production so the session cookie is flagged `Secure` (HTTPS only). |
| `DATA_DIR` | Directory for `records.json` / `users.json`. Point it at a mounted disk for durable data. |

**Durability:** on a free/ephemeral filesystem the data reseeds on every restart. For persistent data, attach a disk and set `DATA_DIR` to its mount path (the `render.yaml` shows the disk block to uncomment on a paid plan).

## Included workflows

- Role-aware, branch-scoped dashboard and module access
- Cheque-book requests, inventory ranges, issuance, verification, stop/cancel, and returns
- Maker-checker submission and authorisation flow
- Automated customer alerts (ready-for-collection and stock-arrival), logged for delivery
- Itemised vault: per-customer cheques with a linked phone number, sending a real **Arkesel SMS** on branch receipt

## SMS / customer alerts (Arkesel)

Cheque book requests now capture the customer's **phone number**. Head office can dispatch **itemised** cheques to a branch vault (each linked to a requisition and its phone). When a branch **receives** an itemised cheque (Vault & Reconciliation → Itemised customer cheques → *Receive & notify*), the system sends that customer an SMS that their cheque book is ready for collection, and records the delivery status in Customer Alerts.

Configure the gateway in **Administration → SMS Gateway** (requires the `admin.manage` permission): paste your Arkesel **Sender ID** (registered) and **API key**, tick *Enable live SMS sending*, and use *Send test SMS* to verify. The key is stored server-side in `data/sms.json` (git-ignored), is never returned to the browser in full, and requires a registered Sender ID plus customer consent to use in production. Bulk vault stock dispatch is unchanged and still available.
- Reports, user administration, and full audit trail

## Security posture

OWASP-aligned controls implemented in this prototype:

- **Static file allow-list** — only `index.html`, `app.js` and `styles.css` are served. Source files and `data/records.json` are never exposed (prevents sensitive-data and source disclosure).
- **Security response headers** on every response — a restrictive `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, and cross-origin isolation headers.
- **Request hardening** — JSON body size capped (32 KB) to resist resource-exhaustion, and a lightweight per-IP rate limit on `/api/*`.
- **Password authentication** — sign-in verifies a staff ID and password against a server-side user store; passwords are stored only as per-user salted **scrypt** hashes and checked with a constant-time comparison. The store is seeded on first run into `data/users.json` (git-ignored) and never served to the browser. Each account gets a **unique random initial password** (printed once to the server log), staff **change their own password** in-app, admin-created users receive a **one-time password shown only to the authorising administrator**, and repeated failed sign-ins trigger a temporary **account lockout**.
- **Server-side sessions** — a successful sign-in mints a random session id stored server-side and returned in an `HttpOnly`, `SameSite=Strict` cookie. Every API request derives the caller's role and branch **from the session, not from the request body**, so identity can no longer be spoofed per-request, and the `SameSite=Strict` cookie mitigates CSRF.
- **Maker–checker on vault acceptance** — moving cheque stock from the vault into inventory takes two officers: one reconciles the hard copies and submits, a **different** officer with approval rights authorises. The submitting officer is blocked from authorising their own batch (separation of duties), enforced server-side.
- **Configurable RBAC governance (Administration module)** — authorisation is derived from a permission catalogue → roles (permission bundles) → groups → users, all held in the store and resolved per request (so disabling a user or changing a role takes effect immediately and ends live sessions). Administrators manage users, roles, groups and a **segregation-of-duties matrix** enforced both statically (a grant that would give a user two mutually-exclusive permissions is blocked) and dynamically (per-transaction maker ≠ checker). Every **privilege grant is itself four-eyes** — submitted by one administrator and authorised by another, with self-approval and self-targeting blocked; revocations apply immediately. Access is periodically re-attested (recertification), and every governance action is written to an immutable admin audit log.
- **Server-side authorisation and data scoping** — every write validates required fields and enforces role/branch scope from the session, and `GET /api/state` (plus every write response) returns **only the branch's own data** for non-global roles. The UI never receives other branches' records.

## Accounts & initial passwords

Five staff accounts are seeded on first run, one per role:

| Staff ID | Role | Branch |
| --- | --- | --- |
| `admin@acb.com` | System Admin | All branches |
| `headoffice@acb.com` | Head-Office Users | All branches |
| `manager.koforidua@acb.com` | Branch Manager | Koforidua |
| `ops.nsawam@acb.com` | Branch Operations | Nsawam |
| `cs.nsawam@acb.com` | Customer Service | Nsawam |

There is **no shared password**. On first boot the server prints each account's **unique random initial password once** to its log (on Render, read them from the deploy logs). Set `ADMIN_PASSWORD` to choose the System Admin's initial password deterministically. Everyone should change their password after first sign-in (🔑 in the top bar).

To see the vault maker–checker flow: sign in as `ops.nsawam@acb.com`, reconcile and submit a Nsawam batch, then sign in as `headoffice@acb.com` (a different officer) to authorise it.

## Branding

The in-app mark is a **placeholder emblem** (inline SVG in `app.js` as `LOGO`, plus the favicon in `index.html`). Replace both with the official Akuapem Community Bank logo asset before going live.

## Important

This is a functional demonstration application, not a production banking system. Before production deployment, integrate with an enterprise IdP/MFA, and add a hardened database, encryption and key management, TLS/HSTS at the edge, monitoring, formal security testing, and integration with the bank’s core banking platform.
