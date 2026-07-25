# Akuapem Cheque Management System

A local demonstration application for managing cheque books across Nsawam, Koforidua, Aburi, Adukrom, Mamfe and Madina branches.

## Run locally

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000). The server creates `data/records.json` the first time it runs, which holds the demo transactions and audit events.

## Included workflows

- Role-aware, branch-scoped dashboard and module access
- Cheque-book requests, inventory ranges, issuance, verification, stop/cancel, and returns
- Maker-checker submission and authorisation flow
- Reports, user administration, and full audit trail

## Security posture

OWASP-aligned controls implemented in this prototype:

- **Static file allow-list** — only `index.html`, `app.js` and `styles.css` are served. Source files and `data/records.json` are never exposed (prevents sensitive-data and source disclosure).
- **Security response headers** on every response — a restrictive `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, and cross-origin isolation headers.
- **Request hardening** — JSON body size capped (32 KB) to resist resource-exhaustion, and a lightweight per-IP rate limit on `/api/*`.
- **Password authentication** — sign-in verifies a staff ID and password against a server-side user store; passwords are stored only as per-user salted **scrypt** hashes and checked with a constant-time comparison. The store is seeded on first run into `data/users.json` (git-ignored) and never served to the browser.
- **Server-side sessions** — a successful sign-in mints a random session id stored server-side and returned in an `HttpOnly`, `SameSite=Strict` cookie. Every API request derives the caller's role and branch **from the session, not from the request body**, so identity can no longer be spoofed per-request, and the `SameSite=Strict` cookie mitigates CSRF.
- **Maker–checker on vault acceptance** — moving cheque stock from the vault into inventory takes two officers: one reconciles the hard copies and submits, a **different** officer with approval rights authorises. The submitting officer is blocked from authorising their own batch (separation of duties), enforced server-side.
- **Server-side authorisation and data scoping** — every write validates required fields and enforces role/branch scope from the session, and `GET /api/state` (plus every write response) returns **only the branch's own data** for non-global roles. The UI never receives other branches' records.

## Demo accounts

Seeded on first run — all share the password `Akuapem@2026`:

| Staff ID | Role | Branch |
| --- | --- | --- |
| `admin@acb.com` | System Admin | All branches |
| `headoffice@acb.com` | Head-Office Users | All branches |
| `manager.koforidua@acb.com` | Branch Manager | Koforidua |
| `ops.nsawam@acb.com` | Branch Operations | Nsawam |
| `cs.nsawam@acb.com` | Customer Service | Nsawam |

To see the vault maker–checker flow: sign in as `ops.nsawam@acb.com`, reconcile and submit a Nsawam batch, then sign in as `headoffice@acb.com` (a different officer) to authorise it.

## Important

This is a functional demonstration application, not a production banking system. Passwords are real (salted scrypt hashes) but the demo ships with shared, published credentials and no MFA, account lockout, or password-rotation policy. Before production deployment, integrate with an enterprise IdP/MFA, and add a hardened database, encryption and key management, TLS/HSTS at the edge, monitoring, formal security testing, and integration with the bank’s core banking platform.
