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
- **Server-side validation and authorisation checks** — every write validates required fields and enforces role/branch scope server-side.

## Important

This is a functional demonstration application, not a production banking system. The most significant remaining gap is **authentication**: the login screen is unauthenticated and the caller's role/branch are asserted by the client, so the server-side authorisation checks are only as trustworthy as that self-asserted identity, and `GET /api/state` returns all branches' demo data (the UI filters client-side). Before production deployment, implement enterprise identity/MFA with server-side sessions or signed tokens (so identity is authoritative), server-side scoping of every read, a hardened database, encryption and key management, TLS/HSTS at the edge, monitoring, formal security testing, and integration with the bank’s core banking platform.
