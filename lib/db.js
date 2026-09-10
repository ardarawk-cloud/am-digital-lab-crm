const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, 'data');
fs.mkdirSync(DATA, { recursive: true });
const db = new DatabaseSync(path.join(DATA, 'amdl-crm.sqlite'));
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'OWNER',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY,user_id INTEGER NOT NULL,expires_at TEXT NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS leads (id INTEGER PRIMARY KEY AUTOINCREMENT,code TEXT UNIQUE,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,name TEXT NOT NULL,company TEXT DEFAULT '',phone TEXT DEFAULT '',email TEXT DEFAULT '',source TEXT DEFAULT 'Website',project_type TEXT DEFAULT 'Website',project_description TEXT DEFAULT '',budget_range TEXT DEFAULT '',target_launch TEXT DEFAULT '',status TEXT NOT NULL DEFAULT 'NEW',potential_value INTEGER NOT NULL DEFAULT 0,assigned_to TEXT DEFAULT '',last_contact TEXT DEFAULT '',next_followup TEXT DEFAULT '',notes TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS clients (id INTEGER PRIMARY KEY AUTOINCREMENT,code TEXT UNIQUE,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,name TEXT NOT NULL,company TEXT DEFAULT '',phone TEXT DEFAULT '',email TEXT DEFAULT '',source_lead_id INTEGER,notes TEXT DEFAULT '',FOREIGN KEY(source_lead_id) REFERENCES leads(id));
CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT,code TEXT UNIQUE,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,client_id INTEGER NOT NULL,name TEXT NOT NULL,project_type TEXT DEFAULT 'Website',value INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'QUEUED',health TEXT NOT NULL DEFAULT 'GREEN',progress INTEGER NOT NULL DEFAULT 0,deadline TEXT DEFAULT '',pm TEXT DEFAULT '',scope_summary TEXT DEFAULT '',scope_approved INTEGER NOT NULL DEFAULT 0,FOREIGN KEY(client_id) REFERENCES clients(id));
CREATE TABLE IF NOT EXISTS invoices (id INTEGER PRIMARY KEY AUTOINCREMENT,code TEXT UNIQUE,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,client_id INTEGER NOT NULL,project_id INTEGER,type TEXT NOT NULL DEFAULT 'DP',amount INTEGER NOT NULL DEFAULT 0,paid_amount INTEGER NOT NULL DEFAULT 0,issue_date TEXT DEFAULT '',due_date TEXT DEFAULT '',status TEXT NOT NULL DEFAULT 'DRAFT',notes TEXT DEFAULT '',FOREIGN KEY(client_id) REFERENCES clients(id),FOREIGN KEY(project_id) REFERENCES projects(id));
CREATE TABLE IF NOT EXISTS payments (id INTEGER PRIMARY KEY AUTOINCREMENT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,invoice_id INTEGER NOT NULL,amount INTEGER NOT NULL,payment_date TEXT DEFAULT '',method TEXT DEFAULT 'Bank Transfer',reference TEXT DEFAULT '',notes TEXT DEFAULT '',FOREIGN KEY(invoice_id) REFERENCES invoices(id));
CREATE TABLE IF NOT EXISTS project_scope (id INTEGER PRIMARY KEY AUTOINCREMENT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,project_id INTEGER NOT NULL,module TEXT DEFAULT 'Core',title TEXT NOT NULL,description TEXT DEFAULT '',priority TEXT NOT NULL DEFAULT 'MUST HAVE',status TEXT NOT NULL DEFAULT 'PLANNED',included_contract INTEGER NOT NULL DEFAULT 1,FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS quotations (id INTEGER PRIMARY KEY AUTOINCREMENT,code TEXT UNIQUE,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,client_id INTEGER NOT NULL,project_id INTEGER,issue_date TEXT DEFAULT '',expiry_date TEXT DEFAULT '',status TEXT NOT NULL DEFAULT 'DRAFT',subtotal INTEGER NOT NULL DEFAULT 0,notes TEXT DEFAULT '',FOREIGN KEY(client_id) REFERENCES clients(id),FOREIGN KEY(project_id) REFERENCES projects(id));
CREATE TABLE IF NOT EXISTS quotation_items (id INTEGER PRIMARY KEY AUTOINCREMENT,quotation_id INTEGER NOT NULL,description TEXT NOT NULL,qty REAL NOT NULL DEFAULT 1,unit_price INTEGER NOT NULL DEFAULT 0,amount INTEGER NOT NULL DEFAULT 0,FOREIGN KEY(quotation_id) REFERENCES quotations(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,project_id INTEGER NOT NULL,module TEXT DEFAULT 'Core',title TEXT NOT NULL,description TEXT DEFAULT '',assigned_to TEXT DEFAULT '',priority TEXT NOT NULL DEFAULT 'NORMAL',status TEXT NOT NULL DEFAULT 'TODO',due_date TEXT DEFAULT '',FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS change_requests (id INTEGER PRIMARY KEY AUTOINCREMENT,code TEXT UNIQUE,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,project_id INTEGER NOT NULL,requested_by TEXT DEFAULT 'Client',description TEXT NOT NULL,reason TEXT DEFAULT '',cost_impact INTEGER NOT NULL DEFAULT 0,timeline_impact_days INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'REQUESTED',invoice_id INTEGER,FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,FOREIGN KEY(invoice_id) REFERENCES invoices(id));
CREATE TABLE IF NOT EXISTS qc_items (id INTEGER PRIMARY KEY AUTOINCREMENT,code TEXT UNIQUE,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,project_id INTEGER NOT NULL,module TEXT DEFAULT 'Core',title TEXT NOT NULL,description TEXT DEFAULT '',severity TEXT NOT NULL DEFAULT 'MEDIUM',status TEXT NOT NULL DEFAULT 'NOT TESTED',assigned_to TEXT DEFAULT '',evidence TEXT DEFAULT '',FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS activity_logs (id INTEGER PRIMARY KEY AUTOINCREMENT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,user_id INTEGER,action TEXT NOT NULL,object_type TEXT DEFAULT '',object_id INTEGER,FOREIGN KEY(user_id) REFERENCES users(id));
`);

function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some(c => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}
ensureColumn('projects','scope_approved','INTEGER NOT NULL DEFAULT 0');
ensureColumn('change_requests','invoice_id','INTEGER');

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}
function verifyPassword(password, stored) {
  const [salt,hash] = stored.split(':');
  const a=crypto.scryptSync(password,salt,64), b=Buffer.from(hash,'hex');
  return a.length===b.length && crypto.timingSafeEqual(a,b);
}
if (!db.prepare('SELECT COUNT(*) c FROM users').get().c) {
  db.prepare('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)').run(
    'AM DIGITAL LAB Owner','admin@amdigital.local',hashPassword(process.env.AMDL_ADMIN_PASSWORD||'change-me-123'),'OWNER'
  );
}

const today=()=>new Date().toISOString().slice(0,10);
function nextCode(table,prefix){const y=new Date().getFullYear(),n=Number(db.prepare(`SELECT COUNT(*) c FROM ${table}`).get().c)+1;return `${prefix}-${y}-${String(n).padStart(3,'0')}`}
function log(user,action,type='',id=null){db.prepare('INSERT INTO activity_logs (user_id,action,object_type,object_id) VALUES (?,?,?,?)').run(user?.id||null,action,type,id)}
function activeProjectAllowed(id){return Number(db.prepare(`SELECT COALESCE(SUM(p.amount),0) paid FROM payments p JOIN invoices i ON i.id=p.invoice_id WHERE i.project_id=? AND i.type='DP'`).get(id).paid)>0}
function scopeReady(id){const p=db.prepare('SELECT scope_approved FROM projects WHERE id=?').get(id);const n=Number(db.prepare('SELECT COUNT(*) c FROM project_scope WHERE project_id=? AND included_contract=1').get(id).c);return p&&Number(p.scope_approved)===1&&n>0}
function hasBlockingQc(id){return Number(db.prepare(`SELECT COUNT(*) c FROM qc_items WHERE project_id=? AND severity='CRITICAL' AND status NOT IN ('PASS','LOCKED')`).get(id).c)>0}

module.exports={db,verifyPassword,today,nextCode,log,activeProjectAllowed,scopeReady,hasBlockingQc};
