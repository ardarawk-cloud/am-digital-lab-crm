# AM DIGITAL LAB — CRM & Internal Dashboard MVP

MVP operasional tanpa dependency eksternal. Dibangun dengan Node.js 22 built-in HTTP server + `node:sqlite` + HTML/CSS/JS.

## Yang sudah bekerja

- Authentication + session cookie
- Owner dashboard KPI
- Sales / leads pipeline
- Lead status update
- Convert WON lead → Client + Project
- Client database
- Project database + progress/health
- Invoice management
- Payment recording
- Outstanding calculation
- Activity log backend
- Rule: project tidak dapat diaktifkan keluar dari `QUEUED` sebelum pembayaran DP tercatat
- Responsive UI desktop/mobile
- SQLite persistent database

## Jalankan

Pastikan Node.js 22+.

```bash
cd am-digital-lab-crm
npm start
```

Buka:

`http://localhost:8787`

### Login awal

Email: `admin@amdigital.local`

Password: `change-me-123`

Sebelum production, set password admin lewat environment variable saat database pertama dibuat:

```bash
AMDL_ADMIN_PASSWORD="password-yang-kuat" npm start
```

Jika database demo sudah pernah dibuat, hapus `data/amdl-crm.sqlite` untuk seed ulang. Untuk production, jangan menggunakan cara reset ini; implementasikan change-password flow.

## Struktur

- `server.js` — API, auth, SQLite schema, business rules
- `public/index.html` — application shell
- `public/styles.css` — AM DIGITAL LAB SaaS UI
- `public/app.js` — frontend SPA
- `data/` — SQLite database saat aplikasi berjalan

## Tahap berikutnya

1. Quotation + Scope of Work builder
2. PDF export
3. Tasks / project kanban
4. Change Request
5. QC / bugs
6. Maintenance + hosting recurring revenue
7. Notifications + follow-up
8. Client portal
9. WhatsApp / email integration
10. Production deployment with HTTPS, backups, secrets, and managed database

## Catatan production

MVP ini cocok untuk development/pilot internal. Sebelum dipakai untuk data client nyata di internet, tambahkan CSRF protection, stronger session lifecycle, password-change/recovery, rate limiting, production reverse proxy/HTTPS, secret management, automated backups, and database migration strategy.
