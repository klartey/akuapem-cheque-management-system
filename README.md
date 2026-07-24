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

## Important

This is a functional demonstration application, not a production banking system. Before production deployment, implement enterprise identity/MFA, a hardened database, encryption and key management, server-side validation, monitoring, formal security testing, and integration with the bank’s core banking platform.
