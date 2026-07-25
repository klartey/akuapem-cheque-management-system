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
- **Server-side sessions** — signing in mints a random session id stored server-side and returned in an `HttpOnly`, `SameSite=Strict` cookie. Every API request derives the caller's role and branch **from the session, not from the request body**, so identity can no longer be spoofed per-request, and the `SameSite=Strict` cookie mitigates CSRF.
- **Server-side authorisation and data scoping** — every write validates required fields and enforces role/branch scope from the session, and `GET /api/state` (plus every write response) returns **only the branch's own data** for non-global roles. The UI never receives other branches' records.

## Important

This is a functional demonstration application, not a production banking system. The remaining gap is **credential verification**: the login screen still lets a user *select* their role/branch without proving identity (there is no user store, password, or MFA), so the authoritative server-side session is only as trustworthy as that unverified sign-in. Because identity is now derived server-side, replacing the sign-in step with real credential/MFA verification (against an enterprise IdP) is a localised change — the authorisation and scoping enforcement is already in place. Before production deployment, also add a hardened database, encryption and key management, TLS/HSTS at the edge, monitoring, formal security testing, and integration with the bank’s core banking platform.
