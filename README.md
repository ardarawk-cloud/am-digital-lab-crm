# AM DIGITAL LAB CRM

Internal CRM and project-operations dashboard for **AM DIGITAL LAB**.

## Current version

**v0.3.0 — Cloudflare Native**

Production architecture:

```text
GitHub main
   ↓
Cloudflare Workers + Static Assets
   ↓
Cloudflare D1 (binding: DB)
```

The previous Node + local SQLite / Railway path is retired from `main`.

## Active modules

- Owner login + secure session
- Dashboard KPIs
- Lead pipeline and Lead → Client + Project conversion
- Clients
- Projects with DP activation gate
- Scope Builder + approval/lock
- Quotations with structured line items
- Tasks / Kanban
- Change Requests + CR invoice generation
- QC / Bugs + CRITICAL production blocker
- Invoices + payments + outstanding

## Business rules enforced

1. Project cannot leave `QUEUED` until a DP payment exists.
2. `DEVELOPMENT` and later stages require approved scope with at least one in-contract item.
3. Approved scope blocks requirement edits until explicitly unlocked.
4. `DEPLOYMENT` and `DELIVERED` are blocked while unresolved `CRITICAL` QC exists.
5. Change Request must be `APPROVED` before its additional invoice can be generated.
6. Creating a CR invoice increases project value once.
7. Payment cannot exceed invoice outstanding balance.

## Cloudflare configuration

Worker source is kept in ordered `worker-parts/*.part` files and assembled by `npm run build` before deploy.

`wrangler.jsonc` defines:

- Worker: `am-digital-lab-crm`
- Static assets: `./public`
- D1 binding: `DB`
- API-first routes: `/api/*`, `/healthz`

Wrangler 4.115 is used by the deploy workflow. D1 is declared by binding and may be provisioned/link automatically by current Wrangler resource provisioning.

## Required secret

Set the Worker secret:

```text
AMDL_ADMIN_PASSWORD
```

Admin email defaults to:

```text
admin@amdigital.local
```

No production password is committed to this repository.

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars
# edit .dev.vars with your local password
npm run dev
```

## Health

```text
GET /healthz
```

Expected version marker: `0.3.0-cloudflare`.
