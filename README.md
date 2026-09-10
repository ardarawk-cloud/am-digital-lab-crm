# AM DIGITAL LAB CRM

Internal CRM and project-operations dashboard for **AM DIGITAL LAB**.

## Current version

**v0.2.0 — Operations Core**

### v0.1 foundation
- Owner login/session
- Dashboard KPIs
- Lead pipeline
- Lead → client/project conversion
- Client database
- Project tracking
- Invoice and payment recording
- DP activation lock
- SQLite persistence

### v0.2 modules
- Structured Project Scope Builder
- Scope approval / lock control
- Quotation builder with line items
- Task Kanban
- Change Request workflow
- Approved CR → additional invoice
- QC / bug tracking
- Critical QC production blocker
- Expanded owner attention metrics
- Modular backend routes and frontend pages

## Business rules enforced

1. Project cannot leave `QUEUED` until a DP payment exists.
2. `DEVELOPMENT` and later stages require approved scope with at least one in-contract item.
3. Approved scope blocks requirement edits until explicitly unlocked.
4. `DEPLOYMENT` and `DELIVERED` are blocked while unresolved `CRITICAL` QC exists.
5. Change Request must be `APPROVED` before an additional invoice can be generated.
6. Creating a CR invoice increases project value once.
7. Payment cannot exceed invoice outstanding balance.

## Architecture

```text
server.js
lib/
  db.js
  http.js
  routes-dashboard.js
  routes-sales.js
  routes-projects.js
  routes-commercial.js
  routes-operations.js
public/
  index.html
  styles.css
  core.js
  pages-core.js
  pages-ops.js
  modals.js
```

## Run locally

Requires Node.js 22+.

```bash
npm run check
npm start
```

Open `http://localhost:8787`.

Pilot login:
- Email: `admin@amdigital.local`
- Password: `change-me-123`

Set `AMDL_ADMIN_PASSWORD` before first run outside the pilot environment.

## Storage

SQLite is created automatically at `data/amdl-crm.sqlite`. The `data/` directory is gitignored and must not contain committed live client data.

## Next phase

v0.3: document/PDF generation, follow-up reminders, maintenance and recurring revenue, stronger role/permission controls, production deployment hardening, and client portal foundation.
